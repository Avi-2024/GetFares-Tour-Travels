function createCampaignsController({ service }) {
  async function list(req, res) {
    const result = await service.list(
      req.validated?.query || req.query,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function getById(req, res) {
    const result = await service.getById(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  }

  async function create(req, res) {
    const result = await service.create(req.validated.body, req.context);
    res.status(201).json({ data: result });
  }

  async function duplicate(req, res) {
    const result = await service.duplicate(req.validated.params.id, req.context);
    res.status(201).json({ data: result });
  }

  async function update(req, res) {
    const result = await service.update(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function remove(req, res) {
    const result = await service.remove(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  }

  return Object.freeze({
    list,
    getById,
    create,
    duplicate,
    update,
    remove,
  });
}

export { createCampaignsController };
