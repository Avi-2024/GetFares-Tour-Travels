class RefundsController {
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

    async approve(req, res) {
      const result = await service.approve(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async reject(req, res) {
      const result = await service.reject(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async process(req, res) {
      const result = await service.process(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { RefundsController };
