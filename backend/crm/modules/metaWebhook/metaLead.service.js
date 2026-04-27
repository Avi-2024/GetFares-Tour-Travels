import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";

const META_SOURCE = "Meta Lead Ads";
const META_UTM_SOURCE = "meta";
const META_UTM_MEDIUM = "lead_ads";
const GRAPH_FETCH_RETRY_LIMIT = 3;
const GRAPH_FETCH_RETRY_DELAYS_MS = [250, 750];

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

function normalizeCampaignCountry(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  if (/^india$/i.test(normalized)) {
    return "India";
  }

  if (/^(uae|united arab emirates)$/i.test(normalized)) {
    return "UAE";
  }

  return normalized;
}

function normalizeLeadgenId(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^l:/i, "");
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
    const normalized = normalizeValue(value);
    if (normalized) {
      acc[key] = normalized;
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

function buildNotes(metaLead = {}, leadgenId, event = {}) {
  const parts = [];
  if (leadgenId) {
    parts.push(`leadgen_id=${leadgenId}`);
  }
  if (event.pageId || metaLead.page_id) {
    parts.push(`page_id=${event.pageId || metaLead.page_id}`);
  }
  if (metaLead.form_id || event.formId) {
    parts.push(`form_id=${metaLead.form_id || event.formId}`);
  }
  if (metaLead.ad_id || event.adId) {
    parts.push(`ad_id=${metaLead.ad_id || event.adId}`);
  }
  if (metaLead.adset_id || event.adsetId) {
    parts.push(`adset_id=${metaLead.adset_id || event.adsetId}`);
  }
  if (metaLead.campaign_id || event.campaignId) {
    parts.push(`campaign_id=${metaLead.campaign_id || event.campaignId}`);
  }

  return parts.length ? `Meta Lead Ads | ${parts.join(" | ")}` : null;
}

function extractLeadgenEvents(payload = {}) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const seen = new Set();
  const events = [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    changes.forEach((change) => {
      if (change?.field !== "leadgen") {
        return;
      }

      const leadgenId = normalizeLeadgenId(
        change?.value?.leadgen_id || change?.value?.leadgenId || null,
      );
      if (!leadgenId) {
        return;
      }

      const event = {
        leadgenId: String(leadgenId),
        pageId: normalizeValue(change?.value?.page_id || entry?.id || null),
        formId: normalizeValue(change?.value?.form_id || null),
        adId: normalizeValue(change?.value?.ad_id || null),
        adsetId: normalizeValue(change?.value?.adset_id || null),
        campaignId: normalizeValue(change?.value?.campaign_id || null),
      };
      const eventKey = `${event.pageId || "unknown"}:${event.leadgenId}`;
      if (seen.has(eventKey)) {
        return;
      }
      seen.add(eventKey);
      event.eventKey = eventKey;
      events.push(event);
    });
  });

  return events;
}

function buildLeadPayload(metaLead = {}, event = {}, pageConfig = {}, campaign = null) {
  const fields = flattenFieldData(metaLead.field_data);
  const email = pickFirst(fields, EMAIL_KEYS);
  const phone = pickFirst(fields, PHONE_KEYS);
  const fullName = pickFirst(fields, FULL_NAME_KEYS);
  const firstName = pickFirst(fields, FIRST_NAME_KEYS);
  const lastName = pickFirst(fields, LAST_NAME_KEYS);
  const metaCampaignId = String(
    metaLead.campaign_id || event.campaignId || "",
  ).trim() || null;

  return {
    fullName: deriveFullName({
      fullName,
      firstName,
      lastName,
      email,
      phone,
      hint: event.leadgenId,
    }),
    email,
    phone,
    source: pageConfig.sourceLabel || META_SOURCE,
    leadCountry: pageConfig.countryName || null,
    country: pageConfig.countryName || null,
    countryId: pageConfig.countryId || null,
    campaignId: campaign?.id || null,
    metaLeadId: event.leadgenId,
    metaPageId: event.pageId || metaLead.page_id || null,
    metaFormId: metaLead.form_id || event.formId || null,
    metaAdId: metaLead.ad_id || event.adId || null,
    metaAdsetId: metaLead.adset_id || event.adsetId || null,
    metaCampaignId,
    allowDuplicate: true,
    utmSource: META_UTM_SOURCE,
    utmMedium: META_UTM_MEDIUM,
    utmCampaign: metaCampaignId,
    notes: buildNotes(metaLead, event.leadgenId, event),
  };
}

function isUniqueViolation(error) {
  return Boolean(error && typeof error === "object" && error.code === "23505");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function summarizePageConfig(pageConfig = {}) {
  if (!pageConfig) {
    return null;
  }

  return {
    pageId: pageConfig.pageId || null,
    pageName: pageConfig.pageName || null,
    countryId: pageConfig.countryId || null,
    countryCode: pageConfig.countryCode || null,
    countryName: pageConfig.countryName || null,
    sourceLabel: pageConfig.sourceLabel || null,
  };
}

function mergeByKey(items = [], key) {
  const mapped = new Map();

  items.filter(Boolean).forEach((item) => {
    const itemKey = String(item?.[key] || "").trim();
    if (itemKey) {
      mapped.set(itemKey, item);
    }
  });

  return [...mapped.values()];
}

function buildAutoCampaignName({
  metaCampaignId,
  pageConfig = {}, 
  campaignDetails = null,
}) {
  const fetchedName = normalizeValue(campaignDetails?.name);
  if (fetchedName) {
    return fetchedName;
  }

  const countryName = normalizeCampaignCountry(pageConfig.countryName);
  const pageName = normalizeValue(pageConfig.pageName);
  const suffix = String(metaCampaignId || "").slice(-6) || "auto";

  if (countryName) {
    return `${countryName} Meta Campaign ${suffix}`;
  }

  if (pageName) {
    return `${pageName} Campaign ${suffix}`;
  }

  return `Meta Campaign ${suffix}`;
}

function summarizeCampaignRecord(campaign = null) {
  if (!campaign) {
    return null;
  }

  return {
    id: campaign.id || null,
    name: campaign.name || null,
    country: campaign.country || null,
    source: campaign.source || null,
    metaCampaignId: campaign.meta_campaign_id ?? campaign.metaCampaignId ?? null,
  };
}

function parseMetaMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round((numeric / 100) * 100) / 100;
}

function parseMetaMetric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

function parseDateOnly(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseLeadActionsCount(actions = []) {
  if (!Array.isArray(actions)) {
    return 0;
  }

  const leadActionTypes = new Set([
    "lead",
    "leadgen.other",
    "omni_lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);

  return actions.reduce((total, action) => {
    const actionType = String(action?.action_type || "").trim();
    if (!leadActionTypes.has(actionType)) {
      return total;
    }

    return total + parseMetaMetric(action?.value);
  }, 0);
}

function buildCampaignSyncPayload({
  metaCampaignId,
  pageConfig = {},
  campaignDetails = null,
  campaignInsights = null,
}) {
  const budgetValue =
    normalizeValue(campaignDetails?.lifetime_budget) ||
    normalizeValue(campaignDetails?.daily_budget) ||
    null;

  return {
    name: buildAutoCampaignName({
      metaCampaignId,
      pageConfig,
      campaignDetails,
    }),
    country: normalizeCampaignCountry(pageConfig.countryName),
    source: "META",
    budget: budgetValue ? parseMetaMoney(budgetValue) : 0,
    actualSpend: parseMetaMetric(campaignInsights?.spend),
    leadsGenerated: parseLeadActionsCount(campaignInsights?.actions),
    revenueGenerated: 0,
    metaCampaignId,
    startDate: parseDateOnly(campaignDetails?.start_time),
    endDate: parseDateOnly(campaignDetails?.stop_time),
  };
}

function createMetaLeadService({
  repository,
  leadsService,
  metaApi,
  logger,
  config,
}) {
  const verifyToken = config?.meta?.verifyToken;
  const appSecret = config?.meta?.appSecret;
  const allowInsecureWebhooks = config?.meta?.allowInsecureWebhooks === true;
  const envPages = Array.isArray(config?.meta?.pages) ? config.meta.pages : [];

  async function listConfiguredPages() {
    const repositoryPages =
      repository?.listActivePageConfigs ? await repository.listActivePageConfigs() : [];
    return mergeByKey([...envPages, ...repositoryPages], "pageId");
  }

  async function resolvePageConfig(pageId) {
    const normalizedPageId = String(pageId || "").trim();
    if (!normalizedPageId) {
      return null;
    }

    const envPage =
      envPages.find(
        (page) => String(page?.pageId || "").trim() === normalizedPageId,
      ) || null;
    if (envPage) {
      return envPage;
    }

    return repository?.findPageConfigByPageId ?
        repository.findPageConfigByPageId(normalizedPageId)
      : null;
  }

  async function verifyWebhook(query = {}) {
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

    const tokens = new Set();
    if (verifyToken) {
      tokens.add(String(verifyToken));
    }

    const pageConfigs = await listConfiguredPages();
    pageConfigs.forEach((pageConfig) => {
      if (pageConfig?.verifyToken) {
        tokens.add(String(pageConfig.verifyToken));
      }
    });

    if (!tokens.size) {
      throw new AppError(
        500,
        "META_VERIFY_TOKEN is not configured",
        "META_CONFIG_MISSING",
      );
    }

    if (!tokens.has(String(token))) {
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

  function extractPageIds(payload = {}) {
    return extractLeadgenEvents(payload)
      .map((item) => item.pageId)
      .filter(Boolean);
  }

  function isValidSignature(rawBody, signatureHeader, secrets = []) {
    if (!secrets.length) {
      return true;
    }

    if (!rawBody || !signatureHeader) {
      return false;
    }

    const signature = String(signatureHeader).replace("sha256=", "");
    return secrets.some((secret) => {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (signature.length !== expected.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    });
  }

  async function getSignatureSecrets(payload = {}) {
    const secrets = new Set();
    if (appSecret) {
      secrets.add(String(appSecret));
    }

    const pageIds = extractPageIds(payload);
    for (const pageId of pageIds) {
      const pageConfig = await resolvePageConfig(pageId);
      if (pageConfig?.appSecret) {
        secrets.add(String(pageConfig.appSecret));
      }
    }

    if (!pageIds.length || !secrets.size) {
      const pageConfigs = await listConfiguredPages();
      pageConfigs.forEach((pageConfig) => {
        if (pageConfig?.appSecret) {
          secrets.add(String(pageConfig.appSecret));
        }
      });
    }

    return [...secrets];
  }

  async function assertSignature(rawBody, signatureHeader, payload = {}) {
    if (allowInsecureWebhooks) {
      return;
    }

    const secrets = await getSignatureSecrets(payload);
    if (!secrets.length) {
      return;
    }

    if (!isValidSignature(rawBody, signatureHeader, secrets)) {
      throw new AppError(403, "Invalid signature", "META_SIGNATURE_INVALID");
    }
  }

  async function fetchLeadWithRetry(leadgenId, pageConfig = {}) {
    let lastError = null;

    for (let attempt = 0; attempt < GRAPH_FETCH_RETRY_LIMIT; attempt += 1) {
      try {
        return await metaApi.fetchLead(leadgenId, {
          accessToken: pageConfig.accessToken,
          graphBaseUrl: pageConfig.graphBaseUrl,
          graphVersion: pageConfig.graphVersion,
          graphFields: pageConfig.graphFields,
        });
      } catch (error) {
        lastError = error;
        if (attempt >= GRAPH_FETCH_RETRY_LIMIT - 1) {
          break;
        }
        const waitMs = GRAPH_FETCH_RETRY_DELAYS_MS[attempt] ?? 1000;
        await delay(waitMs);
      }
    }

    throw lastError;
  }

  async function fetchCampaignDetails(metaCampaignId, pageConfig = {}) {
    if (!metaCampaignId) {
      return null;
    }

    try {
      return await metaApi.fetchCampaign(metaCampaignId, {
        accessToken: pageConfig.accessToken,
        graphBaseUrl: pageConfig.graphBaseUrl,
        graphVersion: pageConfig.graphVersion,
      });
    } catch (error) {
      logger?.warn(
        { err: error, metaCampaignId, pageId: pageConfig.pageId || null },
        "Failed to fetch Meta campaign details; falling back to generated campaign name",
      );
      return null;
    }
  }

  async function fetchCampaignInsights(metaCampaignId, pageConfig = {}) {
    if (!metaCampaignId) {
      return null;
    }

    try {
      return await metaApi.fetchCampaignInsights(metaCampaignId, {
        accessToken: pageConfig.accessToken,
        graphBaseUrl: pageConfig.graphBaseUrl,
        graphVersion: pageConfig.graphVersion,
      });
    } catch (error) {
      logger?.warn(
        { err: error, metaCampaignId, pageId: pageConfig.pageId || null },
        "Failed to fetch Meta campaign insights; falling back to zero metrics",
      );
      return null;
    }
  }

  async function ensureCampaignRecord(metaLead = {}, event = {}, pageConfig = {}) {
    const metaCampaignId = normalizeValue(metaLead.campaign_id || event.campaignId);
    if (!metaCampaignId) {
      logger?.debug(
        {
          leadgenId: event.leadgenId || null,
          pageId: event.pageId || null,
        },
        "Meta webhook event did not include campaign_id; skipping campaign auto-create",
      );
      return null;
    }

    logger?.debug(
      {
        leadgenId: event.leadgenId || null,
        metaCampaignId,
        pageId: pageConfig.pageId || event.pageId || null,
        country: normalizeCampaignCountry(pageConfig.countryName),
      },
      "Resolving CRM campaign for Meta campaign id",
    );

    const campaignDetails = await fetchCampaignDetails(metaCampaignId, pageConfig);
    const campaignInsights = await fetchCampaignInsights(metaCampaignId, pageConfig);
    logger?.debug(
      {
        leadgenId: event.leadgenId || null,
        metaCampaignId,
        fetchedCampaignName: normalizeValue(campaignDetails?.name),
        fetchedCampaignStatus:
          normalizeValue(campaignDetails?.effective_status) ||
          normalizeValue(campaignDetails?.status),
        fetchedCampaignSpend: parseMetaMetric(campaignInsights?.spend),
        fetchedCampaignLeads: parseLeadActionsCount(campaignInsights?.actions),
      },
      "Meta campaign details fetch finished",
    );

    const payload = buildCampaignSyncPayload({
      metaCampaignId,
      pageConfig,
      campaignDetails,
      campaignInsights,
    });

    const existing = await repository.findCampaignByMetaCampaignId(metaCampaignId);
    if (existing?.id) {
      logger?.debug(
        {
          leadgenId: event.leadgenId || null,
          metaCampaignId,
          campaign: summarizeCampaignRecord(existing),
          syncPayload: payload,
        },
        "Updating existing CRM campaign from Meta campaign data",
      );
      try {
        return await repository.updateCampaign(existing.id, payload);
      } catch (error) {
        logger?.warn(
          { err: error, metaCampaignId, existingId: existing.id, payload },
          "Failed to sync existing campaign from Meta webhook",
        );
        return existing;
      }
    }

    logger?.debug(
      {
        leadgenId: event.leadgenId || null,
        metaCampaignId,
        payload,
      },
      "Creating CRM campaign from Meta webhook",
    );

    try {
      const created = await repository.createCampaign(payload);
      logger?.info(
        {
          metaCampaignId,
          campaignId: created?.id || null,
          country: payload.country,
          name: payload.name,
        },
        "Auto-created campaign from Meta webhook",
      );
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return repository.findCampaignByMetaCampaignId(metaCampaignId);
      }

      logger?.warn(
        { err: error, metaCampaignId, payload },
        "Failed to auto-create campaign from Meta webhook",
      );
      return null;
    }
  }

  async function ensureMetaAttributes(lead, payload, context) {
    if (!lead?.id) {
      return lead;
    }

    if (
      lead.metaLeadId === payload.metaLeadId &&
      lead.metaPageId === payload.metaPageId &&
      lead.metaFormId === payload.metaFormId &&
      lead.metaAdId === payload.metaAdId &&
      lead.metaAdsetId === payload.metaAdsetId &&
      lead.metaCampaignId === payload.metaCampaignId
    ) {
      return lead;
    }

    try {
      await repository.attachMetaAttributes(lead.id, payload);
      return await leadsService.getById(lead.id, context);
    } catch (error) {
      logger?.warn(
        { err: error, leadId: lead.id, payload },
        "Failed to attach Meta attributes to lead",
      );
      return lead;
    }
  }

  async function markWebhookEvent(eventRecord, payload = {}) {
    if (!eventRecord?.id) {
      return null;
    }

    return repository.updateWebhookEvent(eventRecord.id, {
      status: payload.status,
      errorCode: payload.errorCode || null,
      errorMessage: payload.errorMessage || null,
      processedAt: new Date().toISOString(),
    });
  }

  async function processLeadEvent(event, context) {
    const existingEvent = await repository.findWebhookEventByKey(event.eventKey);
    const eventRecord =
      existingEvent ||
      (await repository.createWebhookEvent({
        pageId: event.pageId,
        leadgenId: event.leadgenId,
        eventKey: event.eventKey,
        status: "RECEIVED",
        payloadJson: JSON.stringify(event),
      }));

    const existingLead = await repository.findByMetaLeadId(event.leadgenId);
    if (existingLead?.id) {
      const lead = await leadsService.getById(existingLead.id, context);
      await markWebhookEvent(eventRecord, { status: "DUPLICATE_META_LEAD" });
      return {
        leadgenId: event.leadgenId,
        lead,
        duplicate: true,
        skipped: false,
        reason: "meta_lead_id",
      };
    }

    const pageConfig = await resolvePageConfig(event.pageId);
    if (!pageConfig) {
      logger?.warn(
        {
          pageId: event.pageId || null,
          leadgenId: event.leadgenId,
          eventKey: event.eventKey,
        },
        "Meta webhook event quarantined because page config was not found",
      );
      await markWebhookEvent(eventRecord, {
        status: "QUARANTINED_UNKNOWN_PAGE",
        errorCode: "META_PAGE_CONFIG_MISSING",
        errorMessage: `No active Meta page config for page_id=${event.pageId || "unknown"}`,
      });
      return {
        leadgenId: event.leadgenId,
        lead: null,
        duplicate: false,
        skipped: true,
        reason: "unknown_page",
      };
    }

    logger?.info(
      {
        leadgenId: event.leadgenId,
        eventKey: event.eventKey,
        pageConfig: summarizePageConfig(pageConfig),
      },
      "Meta webhook resolved page config",
    );

    const metaLead = await fetchLeadWithRetry(event.leadgenId, pageConfig);
    logger?.debug(
      {
        leadgenId: event.leadgenId,
        pageId: event.pageId || null,
        metaCampaignId:
          normalizeValue(metaLead?.campaign_id) || normalizeValue(event.campaignId),
        metaAdsetId:
          normalizeValue(metaLead?.adset_id) || normalizeValue(event.adsetId),
        metaAdId: normalizeValue(metaLead?.ad_id) || normalizeValue(event.adId),
        metaFormId:
          normalizeValue(metaLead?.form_id) || normalizeValue(event.formId),
      },
      "Fetched Meta lead payload for webhook event",
    );
    const campaign = await ensureCampaignRecord(metaLead, event, pageConfig);
    const payload = buildLeadPayload(metaLead, event, pageConfig, campaign);
    logger?.debug(
      {
        leadgenId: event.leadgenId,
        campaign: summarizeCampaignRecord(campaign),
        leadCountry: payload.leadCountry || null,
        source: payload.source || null,
        metaCampaignId: payload.metaCampaignId || null,
      },
      "Built lead payload from Meta webhook event",
    );

    try {
      const result = await leadsService.createOrGetDuplicate(payload, context);
      const lead = await ensureMetaAttributes(result.lead, payload, context);
      await markWebhookEvent(eventRecord, {
        status: result.duplicate ? "DUPLICATE_CONTACT" : "PROCESSED",
      });
      return {
        leadgenId: event.leadgenId,
        lead,
        duplicate: result.duplicate,
        skipped: false,
        reason: result.duplicate ? "contact" : null,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existingByMeta = await repository.findByMetaLeadId(event.leadgenId);
        if (existingByMeta?.id) {
          const lead = await leadsService.getById(existingByMeta.id, context);
          await markWebhookEvent(eventRecord, { status: "DUPLICATE_META_LEAD" });
          return {
            leadgenId: event.leadgenId,
            lead,
            duplicate: true,
            skipped: false,
            reason: "meta_lead_id",
          };
        }
      }

      await markWebhookEvent(eventRecord, {
        status: "FAILED",
        errorCode: error.code || "META_PROCESSING_FAILED",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async function handleWebhook(payload, context = {}, signatureHeader) {
    await assertSignature(context.rawBody, signatureHeader, payload);

    if (!payload || typeof payload !== "object") {
      throw new AppError(400, "Invalid webhook payload", "META_PAYLOAD_INVALID");
    }

    if (payload.object && payload.object !== "page") {
      logger?.warn(
        { object: payload.object },
        "Unexpected Meta webhook object type",
      );
    }

    const leadEvents = extractLeadgenEvents(payload);
    if (!leadEvents.length) {
      logger?.warn(
        { payloadSummary: { object: payload.object } },
        "Meta webhook payload did not include leadgen_id",
      );
      return {
        processed: 0,
        duplicates: 0,
        skipped: 0,
        leads: [],
      };
    }

    const serviceContext = {
      user: null,
      requestId: context.requestId || null,
      origin: "meta_webhook",
    };

    const results = [];
    const errors = [];

    for (const event of leadEvents) {
      try {
        const result = await processLeadEvent(event, serviceContext);
        results.push(result);
      } catch (error) {
        errors.push({
          leadgenId: event.leadgenId,
          message: error.message,
          code: error.code || "UNKNOWN",
          details: error.details || null,
        });
        logger?.error(
          { err: error, pageId: event.pageId, leadgenId: event.leadgenId },
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
      processed: results.filter((item) => !item.skipped).length,
      duplicates: results.filter((item) => item.duplicate).length,
      skipped: results.filter((item) => item.skipped).length,
      leads: results,
    };
  }

  return Object.freeze({
    verifyWebhook,
    handleWebhook,
  });
}

export { createMetaLeadService };
