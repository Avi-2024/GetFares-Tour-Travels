import { asyncHandler } from "../../core/utils/index.js";
import { getFirstRequestFile } from "../../core/uploads/request-files.util.js";

function createVisaController({ service, uploadService }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.isActive !== undefined)
        filters.is_active = req.query.isActive === "true";
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const visaDestinations = await service.list(filters);
      res.json({
        success: true,
        data: visaDestinations,
      });
    }),

    listDeleted: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }

      const visaDestinations = await service.listDeleted(filters);
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
      const imageFile = getFirstRequestFile(req, [
        "bannerImage",
        "image",
        "heroImage",
        "file",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
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
      const imageFile = getFirstRequestFile(req, [
        "bannerImage",
        "image",
        "heroImage",
        "file",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
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

    updateStatus: asyncHandler(async (req, res) => {
      const visaDestination = await service.updateStatus(
        req.params.id,
        req.body?.isActive,
      );
      res.json({
        success: true,
        data: visaDestination,
      });
    }),

    delete: asyncHandler(async (req, res) => {
      const result = await service.delete(req.params.id);
      res.json(result);
    }),

    hardDelete: asyncHandler(async (req, res) => {
      const result = await service.hardDelete(req.params.id);
      res.json(result);
    }),

    restore: asyncHandler(async (req, res) => {
      const result = await service.restore(req.params.id);
      res.json(result);
    }),

    // Details endpoints
    getDetails: asyncHandler(async (req, res) => {
      const sectionType = req.query.sectionType || null;
      const includeDeleted = req.query.includeDeleted === "true";
      const details = await service.getDetails(
        req.params.id,
        sectionType,
        includeDeleted,
      );
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

    listDeletedDetails: asyncHandler(async (_req, res) => {
      const rows = await service.listDeletedDetails({});
      res.json({
        success: true,
        data: rows,
      });
    }),

    hardDeleteDetail: asyncHandler(async (req, res) => {
      const result = await service.hardDeleteDetail(req.params.detailId);
      res.json(result);
    }),

    restoreDetail: asyncHandler(async (req, res) => {
      const result = await service.restoreDetail(req.params.detailId);
      res.json(result);
    }),
  });
}

export { createVisaController };
