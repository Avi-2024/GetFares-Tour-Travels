import { AppError } from "../../core/errors/index.js";

function normalizeFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeBaseUrl(value) {
  if (!value) {
    return null;
  }

  return String(value).replace(/\/+$/, "");
}

function normalizeVersion(value) {
  if (!value) {
    return null;
  }

  return String(value).replace(/^\/+|\/+$/g, "");
}

function createMetaApi({
  accessToken,
  logger,
  graphBaseUrl,
  graphVersion,
  graphFields,
} = {}) {
  const baseUrl = normalizeBaseUrl(graphBaseUrl);
  const version = normalizeVersion(graphVersion);
  const fields = normalizeFields(graphFields);

  if (!baseUrl) {
    throw new AppError(
      500,
      "META_GRAPH_BASE_URL is not configured",
      "META_CONFIG_MISSING",
    );
  }

  if (!version) {
    throw new AppError(
      500,
      "META_GRAPH_VERSION is not configured",
      "META_CONFIG_MISSING",
    );
  }

  if (fields.length === 0) {
    throw new AppError(
      500,
      "META_GRAPH_FIELDS is not configured",
      "META_CONFIG_MISSING",
    );
  }

  async function fetchLead(leadgenId) {
    if (!accessToken) {
      throw new AppError(
        500,
        "META_ACCESS_TOKEN is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!leadgenId) {
      throw new AppError(400, "leadgen_id is required", "META_LEAD_ID_MISSING");
    }

    const url = new URL(
      `${baseUrl}/${version}/${encodeURIComponent(String(leadgenId))}`,
    );
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", fields.join(","));

    let response;
    try {
      response = await fetch(url.toString(), { method: "GET" });
    } catch (error) {
      logger?.error({ err: error, leadgenId }, "Meta Graph API request failed");
      throw new AppError(
        502,
        "Unable to reach Meta Graph API",
        "META_GRAPH_UNREACHABLE",
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      logger?.warn(
        { err: error, leadgenId, status: response.status },
        "Meta Graph API returned a non-JSON response",
      );
    }

    if (!response.ok) {
      logger?.warn(
        { status: response.status, payload, leadgenId },
        "Meta Graph API responded with an error",
      );
      throw new AppError(502, "Failed to fetch Meta lead", "META_GRAPH_ERROR", {
        status: response.status,
        payload,
      });
    }

    return payload;
  }

  return Object.freeze({ fetchLead });
}

export { createMetaApi };
