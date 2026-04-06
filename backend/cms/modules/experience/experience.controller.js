import { asyncHandler } from "../../core/utils/index.js";

function createExperienceController({ service }) {
  return Object.freeze({
    listFeaturedPicks: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.isActive !== undefined) {
        filters.is_active = req.query.isActive === "true";
      }
      if (req.query.sectionKey) {
        filters.section_key = req.query.sectionKey;
      }
      if (req.query.campaignType) {
        filters.campaign_type = req.query.campaignType;
      }

      const rows = await service.listFeaturedPicks(filters);
      res.json({ success: true, data: rows });
    }),

    getFeaturedPickById: asyncHandler(async (req, res) => {
      const row = await service.getFeaturedPickById(req.params.id);
      res.json({ success: true, data: row });
    }),

    createFeaturedPick: asyncHandler(async (req, res) => {
      const row = await service.createFeaturedPick(req.body);
      res.status(201).json({ success: true, data: row });
    }),

    updateFeaturedPick: asyncHandler(async (req, res) => {
      const row = await service.updateFeaturedPick(req.params.id, req.body);
      res.json({ success: true, data: row });
    }),

    deleteFeaturedPick: asyncHandler(async (req, res) => {
      const result = await service.deleteFeaturedPick(req.params.id);
      res.json(result);
    }),

    listSeasonCards: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.destinationId) {
        filters.destinationId = req.query.destinationId;
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === "true";
      }
      const rows = await service.listSeasonCards(filters);
      res.json({ success: true, data: rows });
    }),

    getSeasonCardById: asyncHandler(async (req, res) => {
      const row = await service.getSeasonCardById(req.params.id);
      res.json({ success: true, data: row });
    }),

    createSeasonCard: asyncHandler(async (req, res) => {
      const row = await service.createSeasonCard(req.body);
      res.status(201).json({ success: true, data: row });
    }),

    updateSeasonCard: asyncHandler(async (req, res) => {
      const row = await service.updateSeasonCard(req.params.id, req.body);
      res.json({ success: true, data: row });
    }),

    deleteSeasonCard: asyncHandler(async (req, res) => {
      const result = await service.deleteSeasonCard(req.params.id);
      res.json(result);
    }),

    listHeroSections: asyncHandler(async (_req, res) => {
      const rows = await service.listHeroSections();
      res.json({ success: true, data: rows });
    }),

    upsertHeroSection: asyncHandler(async (req, res) => {
      const row = await service.upsertHeroSection(
        req.params.sectionKey,
        req.body,
      );
      res.json({ success: true, data: row });
    }),
  });
}

export { createExperienceController };
