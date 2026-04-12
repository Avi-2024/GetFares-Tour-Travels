import { asyncHandler } from "../../core/utils/index.js";
import { getFirstRequestFile } from "../../core/uploads/request-files.util.js";

function createLandingController({ service, uploadService }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.active !== undefined) {
        filters.active = req.query.active === "true";
      }
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const places = await service.list(filters);
      res.json({
        success: true,
        data: places,
      });
    }),

    listDeleted: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      const places = await service.listDeleted(filters);
      res.json({
        success: true,
        data: places,
      });
    }),

    getById: asyncHandler(async (req, res) => {
      const place = await service.getById(req.params.id);
      res.json({
        success: true,
        data: place,
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
        "imageFile",
        "file",
        "banner",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
          prefix: "cms/landing/banner",
          allowVideo: false,
          required: false,
        });
        payload.imageUrl = uploaded?.url || payload.imageUrl;
      }

      const place = await service.create(payload);
      res.status(201).json({
        success: true,
        data: place,
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
        "imageFile",
        "file",
        "banner",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
          prefix: "cms/landing/banner",
          allowVideo: false,
          required: false,
        });
        payload.imageUrl = uploaded?.url || payload.imageUrl;
      }

      const place = await service.update(req.params.id, payload);
      res.json({
        success: true,
        data: place,
      });
    }),

    updateStatus: asyncHandler(async (req, res) => {
      const place = await service.updateStatus(req.params.id, req.body?.isActive);
      res.json({
        success: true,
        data: place,
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

    reorder: asyncHandler(async (req, res) => {
      const result = await service.reorder(req.body.items);
      res.json(result);
    }),
  });
}

export { createLandingController };
