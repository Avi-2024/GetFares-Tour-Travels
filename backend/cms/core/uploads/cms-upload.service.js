import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "../middlewares/errorHandler.js";

function isImageMimeType(mimeType = "") {
  return String(mimeType).toLowerCase().startsWith("image/");
}

function isVideoMimeType(mimeType = "") {
  return String(mimeType).toLowerCase().startsWith("video/");
}

function resolveMediaType(mimeType = "") {
  if (isImageMimeType(mimeType)) return "image";
  if (isVideoMimeType(mimeType)) return "video";
  return "unknown";
}

function normalizePrefix(value = "") {
  return String(value)
    .trim()
    .replace(/^[\\/]+|[\\/]+$/g, "")
    .replace(/\\/g, "/");
}

function getPublicBaseUrl() {
  const configured = String(process.env.PUBLIC_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  if (configured) {
    return configured;
  }

  const port = String(process.env.PORT || "3000").trim();
  return `http://localhost:${port}`;
}

function createCmsUploadService({ s3, logger }) {
  async function uploadToLocal({ file, prefix, mediaType }) {
    const safePrefix = normalizePrefix(prefix);
    const date = new Date();
    const datePrefix = `${date.getUTCFullYear()}/${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`;
    const ext = path.extname(file.originalname || "").slice(0, 16);
    const fileName = `${randomUUID()}${ext}`;
    const relativeParts = [safePrefix, datePrefix, fileName].filter(Boolean);
    const relativePath = relativeParts.join("/");
    const uploadsDir = path.join(
      process.cwd(),
      "uploads",
      ...relativeParts.slice(0, -1),
    );
    const fullPath = path.join(process.cwd(), "uploads", ...relativeParts);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const url = `${getPublicBaseUrl()}/uploads/${relativePath}`;

    logger?.debug?.(
      { module: "cms-upload", path: fullPath, mediaType },
      "Stored CMS media file locally",
    );

    return {
      mediaType,
      url,
      key: `local:${relativePath}`,
      contentType: file.mimetype,
      size: file.size || 0,
      originalName: file.originalname || null,
    };
  }

  function validateFileType(file, { allowVideo = false } = {}) {
    const mediaType = resolveMediaType(file?.mimetype);
    const acceptedTypes = allowVideo ? "image/video" : "image";

    if (mediaType === "image") {
      return "image";
    }

    if (allowVideo && mediaType === "video") {
      return "video";
    }

    throw new AppError(
      400,
      `Invalid file type. Only ${acceptedTypes} files are supported.`,
      "INVALID_FILE_TYPE",
    );
  }

  async function uploadSingle({
    file,
    prefix,
    allowVideo = false,
    required = false,
  }) {
    if (!file) {
      if (required) {
        throw new AppError(400, "File is required", "FILE_REQUIRED");
      }
      return null;
    }

    const mediaType = validateFileType(file, { allowVideo });
    if (s3?.uploadBuffer) {
      try {
        const uploaded = await s3.uploadBuffer({
          buffer: file.buffer,
          contentType: file.mimetype,
          originalName: file.originalname,
          prefix,
          metadata: {
            source: "cms",
            mediaType,
          },
        });

        logger?.debug?.(
          { module: "cms-upload", key: uploaded.key, mediaType },
          "Uploaded CMS media file to S3",
        );

        return {
          mediaType,
          url: uploaded.url,
          key: uploaded.key,
          contentType: file.mimetype,
          size: file.size || 0,
          originalName: file.originalname || null,
        };
      } catch (error) {
        logger?.warn?.(
          { err: error, module: "cms-upload" },
          "S3 upload failed for CMS media. Falling back to local uploads",
        );
      }
    }

    return uploadToLocal({ file, prefix, mediaType });
  }

  async function uploadMany({ files, prefix, allowVideo = false, maxCount = 20 }) {
    const normalized = Array.isArray(files) ? files : [];
    if (!normalized.length) {
      return [];
    }

    if (normalized.length > maxCount) {
      throw new AppError(
        400,
        `Too many files. Maximum allowed is ${maxCount}.`,
        "MAX_FILES_EXCEEDED",
      );
    }

    const uploads = [];
    for (const file of normalized) {
      const uploaded = await uploadSingle({
        file,
        prefix,
        allowVideo,
        required: true,
      });
      uploads.push(uploaded);
    }

    return uploads;
  }

  return Object.freeze({
    uploadSingle,
    uploadMany,
  });
}

export { createCmsUploadService, resolveMediaType };
