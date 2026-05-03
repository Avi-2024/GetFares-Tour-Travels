function createCustomersController({ service }) {
  async function list(req, res) {
    const result = await service.list(
      req.validated?.query || req.query,
      req.context,
    );
    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
      summary: result.summary,
    });
  }

  async function getById(req, res) {
    const result = await service.getById(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  }

  async function getLeads(req, res) {
    const result = await service.getLeads(req.validated.params.id, req.context);
    res.status(200).json({
      data: result.items,
      summary: { totalLeads: result.totalLeads },
    });
  }

  async function getBookings(req, res) {
    const result = await service.getBookings(req.validated.params.id, req.context);
    res.status(200).json({
      data: result.items,
      summary: { totalBookings: result.totalBookings },
    });
  }

  async function getPaymentOptions(req, res) {
    const result = await service.getPaymentOptions(req.context);
    res.status(200).json({
      data: result.items,
      summary: {
        totalCustomers: result.totalCustomers,
        totalBookings: result.totalBookings,
      },
    });
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

  async function remove(req, res) {
    const result = await service.remove(req.validated.params.id, req.context);
    res.status(200).json({ data: result });
  }

  return Object.freeze({
    list,
    getById,
    getLeads,
    getBookings,
    getPaymentOptions,
    create,
    update,
    remove,
  });
}

export { createCustomersController };
