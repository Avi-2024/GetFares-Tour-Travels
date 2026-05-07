import { AppError } from "../../core/errors/index.js";

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

function createWhatsAppApi({
  accessToken,
  baseUrl,
  version,
  phoneNumberId,
  logger,
} = {}) {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const apiVersion = normalizeVersion(version);

  if (!apiBaseUrl) {
    throw new AppError(
      500,
      "WHATSAPP_API_BASE_URL is not configured",
      "WHATSAPP_CONFIG_MISSING",
    );
  }

  if (!apiVersion) {
    throw new AppError(
      500,
      "WHATSAPP_API_VERSION is not configured",
      "WHATSAPP_CONFIG_MISSING",
    );
  }

  function resolveRuntimeChannel(overrides = {}) {
    return {
      accessToken: overrides.accessToken || accessToken || null,
      phoneNumberId: overrides.phoneNumberId || phoneNumberId || null,
      apiBaseUrl: normalizeBaseUrl(overrides.apiBaseUrl || apiBaseUrl || null),
      apiVersion: normalizeVersion(overrides.apiVersion || apiVersion || null),
    };
  }

  async function sendMessage(payload, channel = {}) {
    const runtime = resolveRuntimeChannel(channel);

    if (!runtime.accessToken) {
      throw new AppError(
        500,
        "WHATSAPP_ACCESS_TOKEN is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    if (!runtime.phoneNumberId) {
      throw new AppError(
        500,
        "WHATSAPP_PHONE_NUMBER_ID is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    if (!runtime.apiBaseUrl) {
      throw new AppError(
        500,
        "WHATSAPP_API_BASE_URL is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    if (!runtime.apiVersion) {
      throw new AppError(
        500,
        "WHATSAPP_API_VERSION is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    const url =
      `${runtime.apiBaseUrl}/${runtime.apiVersion}/${runtime.phoneNumberId}/messages`;

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtime.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger?.error({ err: error }, "WhatsApp API request failed");
      throw new AppError(
        502,
        "Unable to reach WhatsApp API",
        "WHATSAPP_API_UNREACHABLE",
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      logger?.warn({ err: error }, "WhatsApp API returned non-JSON response");
    }

    if (!response.ok) {
      logger?.warn(
        { status: response.status, data },
        "WhatsApp API responded with an error",
      );
      throw new AppError(502, "WhatsApp API error", "WHATSAPP_API_ERROR", {
        status: response.status,
        data,
      });
    }

    return data;
  }

  return Object.freeze({ sendMessage });
}

export { createWhatsAppApi };
