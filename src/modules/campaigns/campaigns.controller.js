class CampaignsController {
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

  update = async (req, res) => {
    const result = await this.service.update(req.validated.params.id, req.validated.body, req.context);
    res.status(200).json({ data: result });
  };
}

module.exports = { CampaignsController };
