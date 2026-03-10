const { AppError } = require('../../core/errors');

const VISA_STATUS = Object.freeze({
  DOCUMENT_PENDING: 'DOCUMENT_PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const STATUS_TRANSITIONS = Object.freeze({
  DOCUMENT_PENDING: new Set(['SUBMITTED', 'REJECTED']),
  SUBMITTED: new Set(['APPROVED', 'REJECTED']),
  APPROVED: new Set([]),
  REJECTED: new Set([]),
});

const CHECKLIST_DOC_MAP = Object.freeze({
  PASSPORT: 'passport_verified',
  VISA: 'visa_verified',
  INSURANCE: 'insurance_verified',
  TICKET: 'ticket_verified',
  HOTEL: 'hotel_verified',
  TRANSFER: 'transfer_verified',
  TOUR: 'tour_verified',
  ITINERARY: 'final_itinerary_uploaded',
});

function createVisaService({ repository, logger, events }) {
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
      return '';
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

  async function getById(id, context = {}) {
    logger.debug({ module: 'visa', requestId: context.requestId, id }, 'Getting visa case by id');
    const visaCase = await repository.findById(id);
    if (!visaCase) {
      throw new AppError(404, 'Visa case not found', 'VISA_NOT_FOUND');
    }
    return visaCase;
  }

  async function ensureBookingExists(bookingId) {
    if (!bookingId) {
      return null;
    }

    const booking = await repository.findBookingById(bookingId);
    if (!booking) {
      throw new AppError(404, 'Booking not found', 'VISA_BOOKING_NOT_FOUND');
    }
    return booking;
  }

  async function list(filters = {}, context = {}) {
    logger.debug({ module: 'visa', requestId: context.requestId, filters }, 'Listing visa cases');
    return repository.findAll(filters);
  }

  async function create(payload, context = {}) {
    await ensureBookingExists(payload.bookingId);

    const created = await repository.create({
      booking_id: payload.bookingId || null,
      supplier_id: payload.supplierId || null,
      country: payload.country,
      visa_type: payload.visaType,
      visa_number: payload.visaNumber || null,
      fees: payload.fees ?? null,
      appointment_date: toDateString(payload.appointmentDate),
      submission_date: toDateString(payload.submissionDate),
      status: payload.status || VISA_STATUS.DOCUMENT_PENDING,
      rejection_reason: payload.rejectionReason || null,
      visa_valid_until: toDateString(payload.visaValidUntil),
      updated_at: new Date().toISOString(),
    });

    events.emitCreated(created);
    return created;
  }

  async function update(id, payload, context = {}) {
    await getById(id, context);
    if (payload.bookingId) {
      await ensureBookingExists(payload.bookingId);
    }

    const updated = await repository.update(id, {
      booking_id: payload.bookingId,
      supplier_id: payload.supplierId,
      country: payload.country,
      visa_type: payload.visaType,
      visa_number: payload.visaNumber,
      fees: payload.fees,
      appointment_date: payload.appointmentDate ? toDateString(payload.appointmentDate) : undefined,
      submission_date: payload.submissionDate ? toDateString(payload.submissionDate) : undefined,
      rejection_reason: payload.rejectionReason,
      visa_valid_until: payload.visaValidUntil ? toDateString(payload.visaValidUntil) : undefined,
      updated_at: new Date().toISOString(),
    });

    events.emitUpdated(updated);
    return updated;
  }

  async function transitionStatus(id, payload, context = {}) {
    const current = await getById(id, context);
    const targetStatus = payload.status;

    if (!STATUS_TRANSITIONS[current.status]?.has(targetStatus)) {
      throw new AppError(
        409,
        `Invalid visa status transition: ${current.status} -> ${targetStatus}`,
        'VISA_INVALID_STATUS_TRANSITION',
      );
    }

    const patch = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (targetStatus === VISA_STATUS.SUBMITTED) {
      patch.submission_date = toDateString(payload.submissionDate, current.submissionDate || new Date().toISOString().slice(0, 10));
      patch.rejection_reason = null;
    }

    if (targetStatus === VISA_STATUS.APPROVED) {
      if (!payload.visaValidUntil && !current.visaValidUntil) {
        throw new AppError(400, 'visaValidUntil is required for APPROVED status', 'VISA_VALID_UNTIL_REQUIRED');
      }

      patch.visa_valid_until = toDateString(payload.visaValidUntil, current.visaValidUntil);
      patch.visa_number = payload.visaNumber || current.visaNumber || null;
      patch.rejection_reason = null;
    }

    if (targetStatus === VISA_STATUS.REJECTED) {
      if (!payload.rejectionReason) {
        throw new AppError(400, 'rejectionReason is required for REJECTED status', 'VISA_REJECTION_REASON_REQUIRED');
      }
      patch.rejection_reason = payload.rejectionReason;
      patch.visa_valid_until = null;
    }

    const updated = await repository.update(id, patch);
    events.emitStatusChanged({
      id: updated.id,
      oldStatus: current.status,
      status: updated.status,
      note: payload.note || null,
    });
    events.emitUpdated(updated);
    return updated;
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
      const docKey = CHECKLIST_DOC_MAP[normalizeDocumentType(created.documentType)];
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
      throw new AppError(404, 'Visa document not found', 'VISA_DOCUMENT_NOT_FOUND');
    }

    const updated = await repository.updateDocument(documentId, {
      is_verified: payload.isVerified,
      verified_at: payload.isVerified ? new Date().toISOString() : null,
    });

    const visaCase = await getById(updated.visaCaseId, context);
    if (visaCase.bookingId) {
      const docKey = CHECKLIST_DOC_MAP[normalizeDocumentType(updated.documentType)];
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
      throw new AppError(409, 'Checklist requires visa case linked to booking', 'VISA_CHECKLIST_BOOKING_REQUIRED');
    }

    const checklist = await repository.getChecklistByBookingId(visaCase.bookingId);
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
      throw new AppError(409, 'Checklist requires visa case linked to booking', 'VISA_CHECKLIST_BOOKING_REQUIRED');
    }

    const current = await repository.getChecklistByBookingId(visaCase.bookingId);
    const patch = toChecklistPatch(payload);

    const merged = {
      passportVerified: payload.passportVerified ?? current?.passportVerified ?? false,
      visaVerified: payload.visaVerified ?? current?.visaVerified ?? false,
      insuranceVerified: payload.insuranceVerified ?? current?.insuranceVerified ?? false,
      ticketVerified: payload.ticketVerified ?? current?.ticketVerified ?? false,
      hotelVerified: payload.hotelVerified ?? current?.hotelVerified ?? false,
      transferVerified: payload.transferVerified ?? current?.transferVerified ?? false,
      tourVerified: payload.tourVerified ?? current?.tourVerified ?? false,
      finalItineraryUploaded: payload.finalItineraryUploaded ?? current?.finalItineraryUploaded ?? false,
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
    logger.debug({ module: 'visa', requestId: context.requestId, filters }, 'Visa summary report');
    return repository.getSummaryReport(filters);
  }

  return Object.freeze({
    VISA_STATUS,
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

module.exports = { createVisaService, VISA_STATUS };
