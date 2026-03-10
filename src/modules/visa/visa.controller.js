function createVisaController({ service }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const result = await service.update(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async transitionStatus(req, res) {
      const result = await service.transitionStatus(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async createDocument(req, res) {
      const result = await service.createDocument(req.validated.params.id, req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async listDocuments(req, res) {
      const result = await service.listDocuments(req.validated.params.id, req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async verifyDocument(req, res) {
      const result = await service.verifyDocument(req.validated.params.documentId, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async getChecklist(req, res) {
      const result = await service.getChecklist(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async updateChecklist(req, res) {
      const result = await service.updateChecklist(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async getSummaryReport(req, res) {
      const result = await service.getSummaryReport(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createVisaController };
