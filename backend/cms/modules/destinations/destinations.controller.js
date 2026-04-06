import { asyncHandler } from "../../core/utils/index.js";

function createDestinationsController({ service }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.region) filters.region = req.query.region;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.isActive !== undefined)
        filters.is_active = req.query.isActive === "true";
      if (req.query.isPopular !== undefined)
        filters.is_popular = req.query.isPopular === "true";

      const destinations = await service.list(filters);
      res.json({
        success: true,
        data: destinations,
      });
    }),

    getById: asyncHandler(async (req, res) => {
      const destination = await service.getById(req.params.id);
      res.json({
        success: true,
        data: destination,
      });
    }),

    getBySlug: asyncHandler(async (req, res) => {
      const destination = await service.getBySlug(req.params.slug);
      res.json({
        success: true,
        data: destination,
      });
    }),

    create: asyncHandler(async (req, res) => {
      const destination = await service.create(req.body);
      res.status(201).json({
        success: true,
        data: destination,
      });
    }),

    update: asyncHandler(async (req, res) => {
      const destination = await service.update(req.params.id, req.body);
      res.json({
        success: true,
        data: destination,
      });
    }),

    // Media endpoints
    getMedia: asyncHandler(async (req, res) => {
      const media = await service.getMedia(req.params.id);
      res.json({
        success: true,
        data: media,
      });
    }),

    addMedia: asyncHandler(async (req, res) => {
      const media = await service.addMedia(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: media,
      });
    }),

    updateMedia: asyncHandler(async (req, res) => {
      const media = await service.updateMedia(req.params.mediaId, req.body);
      res.json({
        success: true,
        data: media,
      });
    }),

    deleteMedia: asyncHandler(async (req, res) => {
      const result = await service.deleteMedia(req.params.mediaId);
      res.json(result);
    }),

    // Season endpoints
    getSeasons: asyncHandler(async (req, res) => {
      const seasons = await service.getSeasons(req.params.id);
      res.json({
        success: true,
        data: seasons,
      });
    }),

    addSeason: asyncHandler(async (req, res) => {
      const season = await service.addSeason(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: season,
      });
    }),

    updateSeason: asyncHandler(async (req, res) => {
      const season = await service.updateSeason(req.params.seasonId, req.body);
      res.json({
        success: true,
        data: season,
      });
    }),

    deleteSeason: asyncHandler(async (req, res) => {
      const result = await service.deleteSeason(req.params.seasonId);
      res.json(result);
    }),

    // Package mapping endpoints
    getPackages: asyncHandler(async (req, res) => {
      const packages = await service.getPackages(req.params.id);
      res.json({
        success: true,
        data: packages,
      });
    }),

    mapPackage: asyncHandler(async (req, res) => {
      const { mainPackageId, displayOrder } = req.body;
      const result = await service.mapPackage(
        req.params.id,
        mainPackageId,
        displayOrder,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    }),

    unmapPackage: asyncHandler(async (req, res) => {
      const result = await service.unmapPackage(req.params.mapId);
      res.json(result);
    }),
  });
}

export { createDestinationsController };
