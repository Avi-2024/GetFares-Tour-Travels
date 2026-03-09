class BookingsController {
  constructor({ service }) {
    this.service = service;
  }

  list = async (req, res) => {
    const result = await this.service.list(req.validated?.query || req.query, req.context);
    res.status(200).json({ data: result });
  };

  getById = async (req, res) => {
    const result = await this.service.getById(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  };

  create = async (req, res) => {
    const result = await this.service.create(req.validated.body, req.context);
    res.status(201).json({ data: result });
  };

    async update(req, res) {
      const result = await service.update(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async transitionStatus(req, res) {
      const result = await service.transitionStatus(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async listStatusHistory(req, res) {
      const result = await service.listStatusHistory(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async generateInvoice(req, res) {
      const result = await service.generateInvoice(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(201).json({ data: result });
    },

    async listInvoices(req, res) {
      const result = await service.listInvoices(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { BookingsController };
