import { asyncHandler } from "../../core/utils/index.js";

function createCmsMediaController({ service }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.entityType) filters.entity_type = req.query.entityType;
      if (req.query.entityId) filters.entity_id = req.query.entityId;
      if (req.query.mediaKind) filters.media_kind = req.query.mediaKind;
      if (req.query.isActive !== undefined) {
        filters.is_active = req.query.isActive === "true";
      }

      const assets = await service.list(filters);
      res.json({ success: true, data: assets });
    }),

    getById: asyncHandler(async (req, res) => {
      const asset = await service.getById(req.params.id);
      res.json({ success: true, data: asset });
    }),

    create: asyncHandler(async (req, res) => {
      const asset = await service.create(req.body);
      res.status(201).json({ success: true, data: asset });
    }),

    update: asyncHandler(async (req, res) => {
      const asset = await service.update(req.params.id, req.body);
      res.json({ success: true, data: asset });
    }),

    delete: asyncHandler(async (req, res) => {
      const result = await service.delete(req.params.id);
      res.json(result);
    }),
  });
}

export { createCmsMediaController };
