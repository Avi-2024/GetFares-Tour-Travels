import { asyncHandler } from "../../core/utils/index.js";

function createLandingController({ service, uploadService }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.active !== undefined) {
        filters.active = req.query.active === "true";
      }

      const places = await service.listOverview(filters);
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
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
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
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
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

    delete: asyncHandler(async (req, res) => {
      const result = await service.delete(req.params.id);
      res.json(result);
    }),

    reorder: asyncHandler(async (req, res) => {
      const result = await service.reorder(req.body.items);
      res.json(result);
    }),
  });
}

export { createLandingController };
