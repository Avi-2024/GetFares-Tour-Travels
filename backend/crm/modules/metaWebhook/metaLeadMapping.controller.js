function createMetaLeadMappingController({ service, webhookService }) {
  async function getMetadata(_req, res) {
    res.status(200).json({ success: true, data: service.getMetadata() });
  }

  async function listProfiles(req, res) {
    const isActive = req.validated?.query?.isActive;
    const data = await service.listProfiles(
      isActive === undefined ? {} : { isActive },
    );
    res.status(200).json({ success: true, data });
  }

  async function getProfile(req, res) {
    const data = await service.getProfileById(req.validated.params.id);
    res.status(200).json({ success: true, data });
  }

  async function createProfile(req, res) {
    const data = await service.createProfile(req.validated.body, req.context);
    res.status(201).json({ success: true, data });
  }

  async function updateProfile(req, res) {
    const data = await service.updateProfile(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ success: true, data });
  }

  async function createFieldMap(req, res) {
    const data = await service.createFieldMap(
      req.validated.params.profileId,
      req.validated.body,
      req.context,
    );
    res.status(201).json({ success: true, data });
  }

  async function updateFieldMap(req, res) {
    const data = await service.updateFieldMap(
      req.validated.params.id,
      req.validated.body,
      req.context,
    );
    res.status(200).json({ success: true, data });
  }

  async function deleteFieldMap(req, res) {
    const data = await service.deleteFieldMap(req.validated.params.id);
    res.status(200).json({ success: true, data });
  }

  async function testMapping(req, res) {
    const data = await service.testMapping(req.validated.body);
    res.status(200).json({ success: true, data });
  }

  async function createTestLead(req, res) {
    const data = await webhookService.createTestLead(
      req.validated.body,
      req.context,
    );
    res.status(201).json({
      success: true,
      message: data.duplicate ? "Test matched existing lead" : "Test lead created",
      data,
    });
  }

  async function reloadCache(_req, res) {
    const data = await service.reloadCache();
    res.status(200).json({ success: true, data });
  }

  return Object.freeze({
    getMetadata,
    listProfiles,
    getProfile,
    createProfile,
    updateProfile,
    createFieldMap,
    updateFieldMap,
    deleteFieldMap,
    testMapping,
    createTestLead,
    reloadCache,
  });
}

export { createMetaLeadMappingController };
