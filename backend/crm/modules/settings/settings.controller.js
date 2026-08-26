function createSettingsController({ service }) {
  async function getAll(req, res) {
    const result = await service.getAll(req.context);
    res.status(200).json({ data: result });
  }

  async function getSystem(req, res) {
    const result = await service.getSection("system", req.context);
    res.status(200).json({ data: result });
  }

  async function getSystemPreferences(req, res) {
    const result = await service.getSystemPreferences(req.context);
    res.status(200).json({ data: result });
  }

  async function updateSystem(req, res) {
    const result = await service.updateSection(
      "system",
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function getIntegrations(req, res) {
    const result = await service.getSection("integrations", req.context);
    res.status(200).json({ data: result });
  }

  async function updateIntegrations(req, res) {
    const result = await service.updateSection(
      "integrations",
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function getLeadStatusWorkflow(req, res) {
    const result = await service.getLeadStatusWorkflow(req.context);
    res.status(200).json({ data: result });
  }

  async function createLeadStatusMain(req, res) {
    const result = await service.createLeadStatusMain(
      req.validated.body,
      req.context,
    );
    res.status(201).json({ data: result });
  }

  async function updateLeadStatusMain(req, res) {
    const result = await service.updateLeadStatusMain(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function createLeadStatusSub(req, res) {
    const result = await service.createLeadStatusSub(
      req.validated.body,
      req.context,
    );
    res.status(201).json({ data: result });
  }

  async function updateLeadStatusSub(req, res) {
    const result = await service.updateLeadStatusSub(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  async function reorderLeadStatusWorkflow(req, res) {
    const result = await service.reorderLeadStatusWorkflow(
      req.validated.body,
      req.context,
    );
    res.status(200).json({ data: result });
  }

  return Object.freeze({
    getAll,
    getSystem,
    getSystemPreferences,
    updateSystem,
    getIntegrations,
    updateIntegrations,
    getLeadStatusWorkflow,
    createLeadStatusMain,
    updateLeadStatusMain,
    createLeadStatusSub,
    updateLeadStatusSub,
    reorderLeadStatusWorkflow,
  });
}

export { createSettingsController };
