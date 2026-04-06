import { asyncHandler } from "../../core/utils/index.js";
import { AppError } from "../../core/middlewares/errorHandler.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function normalizeFileLabel(fileName) {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "media";
}

function resolveExtension(file) {
  const originalExtension = path.extname(file.originalname || "").toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  if (file.mimetype === "image/jpeg") return ".jpg";
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  if (file.mimetype === "image/gif") return ".gif";
  if (file.mimetype === "image/svg+xml") return ".svg";
  return ".bin";
}

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

    upload: asyncHandler(async (req, res) => {
      const uploadedFile = req.file;
      if (!uploadedFile) {
        throw new AppError(400, "Media file is required.", "FILE_REQUIRED");
      }

      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith("image/")) {
        throw new AppError(
          400,
          "Only image files are supported for media upload.",
          "INVALID_MEDIA_TYPE",
        );
      }

      const uploadsDir = path.join(process.cwd(), "uploads", "cms");
      await fs.mkdir(uploadsDir, { recursive: true });

      const baseName = normalizeFileLabel(
        path.basename(uploadedFile.originalname || "media", path.extname(uploadedFile.originalname || "")),
      );
      const extension = resolveExtension(uploadedFile);
      const randomSuffix = crypto.randomBytes(5).toString("hex");
      const fileName = `${Date.now()}-${randomSuffix}-${baseName}${extension}`;
      const destinationPath = path.join(uploadsDir, fileName);

      await fs.writeFile(destinationPath, uploadedFile.buffer);

      const mediaUrl = `/uploads/cms/${fileName}`;
      res.status(201).json({
        success: true,
        data: {
          url: mediaUrl,
          mediaUrl,
          fileName: uploadedFile.originalname || fileName,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size || 0,
        },
      });
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
