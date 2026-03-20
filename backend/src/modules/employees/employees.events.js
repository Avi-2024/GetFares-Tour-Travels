function createEmployeesEvents({ eventBus, logger }) {
  return Object.freeze({
    emitAttendanceCheckIn(payload) {
      logger.info(
        { attendanceId: payload.id, userId: payload.userId },
        "employees.attendance_check_in",
      );
      eventBus.emit("employees.attendance_check_in", payload);
    },
    emitAttendanceCheckOut(payload) {
      logger.info(
        { attendanceId: payload.id, userId: payload.userId },
        "employees.attendance_check_out",
      );
      eventBus.emit("employees.attendance_check_out", payload);
    },
    emitLeaveCreated(payload) {
      logger.info(
        { leaveId: payload.id, userId: payload.userId },
        "employees.leave_created",
      );
      eventBus.emit("employees.leave_created", payload);
    },
    emitLeaveUpdated(payload) {
      logger.info(
        { leaveId: payload.id, userId: payload.userId, status: payload.status },
        "employees.leave_updated",
      );
      eventBus.emit("employees.leave_updated", payload);
    },
  });
}

export { createEmployeesEvents };
