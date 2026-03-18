function createEmployeesController({ service }) {
  return Object.freeze({
    async directory(req, res) {
      const result = await service.directory(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async checkIn(req, res) {
      const result = await service.checkIn(
        req.validated.body || {},
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async checkOut(req, res) {
      const result = await service.checkOut(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listAttendance(req, res) {
      const result = await service.listAttendance(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listLeaves(req, res) {
      const result = await service.listLeaves(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createLeave(req, res) {
      const result = await service.createLeave(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async updateLeaveStatus(req, res) {
      const result = await service.updateLeaveStatus(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createEmployeesController };
