function createMetaPageConfigController({ service }) {
  async function listPages(req, res) {
    const isActive = req.validated?.query?.isActive;
    const data = await service.listPages(
      isActive === undefined ? {} : { isActive },
    );
    res.status(200).json({ success: true, data });
  }

  async function getPage(req, res) {
    const data = await service.getPageById(req.validated.params.id);
    res.status(200).json({ success: true, data });
  }

  async function createPage(req, res) {
    const data = await service.createPage(req.validated.body);
    res.status(201).json({ success: true, data });
  }

  async function updatePage(req, res) {
    const data = await service.updatePage(
      req.validated.params.id,
      req.validated.body,
    );
    res.status(200).json({ success: true, data });
  }

  async function deletePage(req, res) {
    const data = await service.deletePage(req.validated.params.id);
    res.status(200).json({ success: true, data });
  }

  async function getIntegration(_req, res) {
    const data = await service.getIntegration();
    res.status(200).json({ success: true, data });
  }

  async function updateIntegration(req, res) {
    const data = await service.updateIntegration(req.validated.body);
    res.status(200).json({ success: true, data });
  }

  return Object.freeze({
    listPages,
    getPage,
    createPage,
    updatePage,
    deletePage,
    getIntegration,
    updateIntegration,
  });
}

export { createMetaPageConfigController };
