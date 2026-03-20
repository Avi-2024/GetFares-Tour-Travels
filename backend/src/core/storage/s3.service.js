import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { AppError } from "../errors/index.js";

const DEFAULT_MAX_SIZE_MB = 10;

function normalizePrefix(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .trim()
    .replace(/^[\\/]+|[\\/]+$/g, "")
    .replace(/\\/g, "/");
}

function buildPublicUrl({ bucket, region, publicBaseUrl, key }) {
  if (publicBaseUrl) {
    const base = String(publicBaseUrl).replace(/\/+$/g, "");
    return `${base}/${key}`;
  }

  if (!bucket || !region) {
    return null;
  }

  if (region === "us-east-1") {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function createS3Service({ config, logger }) {
  const awsConfig = config.aws || {};
  const bucket = awsConfig.bucket;
  const region = awsConfig.region;
  const maxSizeMb = awsConfig.maxUploadSizeMb || DEFAULT_MAX_SIZE_MB;

  const client = new S3Client({
    region,
    credentials:
      awsConfig.accessKeyId && awsConfig.secretAccessKey
        ? {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
          }
        : undefined,
  });

  function ensureConfigured() {
    if (!bucket || !region) {
      throw new AppError(
        500,
        "AWS S3 configuration is missing",
        "S3_CONFIG_MISSING",
      );
    }
  }

  function buildKey({ prefix, originalName }) {
    const safePrefix = normalizePrefix(awsConfig.uploadPrefix || "uploads");
    const safeCustomPrefix = normalizePrefix(prefix);
    const ext = originalName ? path.extname(originalName).slice(0, 16) : "";
    const fileName = `${randomUUID()}${ext}`;
    const date = new Date();
    const datePrefix = `${date.getUTCFullYear()}/${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`;

    return [safePrefix, safeCustomPrefix, datePrefix, fileName]
      .filter(Boolean)
      .join("/");
  }

  async function uploadBuffer({
    buffer,
    contentType,
    originalName,
    prefix,
    cacheControl,
    metadata,
  }) {
    ensureConfigured();

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new AppError(400, "No file provided", "S3_FILE_REQUIRED");
    }

    if (buffer.length > maxSizeMb * 1024 * 1024) {
      throw new AppError(
        413,
        `File exceeds ${maxSizeMb}MB limit`,
        "S3_FILE_TOO_LARGE",
      );
    }

    const key = buildKey({ prefix, originalName });
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: cacheControl,
      Metadata: metadata,
      ACL: awsConfig.publicRead ? "public-read" : undefined,
    });

    logger?.debug?.(
      { module: "s3", key, bucket, region },
      "Uploading file to S3",
    );

    const response = await client.send(putObjectCommand);
    const url = buildPublicUrl({
      bucket,
      region,
      publicBaseUrl: awsConfig.publicBaseUrl,
      key,
    });

    return {
      key,
      bucket,
      region,
      url,
      etag: response.ETag || null,
    };
  }

  return Object.freeze({
    uploadBuffer,
    buildPublicUrl,
  });
}

export { createS3Service };
