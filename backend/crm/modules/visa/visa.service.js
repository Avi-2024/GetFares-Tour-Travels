import { AppError } from "../../core/errors/index.js";

const VISA_STATUS = Object.freeze({
  DOCUMENT_PENDING: "DOCUMENT_PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
});

const VISA_WORKFLOW_STAGE = Object.freeze({
  DOCUMENT_COLLECTION: "DOCUMENT_COLLECTION",
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  BIOMETRICS_SCHEDULED: "BIOMETRICS_SCHEDULED",
  UNDER_PROCESS: "UNDER_PROCESS",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DELIVERED: "DELIVERED",
});

const STAGE_TO_STATUS = Object.freeze({
  [VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION]: VISA_STATUS.DOCUMENT_PENDING,
  [VISA_WORKFLOW_STAGE.APPLICATION_SUBMITTED]: VISA_STATUS.SUBMITTED,
  [VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED]: VISA_STATUS.SUBMITTED,
  [VISA_WORKFLOW_STAGE.UNDER_PROCESS]: VISA_STATUS.SUBMITTED,
  [VISA_WORKFLOW_STAGE.APPROVED]: VISA_STATUS.APPROVED,
  [VISA_WORKFLOW_STAGE.REJECTED]: VISA_STATUS.REJECTED,
  [VISA_WORKFLOW_STAGE.DELIVERED]: VISA_STATUS.APPROVED,
});

const DEFAULT_STAGE_BY_STATUS = Object.freeze({
  [VISA_STATUS.DOCUMENT_PENDING]: VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION,
  [VISA_STATUS.SUBMITTED]: VISA_WORKFLOW_STAGE.APPLICATION_SUBMITTED,
  [VISA_STATUS.APPROVED]: VISA_WORKFLOW_STAGE.APPROVED,
  [VISA_STATUS.REJECTED]: VISA_WORKFLOW_STAGE.REJECTED,
});

const STAGE_TRANSITIONS = Object.freeze({
  [VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION]: new Set([
    VISA_WORKFLOW_STAGE.APPLICATION_SUBMITTED,
    VISA_WORKFLOW_STAGE.REJECTED,
  ]),
  [VISA_WORKFLOW_STAGE.APPLICATION_SUBMITTED]: new Set([
    VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED,
    VISA_WORKFLOW_STAGE.UNDER_PROCESS,
    VISA_WORKFLOW_STAGE.APPROVED,
    VISA_WORKFLOW_STAGE.REJECTED,
  ]),
  [VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED]: new Set([
    VISA_WORKFLOW_STAGE.UNDER_PROCESS,
    VISA_WORKFLOW_STAGE.APPROVED,
    VISA_WORKFLOW_STAGE.REJECTED,
  ]),
  [VISA_WORKFLOW_STAGE.UNDER_PROCESS]: new Set([
    VISA_WORKFLOW_STAGE.APPROVED,
    VISA_WORKFLOW_STAGE.REJECTED,
  ]),
  [VISA_WORKFLOW_STAGE.APPROVED]: new Set([VISA_WORKFLOW_STAGE.DELIVERED]),
  [VISA_WORKFLOW_STAGE.REJECTED]: new Set([]),
  [VISA_WORKFLOW_STAGE.DELIVERED]: new Set([]),
});

const CHECKLIST_DOC_MAP = Object.freeze({
  PASSPORT: "passport_verified",
  VISA: "visa_verified",
  INSURANCE: "insurance_verified",
  TICKET: "ticket_verified",
  HOTEL: "hotel_verified",
  TRANSFER: "transfer_verified",
  TOUR: "tour_verified",
  ITINERARY: "final_itinerary_uploaded",
});

function createVisaService({ repository, bookingsRepository, leadsRepository, logger, events }) {
  function normalizeWorkflowStage(value, fallback = null) {
    const normalized = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

    if (!normalized) {
      return fallback;
    }

    if (VISA_WORKFLOW_STAGE[normalized]) {
      return VISA_WORKFLOW_STAGE[normalized];
    }

    if (DEFAULT_STAGE_BY_STATUS[normalized]) {
      return DEFAULT_STAGE_BY_STATUS[normalized];
    }

    return fallback;
  }

  function deriveStatusFromStage(stage) {
    return STAGE_TO_STATUS[stage] || VISA_STATUS.DOCUMENT_PENDING;
  }

  function toDateString(value, fallback = null) {
    if (!value) {
      return fallback;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return date.toISOString().slice(0, 10);
  }

  function normalizeDocumentType(value) {
    if (!value) {
      return "";
    }

    return String(value).trim().toUpperCase();
  }

  function toChecklistPatch(payload = {}) {
    const patch = {};

    if (payload.passportVerified !== undefined) {
      patch.passport_verified = payload.passportVerified;
    }
    if (payload.visaVerified !== undefined) {
      patch.visa_verified = payload.visaVerified;
    }
    if (payload.insuranceVerified !== undefined) {
      patch.insurance_verified = payload.insuranceVerified;
    }
    if (payload.ticketVerified !== undefined) {
      patch.ticket_verified = payload.ticketVerified;
    }
    if (payload.hotelVerified !== undefined) {
      patch.hotel_verified = payload.hotelVerified;
    }
    if (payload.transferVerified !== undefined) {
      patch.transfer_verified = payload.transferVerified;
    }
    if (payload.tourVerified !== undefined) {
      patch.tour_verified = payload.tourVerified;
    }
    if (payload.finalItineraryUploaded !== undefined) {
      patch.final_itinerary_uploaded = payload.finalItineraryUploaded;
    }
    if (payload.travelReady !== undefined) {
      patch.travel_ready = payload.travelReady;
    }

    return patch;
  }

  function computeTravelReady(checklist) {
    if (!checklist) {
      return false;
    }

    return Boolean(
      checklist.passportVerified &&
      checklist.visaVerified &&
      checklist.insuranceVerified &&
      checklist.ticketVerified &&
      checklist.hotelVerified &&
      checklist.transferVerified &&
      checklist.tourVerified &&
      checklist.finalItineraryUploaded,
    );
  }

  function calculateDaysToExpiry(visaValidUntil) {
    if (!visaValidUntil) {
      return null;
    }

    const target = new Date(visaValidUntil);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function resolveExpiryStatus(daysToExpiry) {
    if (daysToExpiry === null) {
      return "NOT_SET";
    }
    if (daysToExpiry < 0) {
      return "EXPIRED";
    }
    if (daysToExpiry <= 14) {
      return "EXPIRING_SOON";
    }
    return "ACTIVE";
  }

  function enrichVisaCase(visaCase) {
    if (!visaCase) {
      return null;
    }

    const workflowStage = normalizeWorkflowStage(
      visaCase.workflowStage || visaCase.status,
      VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION,
    );
    const daysToExpiry = calculateDaysToExpiry(visaCase.visaValidUntil);

    return {
      ...visaCase,
      workflowStage,
      status: deriveStatusFromStage(workflowStage),
      daysToExpiry,
      expiryStatus: resolveExpiryStatus(daysToExpiry),
      isDelivered: workflowStage === VISA_WORKFLOW_STAGE.DELIVERED,
    };
  }

  function validateStageRequirements(targetStage, payload = {}, current = null) {
    const appointmentDate =
      payload.appointmentDate ?? payload.appointment_date ?? current?.appointmentDate;
    const visaValidUntil =
      payload.visaValidUntil ?? payload.visa_valid_until ?? current?.visaValidUntil;
    const rejectionReason =
      payload.rejectionReason ?? payload.rejection_reason ?? current?.rejectionReason;

    if (
      targetStage === VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED &&
      !appointmentDate
    ) {
      throw new AppError(
        400,
        "appointmentDate is required for BIOMETRICS_SCHEDULED stage",
        "VISA_APPOINTMENT_DATE_REQUIRED",
      );
    }

    if (
      (targetStage === VISA_WORKFLOW_STAGE.APPROVED ||
        targetStage === VISA_WORKFLOW_STAGE.DELIVERED) &&
      !visaValidUntil
    ) {
      throw new AppError(
        400,
        "visaValidUntil is required for APPROVED or DELIVERED stage",
        "VISA_VALID_UNTIL_REQUIRED",
      );
    }

    if (
      targetStage === VISA_WORKFLOW_STAGE.REJECTED &&
      !String(rejectionReason || "").trim()
    ) {
      throw new AppError(
        400,
        "rejectionReason is required for REJECTED stage",
        "VISA_REJECTION_REASON_REQUIRED",
      );
    }
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "visa", requestId: context.requestId, id },
      "Getting visa case by id",
    );
    const visaCase = await repository.findById(id);
    if (!visaCase) {
      throw new AppError(404, "Visa case not found", "VISA_NOT_FOUND");
    }
    return enrichVisaCase(visaCase);
  }

  async function ensureBookingExists(bookingId) {
    if (!bookingId) {
      return null;
    }

    const booking = await repository.findBookingById(bookingId);
    if (!booking) {
      throw new AppError(404, "Booking not found", "VISA_BOOKING_NOT_FOUND");
    }
    return booking;
  }

  async function ensureSupplierExists(supplierId) {
    if (!supplierId) {
      return null;
    }

    const supplier = await repository.findSupplierById(supplierId);
    if (!supplier) {
      throw new AppError(404, "Supplier not found", "VISA_SUPPLIER_NOT_FOUND");
    }

    return supplier;
  }

  async function list(filters = {}, context = {}) {
    logger.debug(
      { module: "visa", requestId: context.requestId, filters },
      "Listing visa cases",
    );
    const rows = await repository.findAll(filters);
    return rows.map((item) => enrichVisaCase(item));
  }

  async function create(payload, context = {}) {
    await ensureBookingExists(payload.bookingId);
    await ensureSupplierExists(payload.supplierId);

    const workflowStage = normalizeWorkflowStage(
      payload.workflowStage || payload.status,
      VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION,
    );
    validateStageRequirements(workflowStage, payload);
    const status = deriveStatusFromStage(workflowStage);

    const created = await repository.create({
      booking_id: payload.bookingId || null,
      supplier_id: payload.supplierId || null,
      country: payload.country,
      visa_type: payload.visaType,
      visa_number: payload.visaNumber || null,
      fees: payload.fees ?? null,
      appointment_date: toDateString(payload.appointmentDate),
      submission_date: toDateString(
        payload.submissionDate,
        status === VISA_STATUS.SUBMITTED ? new Date().toISOString().slice(0, 10) : null,
      ),
      status,
      workflow_stage: workflowStage,
      rejection_reason: payload.rejectionReason || null,
      visa_valid_until: toDateString(payload.visaValidUntil),
      delivered_at:
        workflowStage === VISA_WORKFLOW_STAGE.DELIVERED
          ? toDateString(payload.deliveredAt, new Date().toISOString().slice(0, 10))
          : null,
      updated_at: new Date().toISOString(),
    });

    const enriched = enrichVisaCase(created);
    events.emitCreated(enriched);
    return enriched;
  }

  async function update(id, payload, context = {}) {
    const current = await getById(id, context);
    if (payload.bookingId) {
      await ensureBookingExists(payload.bookingId);
    }
    if (payload.supplierId) {
      await ensureSupplierExists(payload.supplierId);
    }

    const workflowStage = normalizeWorkflowStage(
      payload.workflowStage || payload.status,
      current.workflowStage,
    );
    validateStageRequirements(workflowStage, payload, current);

    const updated = await repository.update(id, {
      booking_id: payload.bookingId,
      supplier_id: payload.supplierId,
      country: payload.country,
      visa_type: payload.visaType,
      visa_number: payload.visaNumber,
      fees: payload.fees,
      appointment_date: payload.appointmentDate
        ? toDateString(payload.appointmentDate)
        : undefined,
      submission_date: payload.submissionDate
        ? toDateString(payload.submissionDate)
        : undefined,
      status: workflowStage ? deriveStatusFromStage(workflowStage) : undefined,
      workflow_stage: workflowStage || undefined,
      rejection_reason:
        payload.rejectionReason ??
        (workflowStage === VISA_WORKFLOW_STAGE.REJECTED
          ? current.rejectionReason ?? null
          : undefined),
      visa_valid_until: payload.visaValidUntil
        ? toDateString(payload.visaValidUntil)
        : undefined,
      delivered_at: payload.deliveredAt
        ? toDateString(payload.deliveredAt)
        : workflowStage === VISA_WORKFLOW_STAGE.DELIVERED
          ? toDateString(current.deliveredAt, new Date().toISOString().slice(0, 10))
          : workflowStage &&
              workflowStage !== VISA_WORKFLOW_STAGE.DELIVERED &&
              current.deliveredAt
            ? null
            : undefined,
      updated_at: new Date().toISOString(),
    });

    const enriched = enrichVisaCase(updated);
    events.emitUpdated(enriched);
    return enriched;
  }

  async function transitionStatus(id, payload, context = {}) {
    const current = await getById(id, context);
    const currentStage = normalizeWorkflowStage(
      current.workflowStage || current.status,
      VISA_WORKFLOW_STAGE.DOCUMENT_COLLECTION,
    );
    const targetStage = normalizeWorkflowStage(
      payload.workflowStage || payload.status,
      currentStage,
    );

    if (
      currentStage !== targetStage &&
      !STAGE_TRANSITIONS[currentStage]?.has(targetStage)
    ) {
      throw new AppError(
        409,
        `Invalid visa workflow transition: ${currentStage} -> ${targetStage}`,
        "VISA_INVALID_STATUS_TRANSITION",
      );
    }

    validateStageRequirements(targetStage, payload, current);

    const patch = {
      status: deriveStatusFromStage(targetStage),
      workflow_stage: targetStage,
      updated_at: new Date().toISOString(),
    };

    if (
      targetStage === VISA_WORKFLOW_STAGE.APPLICATION_SUBMITTED ||
      targetStage === VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED ||
      targetStage === VISA_WORKFLOW_STAGE.UNDER_PROCESS
    ) {
      patch.submission_date = toDateString(
        payload.submissionDate,
        current.submissionDate || new Date().toISOString().slice(0, 10),
      );
      patch.rejection_reason = null;
    }

    if (targetStage === VISA_WORKFLOW_STAGE.BIOMETRICS_SCHEDULED) {
      patch.appointment_date = toDateString(
        payload.appointmentDate,
        current.appointmentDate,
      );
    }

    if (
      targetStage === VISA_WORKFLOW_STAGE.APPROVED ||
      targetStage === VISA_WORKFLOW_STAGE.DELIVERED
    ) {
      patch.visa_valid_until = toDateString(
        payload.visaValidUntil,
        current.visaValidUntil,
      );
      patch.visa_number = payload.visaNumber || current.visaNumber || null;
      patch.rejection_reason = null;
      patch.delivered_at =
        targetStage === VISA_WORKFLOW_STAGE.DELIVERED
          ? toDateString(
              payload.deliveredAt,
              current.deliveredAt || new Date().toISOString().slice(0, 10),
            )
          : null;
    }

    if (targetStage === VISA_WORKFLOW_STAGE.REJECTED) {
      patch.rejection_reason = payload.rejectionReason || current.rejectionReason || null;
      patch.visa_valid_until = null;
      patch.delivered_at = null;
    }

    if (
      targetStage !== VISA_WORKFLOW_STAGE.APPROVED &&
      targetStage !== VISA_WORKFLOW_STAGE.DELIVERED &&
      targetStage !== VISA_WORKFLOW_STAGE.REJECTED
    ) {
      patch.delivered_at = null;
    }

    const updated = await repository.update(id, patch);
    const enriched = enrichVisaCase(updated);
    events.emitStatusChanged({
      id: enriched.id,
      oldStatus: current.workflowStage || current.status,
      status: enriched.workflowStage,
      note: payload.note || null,
    });
    events.emitUpdated(enriched);
    return enriched;
  }

  async function createDocument(visaCaseId, payload, context = {}) {
    const visaCase = await getById(visaCaseId, context);

    const created = await repository.createDocument({
      visaCaseId: visaCase.id,
      documentType: payload.documentType,
      fileUrl: payload.fileUrl,
      isVerified: payload.isVerified ?? false,
      uploadedAt: new Date().toISOString(),
    });

    if (created.isVerified && visaCase.bookingId) {
      const docKey =
        CHECKLIST_DOC_MAP[normalizeDocumentType(created.documentType)];
      if (docKey) {
        await repository.upsertChecklist(visaCase.bookingId, {
          [docKey]: true,
          verified_by: context.user?.id || null,
          verified_at: new Date().toISOString(),
        });
      }
    }

    events.emitDocumentAdded(created);
    return created;
  }

  async function listDocuments(visaCaseId, filters = {}, context = {}) {
    await getById(visaCaseId, context);
    return repository.listDocuments(visaCaseId, filters);
  }

  async function verifyDocument(documentId, payload, context = {}) {
    const document = await repository.findDocumentById(documentId);
    if (!document) {
      throw new AppError(
        404,
        "Visa document not found",
        "VISA_DOCUMENT_NOT_FOUND",
      );
    }

    const updated = await repository.updateDocument(documentId, {
      is_verified: payload.isVerified,
      verified_at: payload.isVerified ? new Date().toISOString() : null,
    });

    const visaCase = await getById(updated.visaCaseId, context);
    if (visaCase.bookingId) {
      const docKey =
        CHECKLIST_DOC_MAP[normalizeDocumentType(updated.documentType)];
      if (docKey) {
        await repository.upsertChecklist(visaCase.bookingId, {
          [docKey]: payload.isVerified,
          verified_by: context.user?.id || null,
          verified_at: new Date().toISOString(),
        });
      }
    }

    events.emitDocumentVerified(updated);
    return updated;
  }

  async function getChecklist(visaCaseId, context = {}) {
    const visaCase = await getById(visaCaseId, context);
    if (!visaCase.bookingId) {
      throw new AppError(
        409,
        "Checklist requires visa case linked to booking",
        "VISA_CHECKLIST_BOOKING_REQUIRED",
      );
    }

    const checklist = await repository.getChecklistByBookingId(
      visaCase.bookingId,
    );
    if (!checklist) {
      return {
        bookingId: visaCase.bookingId,
        passportVerified: false,
        visaVerified: false,
        insuranceVerified: false,
        ticketVerified: false,
        hotelVerified: false,
        transferVerified: false,
        tourVerified: false,
        finalItineraryUploaded: false,
        travelReady: false,
        verifiedBy: null,
        verifiedAt: null,
        completedAt: null,
      };
    }

    return checklist;
  }

  async function updateChecklist(visaCaseId, payload, context = {}) {
    const visaCase = await getById(visaCaseId, context);
    if (!visaCase.bookingId) {
      throw new AppError(
        409,
        "Checklist requires visa case linked to booking",
        "VISA_CHECKLIST_BOOKING_REQUIRED",
      );
    }

    const current = await repository.getChecklistByBookingId(
      visaCase.bookingId,
    );
    const patch = toChecklistPatch(payload);

    const merged = {
      passportVerified:
        payload.passportVerified ?? current?.passportVerified ?? false,
      visaVerified: payload.visaVerified ?? current?.visaVerified ?? false,
      insuranceVerified:
        payload.insuranceVerified ?? current?.insuranceVerified ?? false,
      ticketVerified:
        payload.ticketVerified ?? current?.ticketVerified ?? false,
      hotelVerified: payload.hotelVerified ?? current?.hotelVerified ?? false,
      transferVerified:
        payload.transferVerified ?? current?.transferVerified ?? false,
      tourVerified: payload.tourVerified ?? current?.tourVerified ?? false,
      finalItineraryUploaded:
        payload.finalItineraryUploaded ??
        current?.finalItineraryUploaded ??
        false,
    };

    const derivedTravelReady = computeTravelReady(merged);
    patch.travel_ready = payload.travelReady ?? derivedTravelReady;
    patch.verified_by = context.user?.id || null;
    patch.verified_at = new Date().toISOString();
    patch.completed_at = patch.travel_ready ? new Date().toISOString() : null;

    const updated = await repository.upsertChecklist(visaCase.bookingId, patch);
    events.emitChecklistUpdated(updated);
    return updated;
  }

  async function getSummaryReport(filters = {}, context = {}) {
    logger.debug(
      { module: "visa", requestId: context.requestId, filters },
      "Visa summary report",
    );
    return repository.getSummaryReport(filters);
  }

  return Object.freeze({
    VISA_STATUS,
    VISA_WORKFLOW_STAGE,
    list,
    getById,
    create,
    update,
    transitionStatus,
    createDocument,
    listDocuments,
    verifyDocument,
    getChecklist,
    updateChecklist,
    getSummaryReport,
  });
}

export { createVisaService, VISA_STATUS };
