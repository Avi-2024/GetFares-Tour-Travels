function createSettingsController({ service }) {
  async function getAll(req, res) {
    const result = await service.getAll(req.context);
    res.status(200).json({ data: result });
  }

  async function getSystem(req, res) {
    const result = await service.getSection("system", req.context);
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

  return Object.freeze({
    getAll,
    getSystem,
    updateSystem,
    getIntegrations,
    updateIntegrations,
  });
}

export { createSettingsController };
