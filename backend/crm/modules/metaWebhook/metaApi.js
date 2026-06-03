import { AppError } from "../../core/errors/index.js";

const REQUIRED_LEAD_FIELDS = Object.freeze([
  "created_time",
  "field_data",
  "ad_id",
  "adset_id",
  "campaign_id",
  "form_id",
]);

function normalizeFields(value, requiredFields = []) {
  const rawFields =
    Array.isArray(value) ? value
    : typeof value === "string" ? value.split(",")
    : [];

  return Array.from(
    new Set(
      [...rawFields, ...requiredFields]
        .map((item) => String(item).trim())
        .filter(Boolean)
        .filter((item) => item !== "page_id"),
    ),
  );
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

function normalizeLeadgenId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^l:/i, "");
}

function normalizeObjectId(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function normalizeQueryValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
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
  const fields = normalizeFields(graphFields, REQUIRED_LEAD_FIELDS);

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

  function resolveRuntime(options = {}) {
    return {
      accessToken: options.accessToken || accessToken || null,
      baseUrl: normalizeBaseUrl(options.graphBaseUrl || baseUrl || null),
      version: normalizeVersion(options.graphVersion || version || null),
      fields: normalizeFields(options.graphFields || fields, REQUIRED_LEAD_FIELDS),
    };
  }

  async function parseResponse(response, context = {}) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      logger?.warn(
        { err: error, ...context, status: response.status },
        "Meta Graph API returned a non-JSON response",
      );
    }

    if (!response.ok) {
      logger?.warn(
        { status: response.status, payload, ...context },
        "Meta Graph API responded with an error",
      );
      throw new AppError(502, "Failed to fetch Meta object", "META_GRAPH_ERROR", {
        status: response.status,
        payload,
        objectId: context.normalizedObjectId || null,
      });
    }

    return payload;
  }

  async function fetchGraphObject(objectId, options = {}) {
    const runtime = resolveRuntime(options);
    const normalizedObjectId = normalizeObjectId(objectId);

    if (!runtime.accessToken) {
      throw new AppError(
        500,
        "META_ACCESS_TOKEN is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!normalizedObjectId) {
      throw new AppError(400, "Meta object id is required", "META_OBJECT_ID_MISSING");
    }

    if (!runtime.baseUrl) {
      throw new AppError(
        500,
        "META_GRAPH_BASE_URL is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!runtime.version) {
      throw new AppError(
        500,
        "META_GRAPH_VERSION is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!runtime.fields.length) {
      throw new AppError(
        500,
        "META_GRAPH_FIELDS is not configured",
        "META_CONFIG_MISSING",
      );
    }

    const url = new URL(
      `${runtime.baseUrl}/${runtime.version}/${encodeURIComponent(normalizedObjectId)}`,
    );
    url.searchParams.set("access_token", runtime.accessToken);
    url.searchParams.set("fields", runtime.fields.join(","));

    let response;
    try {
      response = await fetch(url.toString(), { method: "GET" });
    } catch (error) {
      logger?.error(
        { err: error, objectId, normalizedObjectId },
        "Meta Graph API request failed",
      );
      throw new AppError(
        502,
        "Unable to reach Meta Graph API",
        "META_GRAPH_UNREACHABLE",
      );
    }

    return parseResponse(response, { objectId, normalizedObjectId });
  }

  async function fetchGraphEdge(objectId, edge, query = {}, options = {}) {
    const runtime = resolveRuntime(options);
    const normalizedObjectId = normalizeObjectId(objectId);
    const normalizedEdge = normalizeObjectId(edge);

    if (!runtime.accessToken) {
      throw new AppError(
        500,
        "META_ACCESS_TOKEN is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!normalizedObjectId) {
      throw new AppError(400, "Meta object id is required", "META_OBJECT_ID_MISSING");
    }

    if (!normalizedEdge) {
      throw new AppError(400, "Meta edge is required", "META_EDGE_MISSING");
    }

    const url = new URL(
      `${runtime.baseUrl}/${runtime.version}/${encodeURIComponent(normalizedObjectId)}/${encodeURIComponent(normalizedEdge)}`,
    );
    url.searchParams.set("access_token", runtime.accessToken);

    Object.entries(query).forEach(([key, value]) => {
      const normalizedValue = normalizeQueryValue(value);
      if (normalizedValue) {
        url.searchParams.set(key, normalizedValue);
      }
    });

    let response;
    try {
      response = await fetch(url.toString(), { method: "GET" });
    } catch (error) {
      logger?.error(
        { err: error, objectId, edge: normalizedEdge, normalizedObjectId },
        "Meta Graph API edge request failed",
      );
      throw new AppError(
        502,
        "Unable to reach Meta Graph API",
        "META_GRAPH_UNREACHABLE",
      );
    }

    return parseResponse(response, {
      objectId,
      edge: normalizedEdge,
      normalizedObjectId,
    });
  }

  async function fetchLead(leadgenId, options = {}) {
    const normalizedLeadgenId = normalizeLeadgenId(leadgenId);
    if (!normalizedLeadgenId) {
      throw new AppError(400, "leadgen_id is required", "META_LEAD_ID_MISSING");
    }

    return fetchGraphObject(normalizedLeadgenId, options);
  }

  async function fetchCampaign(campaignId, options = {}) {
    const normalizedCampaignId = normalizeObjectId(campaignId);
    if (!normalizedCampaignId) {
      throw new AppError(
        400,
        "campaign_id is required",
        "META_CAMPAIGN_ID_MISSING",
      );
    }

    return fetchGraphObject(normalizedCampaignId, {
      ...options,
      graphFields: [
        "id",
        "name",
        "status",
        "effective_status",
        "daily_budget",
        "lifetime_budget",
        "objective",
        "start_time",
        "stop_time",
      ],
    });
  }

  async function fetchCampaignInsights(campaignId, options = {}) {
    const normalizedCampaignId = normalizeObjectId(campaignId);
    if (!normalizedCampaignId) {
      throw new AppError(
        400,
        "campaign_id is required",
        "META_CAMPAIGN_ID_MISSING",
      );
    }

    const payload = await fetchGraphEdge(
      normalizedCampaignId,
      "insights",
      {
        fields: [
          "spend",
          "impressions",
          "reach",
          "clicks",
          "ctr",
          "cpc",
          "cpm",
          "actions",
        ].join(","),
        date_preset: "maximum",
        limit: "1",
      },
      options,
    );

    return Array.isArray(payload?.data) ? (payload.data[0] || null) : null;
  }

  return Object.freeze({ fetchLead, fetchCampaign, fetchCampaignInsights });
}

export { createMetaApi };
