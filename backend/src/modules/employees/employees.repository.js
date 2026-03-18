function createEmployeesRepository({ db, logger, schema }) {
  async function findDirectory(filters = {}) {
    return db.findMany(schema.usersTable, filters);
  }

  async function findUserById(id) {
    return db.findById(schema.usersTable, id);
  }

  async function updateUser(id, payload) {
    logger.debug(
      { module: "employees", id, payload },
      "Updating employee user",
    );
    return db.update(schema.usersTable, id, payload);
  }

  async function findAttendance(filters = {}) {
    return db.findMany(schema.attendanceTable, filters);
  }

  async function findAttendanceById(id) {
    return db.findById(schema.attendanceTable, id);
  }

  async function createAttendance(payload) {
    logger.debug({ module: "employees", payload }, "Creating attendance");
    return db.insert(schema.attendanceTable, payload);
  }

  async function updateAttendance(id, payload) {
    logger.debug({ module: "employees", id, payload }, "Updating attendance");
    return db.update(schema.attendanceTable, id, payload);
  }

  async function findLeaves(filters = {}) {
    return db.findMany(schema.leavesTable, filters);
  }

  async function findLeaveById(id) {
    return db.findById(schema.leavesTable, id);
  }

  async function createLeave(payload) {
    logger.debug({ module: "employees", payload }, "Creating leave");
    return db.insert(schema.leavesTable, payload);
  }

  async function updateLeave(id, payload) {
    logger.debug({ module: "employees", id, payload }, "Updating leave");
    return db.update(schema.leavesTable, id, payload);
  }

  return Object.freeze({
    findDirectory,
    findUserById,
    updateUser,
    findAttendance,
    findAttendanceById,
    createAttendance,
    updateAttendance,
    findLeaves,
    findLeaveById,
    createLeave,
    updateLeave,
  });
}

export { createEmployeesRepository };
