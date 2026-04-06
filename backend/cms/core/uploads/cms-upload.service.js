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

function createCmsUploadService({ s3, logger }) {
  function ensureConfigured() {
    if (!s3?.uploadBuffer) {
      throw new AppError(
        500,
        "S3 storage service is not configured",
        "S3_NOT_CONFIGURED",
      );
    }
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

    ensureConfigured();
    const mediaType = validateFileType(file, { allowVideo });
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
