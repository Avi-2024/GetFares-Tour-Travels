import { asyncHandler } from "../../core/utils/index.js";

function createVisaController({ service, uploadService }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.isActive !== undefined)
        filters.is_active = req.query.isActive === "true";

      const visaDestinations = await service.list(filters);
      res.json({
        success: true,
        data: visaDestinations,
      });
    }),

    getById: asyncHandler(async (req, res) => {
      const visaDestination = await service.getById(req.params.id);
      res.json({
        success: true,
        data: visaDestination,
      });
    }),

    getBySlug: asyncHandler(async (req, res) => {
      const visaDestination = await service.getBySlug(req.params.slug);
      res.json({
        success: true,
        data: visaDestination,
      });
    }),

    create: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
          prefix: "cms/visa/banner",
          allowVideo: false,
          required: false,
        });
        payload.imageUrl = uploaded?.url || payload.imageUrl;
        payload.heroImageUrl = uploaded?.url || payload.heroImageUrl;
      }

      const visaDestination = await service.create(payload);
      res.status(201).json({
        success: true,
        data: visaDestination,
      });
    }),

    update: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
          prefix: "cms/visa/banner",
          allowVideo: false,
          required: false,
        });
        payload.imageUrl = uploaded?.url || payload.imageUrl;
        payload.heroImageUrl = uploaded?.url || payload.heroImageUrl;
      }

      const visaDestination = await service.update(req.params.id, payload);
      res.json({
        success: true,
        data: visaDestination,
      });
    }),

    delete: asyncHandler(async (req, res) => {
      const result = await service.delete(req.params.id);
      res.json(result);
    }),

    // Details endpoints
    getDetails: asyncHandler(async (req, res) => {
      const sectionType = req.query.sectionType || null;
      const details = await service.getDetails(req.params.id, sectionType);
      res.json({
        success: true,
        data: details,
      });
    }),

    addDetail: asyncHandler(async (req, res) => {
      const detail = await service.addDetail(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: detail,
      });
    }),

    updateDetail: asyncHandler(async (req, res) => {
      const detail = await service.updateDetail(req.params.detailId, req.body);
      res.json({
        success: true,
        data: detail,
      });
    }),

    deleteDetail: asyncHandler(async (req, res) => {
      const result = await service.deleteDetail(req.params.detailId);
      res.json(result);
    }),
  });
}

export { createVisaController };
