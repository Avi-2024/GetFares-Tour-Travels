function createComplaintsController({ service }) {
  async function list(req, res) {
    const result = await service.list(
      req.validated?.query || req.query,
      req.context,
    );
    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
    });
  }

  async function getById(req, res) {
    const result = await service.getById(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  }

  async function create(req, res) {
    const result = await service.create(req.validated.body, req.context);
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

  async function listActivities(req, res) {
    const result = await service.listActivities(
      req.validated.params.id,
      req.validated?.query || req.query,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function createActivity(req, res) {
    const result = await service.createActivity(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(201).json({ data: result });
  }

  async function changeStatus(req, res) {
    const result = await service.changeStatus(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function statusHistory(req, res) {
    const result = await service.statusHistory(
      req.validated.params.id,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function assign(req, res) {
    const result = await service.assign(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function escalate(req, res) {
    const result = await service.escalate(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
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

export { createComplaintsController };
