import { AppError } from "../../core/errors/index.js";

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    status: filters.status,
    assigned_to: filters.assignedTo,
    booking_id: filters.bookingId,
  };
}

function mapCreatePayload(payload) {
  return {
    booking_id: payload.bookingId,
    assigned_to: payload.assignedTo,
    issue_type: payload.issueType,
    description: payload.description,
    status: payload.status,
  };
}

function mapUpdatePayload(payload) {
  return {
    assigned_to: payload.assignedTo,
    issue_type: payload.issueType,
    description: payload.description,
    status: payload.status,
  };
}

function toComplaint(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    bookingId: entity.booking_id,
    assignedTo: entity.assigned_to,
    issueType: entity.issue_type,
    description: entity.description,
    status: entity.status,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at ?? entity.updatedAt ?? entity.created_at,
  };
}

function toComplaintActivity(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    complaintId: entity.complaint_id,
    userId: entity.user_id,
    note: entity.note,
    createdAt: entity.created_at,
  };
}

function buildSystemNote(prefix, details) {
  const text = String(details || "").trim();
  if (!text) return prefix;
  return `${prefix}\n${text}`.slice(0, 2000);
}

function createComplaintsService({ repository, logger, events }) {
  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      {
        module: "complaints",
        requestId: context.requestId,
        filters: mappedFilters,
      },
      "Listing records",
    );
    const rows = await repository.findAll(mappedFilters);
    return rows.map(toComplaint);
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "complaints", requestId: context.requestId, id },
      "Getting record by id",
    );
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, "Complaints not found", "COMPLAINTS_NOT_FOUND");
    }

    return toComplaint(item);
  }

  async function create(payload) {
    const created = await repository.create(mapCreatePayload(payload));
    events.emitCreated(created);
    return toComplaint(created);
  }

  async function update(id, payload, context = {}) {
    await getById(id, context);

    const updated = await repository.update(id, mapUpdatePayload(payload));
    events.emitUpdated(updated);
    return toComplaint(updated);
  }

  async function listActivities(id, filters = {}, context = {}) {
    await getById(id, context);
    const rows = await repository.findActivities(id, {
      page: filters.page,
      limit: filters.limit,
    });
    return rows.map(toComplaintActivity);
  }

  async function createActivity(id, payload, context = {}) {
    await getById(id, context);

    const created = await repository.createActivity({
      complaint_id: id,
      user_id: payload.userId || context.user?.id || null,
      note: payload.note,
    });

    if (events.emitActivityAdded) {
      events.emitActivityAdded(created);
    } else {
      events.emitUpdated({ id });
    }

    return toComplaintActivity(created);
  }

  async function changeStatus(id, payload, context = {}) {
    const existing = await getById(id, context);
    const nextStatus = payload.status;
    const reason = payload.reason || null;

    const updated = await repository.update(id, mapUpdatePayload({ status: nextStatus }));
    const note = buildSystemNote(
      `Status changed: ${existing.status || "UNKNOWN"} -> ${nextStatus}`,
      reason ? `Reason: ${reason}` : "",
    );
    await repository.createActivity({
      complaint_id: id,
      user_id: context.user?.id || null,
      note,
    });
    events.emitUpdated(updated);
    return toComplaint(updated);
  }

  async function statusHistory(id, context = {}) {
    await getById(id, context);
    const rows = await repository.findActivities(id, { limit: 500 });
    return rows.map(toComplaintActivity);
  }

  async function assign(id, payload, context = {}) {
    await getById(id, context);
    const updated = await repository.update(id, mapUpdatePayload({ assignedTo: payload.userId }));
    await repository.createActivity({
      complaint_id: id,
      user_id: context.user?.id || null,
      note: buildSystemNote("Assigned to user", payload.note || `UserId: ${payload.userId}`),
    });
    events.emitUpdated(updated);
    return toComplaint(updated);
  }

  async function escalate(id, payload, context = {}) {
    await getById(id, context);
    const updated = await repository.update(id, mapUpdatePayload({ status: "IN_PROGRESS" }));
    await repository.createActivity({
      complaint_id: id,
      user_id: context.user?.id || null,
      note: buildSystemNote("Escalated", payload.reason),
    });
    events.emitUpdated(updated);
    return toComplaint(updated);
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
    listActivities,
    createActivity,
    changeStatus,
    statusHistory,
    assign,
    escalate,
  });
}

export { createComplaintsService };
