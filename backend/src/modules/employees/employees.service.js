const { AppError } = require("../../core/errors");

const LEAVE_STATUSES = new Set([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

function toDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function toUser(entity) {
  return {
    id: entity.id,
    fullName: entity.full_name,
    email: entity.email,
    phone: entity.phone,
    isActive: entity.is_active,
    isOnLeave: entity.is_on_leave,
    targetAmount: entity.target_amount,
    incentivePercent: entity.incentive_percent,
    expertiseDestinations: entity.expertise_destinations,
    createdAt: entity.created_at,
  };
}

function toAttendance(entity) {
  return {
    id: entity.id,
    userId: entity.user_id,
    checkIn: entity.check_in,
    checkOut: entity.check_out,
    date: entity.date,
  };
}

function toLeave(entity) {
  return {
    id: entity.id,
    userId: entity.user_id,
    startDate: entity.start_date,
    endDate: entity.end_date,
    reason: entity.reason,
    status: entity.status,
  };
}

function createEmployeesService({ repository, logger, events }) {
  async function ensureUser(userId) {
    const user = await repository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found", "EMPLOYEE_USER_NOT_FOUND");
    }
    return user;
  }

  return Object.freeze({
    async directory(filters = {}, context = {}) {
      logger.debug(
        { module: "employees", requestId: context.requestId, filters },
        "Employee directory",
      );
      const rows = await repository.findDirectory({
        is_active: filters.isActive,
        is_on_leave: filters.isOnLeave,
        email: filters.email,
        page: filters.page,
        limit: filters.limit,
      });
      return rows.map(toUser);
    },

    async checkIn(payload, context = {}) {
      const userId = payload.userId || context.user?.id;
      if (!userId) {
        throw new AppError(
          400,
          "userId is required",
          "EMPLOYEE_USER_ID_REQUIRED",
        );
      }
      await ensureUser(userId);

      const date = payload.date || toDateOnly(new Date().toISOString());
      const existing = await repository.findAttendance({
        user_id: userId,
        date,
      });
      const open = existing.find((item) => !item.check_out);
      if (open) {
        throw new AppError(
          409,
          "Already checked in for this date",
          "EMPLOYEE_ALREADY_CHECKED_IN",
        );
      }

      const created = await repository.createAttendance({
        user_id: userId,
        check_in: payload.checkIn || new Date().toISOString(),
        date,
      });

      const record = toAttendance(created);
      events.emitAttendanceCheckIn(record);
      return record;
    },

    async checkOut(payload, context = {}) {
      const userId = payload.userId || context.user?.id;
      if (!userId) {
        throw new AppError(
          400,
          "userId is required",
          "EMPLOYEE_USER_ID_REQUIRED",
        );
      }
      await ensureUser(userId);

      const date = payload.date || toDateOnly(new Date().toISOString());
      const existing = await repository.findAttendance({
        user_id: userId,
        date,
      });
      const open = existing.find((item) => !item.check_out);
      if (!open) {
        throw new AppError(
          404,
          "No active check-in found for this date",
          "EMPLOYEE_CHECKIN_NOT_FOUND",
        );
      }

      const updated = await repository.updateAttendance(open.id, {
        check_out: payload.checkOut || new Date().toISOString(),
      });

      const record = toAttendance(updated);
      events.emitAttendanceCheckOut(record);
      return record;
    },

    async listAttendance(filters = {}, context = {}) {
      logger.debug(
        { module: "employees", requestId: context.requestId, filters },
        "List attendance",
      );
      const rows = await repository.findAttendance({
        user_id: filters.userId,
        date: filters.date,
        page: filters.page,
        limit: filters.limit,
      });
      return rows.map(toAttendance);
    },

    async listLeaves(filters = {}, context = {}) {
      logger.debug(
        { module: "employees", requestId: context.requestId, filters },
        "List leaves",
      );
      const rows = await repository.findLeaves({
        user_id: filters.userId,
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
      });
      return rows.map(toLeave);
    },

    async createLeave(payload, context = {}) {
      const userId = payload.userId || context.user?.id;
      if (!userId) {
        throw new AppError(
          400,
          "userId is required",
          "EMPLOYEE_USER_ID_REQUIRED",
        );
      }
      await ensureUser(userId);

      if (payload.endDate < payload.startDate) {
        throw new AppError(
          400,
          "endDate must be >= startDate",
          "EMPLOYEE_INVALID_LEAVE_DATES",
        );
      }

      const created = await repository.createLeave({
        user_id: userId,
        start_date: payload.startDate,
        end_date: payload.endDate,
        reason: payload.reason || null,
        status: "PENDING",
      });

      const leave = toLeave(created);
      events.emitLeaveCreated(leave);
      return leave;
    },

    async updateLeaveStatus(id, payload, context = {}) {
      const existing = await repository.findLeaveById(id);
      if (!existing) {
        throw new AppError(
          404,
          "Leave request not found",
          "EMPLOYEE_LEAVE_NOT_FOUND",
        );
      }

      const status = String(payload.status || "")
        .trim()
        .toUpperCase();
      if (!LEAVE_STATUSES.has(status)) {
        throw new AppError(
          400,
          "Invalid leave status",
          "EMPLOYEE_INVALID_LEAVE_STATUS",
        );
      }

      const updated = await repository.updateLeave(id, {
        status,
      });

      const user = await repository.findUserById(existing.user_id);
      if (user) {
        await repository.updateUser(existing.user_id, {
          is_on_leave: status === "APPROVED",
        });
      }

      events.emitLeaveUpdated({
        ...toLeave(updated),
        updatedBy: context.user?.id || null,
      });

      return toLeave(updated);
    },
  });
}

module.exports = { createEmployeesService };
