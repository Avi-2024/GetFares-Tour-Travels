import { AppError } from "../../core/errors/index.js";

const META_SOURCE = "Meta Lead Ads";
const META_UTM_SOURCE = "meta";
const META_UTM_MEDIUM = "lead_ads";

const EMAIL_KEYS = ["email", "email_address", "emailaddress"];
const PHONE_KEYS = [
  "phone_number",
  "phone",
  "mobile_phone",
  "mobile",
  "whatsapp_number",
  "whatsapp",
];
const FULL_NAME_KEYS = ["full_name", "fullname", "name"];
const FIRST_NAME_KEYS = ["first_name", "firstname", "first"];
const LAST_NAME_KEYS = ["last_name", "lastname", "last", "surname"];

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length ? text : null;
}

function flattenFieldData(fieldData = []) {
  if (!Array.isArray(fieldData)) {
    return {};
  }

  return fieldData.reduce((acc, entry) => {
    const key = normalizeKey(entry?.name);
    if (!key) {
      return acc;
    }

    const value = Array.isArray(entry?.values)
      ? entry.values[0]
      : entry?.values ?? entry?.value;
    const normalizedValue = normalizeValue(value);
    if (normalizedValue) {
      acc[key] = normalizedValue;
    }
    return acc;
  }, {});
}

function pickFirst(fields, keys) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    const value = fields[normalized];
    if (value) {
      return value;
    }
  }
  return null;
}

function deriveFullName({ fullName, firstName, lastName, email, phone, hint }) {
  if (fullName) {
    return fullName;
  }

  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (combined) {
    return combined;
  }

  if (email) {
    return email.split("@")[0];
  }

  if (phone) {
    return phone;
  }

  if (hint) {
    return `Meta Lead ${String(hint).slice(-6)}`;
  }

  return `Lead ${Date.now()}`;
}

function buildNotes(metaLead = {}, leadgenId) {
  const parts = [];
  if (leadgenId) {
    parts.push(`leadgen_id=${leadgenId}`);
  }
  if (metaLead.form_id) {
    parts.push(`form_id=${metaLead.form_id}`);
  }
  if (metaLead.ad_id) {
    parts.push(`ad_id=${metaLead.ad_id}`);
  }
  if (metaLead.adset_id) {
    parts.push(`adset_id=${metaLead.adset_id}`);
  }
  if (metaLead.campaign_id) {
    parts.push(`campaign_id=${metaLead.campaign_id}`);
  }

  return parts.length ? `Meta Lead Ads | ${parts.join(" | ")}` : null;
}

function buildLeadPayload(metaLead = {}, leadgenId) {
  const fields = flattenFieldData(metaLead.field_data);
  const email = pickFirst(fields, EMAIL_KEYS);
  const phone = pickFirst(fields, PHONE_KEYS);
  const fullName = pickFirst(fields, FULL_NAME_KEYS);
  const firstName = pickFirst(fields, FIRST_NAME_KEYS);
  const lastName = pickFirst(fields, LAST_NAME_KEYS);

  return {
    fullName: deriveFullName({
      fullName,
      firstName,
      lastName,
      email,
      phone,
      hint: leadgenId,
    }),
    email,
    phone,
    source: META_SOURCE,
    metaLeadId: leadgenId,
    utmSource: META_UTM_SOURCE,
    utmMedium: META_UTM_MEDIUM,
    utmCampaign: metaLead.campaign_id ? String(metaLead.campaign_id) : null,
    notes: buildNotes(metaLead, leadgenId),
  };
}

function extractLeadgenIds(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const ids = [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    changes.forEach((change) => {
      if (change?.field !== "leadgen") {
        return;
      }
      const leadgenId =
        change?.value?.leadgen_id || change?.value?.leadgenId;
      if (leadgenId) {
        ids.push(String(leadgenId));
      }
    });
  });

  return [...new Set(ids)];
}

function isUniqueViolation(error) {
  return Boolean(error && typeof error === "object" && error.code === "23505");
}

function createMetaLeadService({
  repository,
  leadsService,
  metaApi,
  logger,
  config,
}) {
  const verifyToken = config?.meta?.verifyToken;

  function verifyWebhook(query = {}) {
    if (!verifyToken) {
      throw new AppError(
        500,
        "META_VERIFY_TOKEN is not configured",
        "META_CONFIG_MISSING",
      );
    }

    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (!mode || !token) {
      throw new AppError(
        400,
        "Missing webhook verification parameters",
        "META_WEBHOOK_INVALID",
      );
    }

    if (mode !== "subscribe") {
      throw new AppError(400, "Invalid hub.mode", "META_WEBHOOK_INVALID");
    }

    if (token !== verifyToken) {
      throw new AppError(403, "Invalid verify token", "META_WEBHOOK_DENIED");
    }

    if (!challenge) {
      throw new AppError(
        400,
        "Missing hub.challenge",
        "META_WEBHOOK_INVALID",
      );
    }

    return challenge;
  }

  async function ensureMetaLeadId(lead, leadgenId, context) {
    if (!lead?.id || lead?.metaLeadId) {
      return lead;
    }

    try {
      await repository.attachMetaLeadId(lead.id, leadgenId);
      return await leadsService.getById(lead.id, context);
    } catch (error) {
      logger?.warn(
        { err: error, leadId: lead.id, leadgenId },
        "Failed to attach Meta lead id to duplicate lead",
      );
      return lead;
    }
  }

  async function processLeadgenId(leadgenId, context) {
    const existing = await repository.findByMetaLeadId(leadgenId);
    if (existing?.id) {
      const lead = await leadsService.getById(existing.id, context);
      return {
        leadgenId,
        lead,
        duplicate: true,
        reason: "meta_lead_id",
      };
    }

    const metaLead = await metaApi.fetchLead(leadgenId);
    const payload = buildLeadPayload(metaLead, leadgenId);

    try {
      const result = await leadsService.createOrGetDuplicate(payload, context);
      const lead = await ensureMetaLeadId(result.lead, leadgenId, context);
      return {
        leadgenId,
        lead,
        duplicate: result.duplicate,
        reason: result.duplicate ? "email_or_phone" : null,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existingByMeta = await repository.findByMetaLeadId(leadgenId);
        if (existingByMeta?.id) {
          const lead = await leadsService.getById(existingByMeta.id, context);
          return {
            leadgenId,
            lead,
            duplicate: true,
            reason: "meta_lead_id",
          };
        }
      }

      throw error;
    }
  }

  async function handleWebhook(payload, context = {}) {
    if (!payload || typeof payload !== "object") {
      throw new AppError(400, "Invalid webhook payload", "META_PAYLOAD_INVALID");
    }

    if (payload.object && payload.object !== "page") {
      logger?.warn(
        { object: payload.object },
        "Unexpected Meta webhook object type",
      );
    }

    const leadgenIds = extractLeadgenIds(payload);
    if (!leadgenIds.length) {
      logger?.warn(
        { payloadSummary: { object: payload.object } },
        "Meta webhook payload did not include leadgen_id",
      );
      return {
        processed: 0,
        duplicates: 0,
        leads: [],
      };
    }

    const results = [];
    const errors = [];

    const serviceContext = {
      user: null,
      requestId: context.requestId || null,
      origin: "meta_webhook",
    };

    for (const leadgenId of leadgenIds) {
      try {
        const result = await processLeadgenId(leadgenId, serviceContext);
        results.push(result);
      } catch (error) {
        errors.push({
          leadgenId,
          message: error.message,
          code: error.code || "UNKNOWN",
        });
        logger?.error(
          { err: error, leadgenId },
          "Meta lead processing failed",
        );
      }
    }

    if (errors.length) {
      throw new AppError(
        502,
        "Meta webhook processing failed",
        "META_WEBHOOK_PROCESSING_FAILED",
        { errors, processed: results.length },
      );
    }

    return {
      processed: results.length,
      duplicates: results.filter((item) => item.duplicate).length,
      leads: results,
    };
  }

  return Object.freeze({
    verifyWebhook,
    handleWebhook,
  });
}

export { createMetaLeadService };
