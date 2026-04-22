import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { AppError } from "../errors/index.js";

const DEFAULT_MAX_SIZE_MB = 10;

function parseAccountName(connectionString) {
  const m = String(connectionString || "").match(/AccountName=([^;]+)/i);
  return m ? m[1].trim() : null;
}

function normalizePrefix(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .trim()
    .replace(/^[\\/]+|[\\/]+$/g, "")
    .replace(/\\/g, "/");
}

function resolvePublicUrl({
  accountName,
  containerName,
  publicBaseUrl,
  key,
  blockBlobUrl,
}) {
  if (publicBaseUrl) {
    const base = String(publicBaseUrl).replace(/\/+$/g, "");
    return `${base}/${key}`;
  }
  if (blockBlobUrl) {
    return blockBlobUrl;
  }
  if (!accountName || !containerName) {
    return null;
  }
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${accountName}.blob.core.windows.net/${containerName}/${encodedKey}`;
}

function createBlobStorageService({ config, logger }) {
  const blobConfig = config.azureBlob || {};
  const connectionString = blobConfig.connectionString;
  const containerName = blobConfig.containerName;
  const maxSizeMb = blobConfig.maxUploadSizeMb || DEFAULT_MAX_SIZE_MB;
  const accountName = parseAccountName(connectionString);

  let containerClient = null;

  function getContainerClient() {
    if (!connectionString || !containerName) {
      return null;
    }
    if (!containerClient) {
      const service = BlobServiceClient.fromConnectionString(connectionString);
      containerClient = service.getContainerClient(containerName);
    }
    return containerClient;
  }

  function ensureConfigured() {
    if (!connectionString || !containerName) {
      throw new AppError(
        500,
        "Azure Blob Storage configuration is missing",
        "S3_CONFIG_MISSING",
      );
    }
  }

  async function ensureContainer(client) {
    await client.createIfNotExists({
      access: blobConfig.publicRead ? "blob" : undefined,
    });
  }

  function buildKey({ prefix, originalName }) {
    const safePrefix = normalizePrefix(blobConfig.uploadPrefix || "uploads");
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
    const cc = getContainerClient();
    if (!cc) {
      throw new AppError(
        500,
        "Azure Blob Storage configuration is missing",
        "S3_CONFIG_MISSING",
      );
    }

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

    await ensureContainer(cc);

    const key = buildKey({ prefix, originalName });
    const blockBlobClient = cc.getBlockBlobClient(key);

    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: contentType || "application/octet-stream",
        ...(cacheControl ? { blobCacheControl: cacheControl } : {}),
      },
    };
    if (metadata && typeof metadata === "object") {
      const meta = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (v == null) continue;
        meta[String(k)] = String(v);
      }
      if (Object.keys(meta).length) {
        uploadOptions.metadata = meta;
      }
    }

    logger?.debug?.(
      { module: "azure-blob", key, container: containerName, accountName },
      "Uploading file to Azure Blob Storage",
    );

    const uploadResponse = await blockBlobClient.uploadData(buffer, uploadOptions);

    const url = resolvePublicUrl({
      accountName,
      containerName,
      publicBaseUrl: blobConfig.publicBaseUrl,
      key,
      blockBlobUrl: blockBlobClient.url,
    });

    return {
      key,
      bucket: containerName,
      region: accountName || "azure",
      url,
      etag: uploadResponse.etag || null,
    };
  }

  function buildPublicUrl({ bucket, publicBaseUrl, key, region }) {
    return resolvePublicUrl({
      accountName: region || accountName,
      containerName: bucket || containerName,
      publicBaseUrl: publicBaseUrl ?? blobConfig.publicBaseUrl,
      key,
      blockBlobUrl: null,
    });
  }

  return Object.freeze({
    uploadBuffer,
    buildPublicUrl,
  });
}

export { createBlobStorageService };
