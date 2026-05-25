import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";
import {
  ianaFromLeadCountry,
  localWallClockFromUtc,
  normalizeIANATimezone,
  toUtc,
} from "../../core/datetime/timezone.js";
import { getWebhookFileLogger } from "./webhookFileLogger.js";
import { LeadFieldsUtils } from "../leads/leadFields.utils.js";
import { resolveMetaLeadRoutingRule } from "./metaLeadRouting.rules.js";

const META_SOURCE = "Meta Lead Ads";

function normalizeMetaId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace(/^[a-z_]+:/i, "");
}
const META_UTM_SOURCE = "meta";
const META_UTM_MEDIUM = "lead_ads";
const GRAPH_FETCH_RETRY_LIMIT = 3;
const GRAPH_FETCH_RETRY_DELAYS_MS = [250, 750];

const { normalizeFieldValue: normalizeValue, deriveFullName } = LeadFieldsUtils;

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

/** Meta page config → CRM lead_country + client_currency (India INR, UAE AED). */
function resolveMetaLeadCountryAndCurrency(pageConfig = {}) {
  const countryCode = String(pageConfig.countryCode || "")
    .trim()
    .toUpperCase();
  const countryLabel = normalizeCampaignCountry(pageConfig.countryName);

  if (countryCode === "AE" || countryLabel === "UAE") {
    return {
      leadCountry: "United Arab Emirates",
      clientCurrency: "AED",
    };
  }

  if (countryCode === "IN" || countryLabel === "India") {
    return {
      leadCountry: "India",
      clientCurrency: "INR",
    };
  }

  if (countryLabel === "UAE") {
    return {
      leadCountry: "United Arab Emirates",
      clientCurrency: "AED",
    };
  }

  if (countryLabel === "India") {
    return {
      leadCountry: "India",
      clientCurrency: "INR",
    };
  }

  return {
    leadCountry: countryLabel || pageConfig.countryName || null,
    clientCurrency: null,
  };
}

function normalizeLeadgenId(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^l:/i, "");
}

// flattenMetaFieldData, pickFirst, deriveFullName moved to shared utilities.

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

async function buildLeadPayload(
  metaLead = {},
  event = {},
  pageConfig = {},
  campaign = null,
  mappingResolver = null,
) {
  const metaCampaignId = String(
    metaLead.campaign_id || event.campaignId || "",
  ).trim() || null;
  const metaPageId = normalizeMetaId(event.pageId || metaLead.page_id || null);
  const metaFormId = normalizeMetaId(metaLead.form_id || event.formId || null);
  const metaAdId = normalizeMetaId(metaLead.ad_id || event.adId || null);

  const routingRule = resolveMetaLeadRoutingRule({
    metaPageId,
    metaFormId,
    metaAdId,
  });
  const legacyAssign = routingRule?.assign || {};

  const scope = {
    metaAdId,
    metaFormId,
    metaCampaignId,
    metaPageId,
    metaLeadId: event.leadgenId,
  };

  const mapped = mappingResolver ?
      await mappingResolver.resolveAndApply({
        fieldData: metaLead.field_data,
        scope,
        useLegacyFallback: true,
      })
    : null;

  const mappedPayload = mapped?.payload || {};
  const profileAssign = mapped?.profileAssign || {};
  const pageDefaults = resolveMetaLeadCountryAndCurrency(pageConfig);

  const email = mappedPayload.email || null;
  const phone = mappedPayload.phone || null;

  const leadCountry =
    profileAssign.leadCountry ||
    mappedPayload.leadCountry ||
    pageDefaults.leadCountry ||
    null;

  const clientCurrency =
    profileAssign.clientCurrency ||
    mappedPayload.clientCurrency ||
    pageDefaults.clientCurrency ||
    null;

  const leadWallTz = ianaFromLeadCountry(leadCountry || pageConfig.countryName);
  const metaUtc = toUtc(metaLead.created_time);
  const clientCreatedAt =
    metaUtc ? localWallClockFromUtc(metaUtc, leadWallTz) : null;
  const clientTimezone = normalizeIANATimezone(leadWallTz) || leadWallTz;

  return {
    fullName: deriveFullName({
      fullName: mappedPayload.fullName,
      email,
      phone,
      hint: event.leadgenId,
    }),
    email,
    phone,
    city: mappedPayload.city || null,
    nationality: mappedPayload.nationality || null,
    travelTo: mappedPayload.travelTo || null,
    destinationName: mappedPayload.destinationName || mappedPayload.travelTo || null,
    travelPurpose: mappedPayload.travelPurpose || null,
    budget: mappedPayload.budget ?? null,
    visaRequired: mappedPayload.visaRequired,
    clientCurrency,
    platform: mappedPayload.platform || "meta",
    campaignName: mappedPayload.campaignName || campaign?.name || null,
    adName:
      mappedPayload.adName ||
      normalizeValue(metaLead.ad_name ?? metaLead.adName ?? null),
    source:
      profileAssign.sourceLabel ||
      legacyAssign.source ||
      pageConfig.sourceLabel ||
      META_SOURCE,
    leadType:
      profileAssign.leadType ||
      mappedPayload.leadType ||
      legacyAssign.leadType ||
      null,
    leadCountry,
    country: leadCountry,
    countryId: pageConfig.countryId || null,
    campaignId: campaign?.id || null,
    metaLeadId: event.leadgenId,
    metaPageId,
    metaFormId,
    metaAdId,
    metaAdsetId: metaLead.adset_id || event.adsetId || null,
    metaCampaignId,
    clientCreatedAt,
    clientTimezone,
    allowDuplicate: true,
    utmSource: META_UTM_SOURCE,
    utmMedium: META_UTM_MEDIUM,
    utmCampaign: metaCampaignId,
    notes: buildNotes(metaLead, event.leadgenId, event),
    dynamicFields: mapped?.dynamic || {},
    dynamicFieldLabels: mapped?.dynamicLabels || {},
    metaMappingProfileId: mapped?.matchedProfileId || null,
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
  mappingResolver = null,
  pageConfigProvider = null,
}) {
  const fileLogger = getWebhookFileLogger();
  // All Meta config is DB-driven (set in Meta Configuration admin panel).
  // Only allowInsecureWebhooks falls back to env as a last resort.
  const envAllowInsecure = config?.meta?.allowInsecureWebhooks === true;

  async function getIntegrationSettings() {
    if (pageConfigProvider?.getResolvedIntegrationForWebhook) {
      return pageConfigProvider.getResolvedIntegrationForWebhook();
    }
    // Fallback: env vars (deprecated — configure via admin panel instead)
    return {
      verifyToken: config?.meta?.verifyToken || null,
      appSecret: config?.meta?.appSecret || null,
      allowInsecureWebhooks: envAllowInsecure,
    };
  }

  async function allowInsecureWebhooksEnabled() {
    const integration = await getIntegrationSettings();
    return integration.allowInsecureWebhooks === true || envAllowInsecure;
  }

  fileLogger.logServiceInitialization({
    source: "db",
    allowInsecureWebhooks: envAllowInsecure,
  });

  async function listConfiguredPages() {
    if (pageConfigProvider?.listActivePagesForWebhook) {
      return pageConfigProvider.listActivePagesForWebhook();
    }
    if (repository?.listActivePageConfigs) {
      return repository.listActivePageConfigs();
    }
    return [];
  }

  async function resolvePageConfig(pageId) {
    const normalizedPageId = String(pageId || "").trim();
    if (!normalizedPageId) {
      fileLogger.error("Empty Page ID", { pageId });
      return null;
    }
    const page =
      pageConfigProvider?.findPageConfigForWebhook ?
        await pageConfigProvider.findPageConfigForWebhook(normalizedPageId)
      : repository?.findPageConfigByPageId ?
        await repository.findPageConfigByPageId(normalizedPageId)
      : null;

    fileLogger.logPageConfigResolution(normalizedPageId, !!page, page ?? undefined);
    return page;
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

    const integration = await getIntegrationSettings();
    const tokens = new Set();
    if (integration.verifyToken) {
      tokens.add(String(integration.verifyToken));
    } else if (verifyToken) {
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
    const integration = await getIntegrationSettings();
    const secrets = new Set();
    if (integration.appSecret) {
      secrets.add(String(integration.appSecret));
    } else if (appSecret) {
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
   
    
    if (await allowInsecureWebhooksEnabled()) {
      console.log("Skipping signature validation (insecure mode enabled)");
      fileLogger.info("Signature Validation Skipped", { reason: "insecure_mode" });
      return;
    }

    const secrets = await getSignatureSecrets(payload);
    
    if (!secrets.length) {
      fileLogger.info("Signature Validation Skipped", { reason: "no_secrets" });
      return;
    }

    
    const isValid = isValidSignature(rawBody, signatureHeader, secrets);
    fileLogger.logSignatureValidation(isValid, secrets.length);
    
    if (!isValid) {
      console.error("Signature validation FAILED");
      throw new AppError(403, "Invalid signature", "META_SIGNATURE_INVALID");
    }
    
  }

  async function fetchLeadWithRetry(leadgenId, pageConfig = {}) {
    const normalizedId = String(leadgenId || "").trim();
    if (
      (await allowInsecureWebhooksEnabled()) &&
      normalizedId.startsWith("testcrm_")
    ) {
      const country = normalizeCampaignCountry(pageConfig.countryName);
      const isUae = /^uae$/i.test(String(country || ""));
      const suffix = normalizedId.replace(/^testcrm_/, "").slice(-12) || "local";
      logger?.info?.(
        {
          leadgenId: normalizedId,
          pageId: pageConfig.pageId || null,
          country,
          mock: true,
        },
        "Using mock Meta lead payload (META_ALLOW_INSECURE_WEBHOOKS + testcrm_ prefix)",
      );
      return {
        id: normalizedId,
        created_time: new Date().toISOString(),
        form_id: isUae ? "1424002562747237" : "1424002562747236",
        page_id: pageConfig.pageId || null,
        field_data: [
          {
            name: "full_name",
            values: [
              isUae ?
                `Meta UAE Webhook Test ${suffix}`
              : `Meta India Webhook Test ${suffix}`,
            ],
          },
          {
            name: "email",
            values: [
              isUae ?
                `meta.uae.${suffix}@getfares.com`
              : `meta.india.${suffix}@getfares.com`,
            ],
          },
          {
            name: "phone_number",
            values: [isUae ? "971501234567" : "919876543210"],
          },
          {
            name: "city",
            values: [isUae ? "Dubai" : "Mumbai"],
          },
        ],
      };
    }

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
    console.log("\n========== processLeadEvent START ==========");
    console.log("Event key:", event.eventKey);
    console.log("Leadgen ID:", event.leadgenId);
    console.log("Page ID:", event.pageId);
    
    const existingEvent = await repository.findWebhookEventByKey(event.eventKey);
    console.log("Existing event found:", existingEvent ? "YES" : "NO");
    
    const eventRecord =
      existingEvent ||
      (await repository.createWebhookEvent({
        pageId: event.pageId,
        leadgenId: event.leadgenId,
        eventKey: event.eventKey,
        status: "RECEIVED",
        payloadJson: JSON.stringify(event),
      }));
    console.log("Event record ID:", eventRecord?.id);

    const existingLead = await repository.findByMetaLeadId(event.leadgenId);
    console.log("Existing lead found:", existingLead ? "YES (ID: " + existingLead.id + ")" : "NO");
    
    if (existingLead?.id) {
      const lead = await leadsService.getById(existingLead.id, context);
      await markWebhookEvent(eventRecord, { status: "DUPLICATE_META_LEAD" });
      console.log("Returning duplicate lead");
      return {
        leadgenId: event.leadgenId,
        lead,
        duplicate: true,
        skipped: false,
        reason: "meta_lead_id",
      };
    }

    const pageConfig = await resolvePageConfig(event.pageId);
    console.log("\n========== PAGE CONFIG RESOLUTION ==========");
    console.log("Page config found:", pageConfig ? "YES" : "NO");
    if (pageConfig) {
      console.log("Page config details:", JSON.stringify(summarizePageConfig(pageConfig), null, 2));
    }
    
    if (!pageConfig) {
      console.error("Page config not found for page ID:", event.pageId);
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

    console.log("\n========== FETCHING META LEAD DATA ==========");
    const metaLead = await fetchLeadWithRetry(event.leadgenId, pageConfig);
    console.log("Meta lead fetched:", JSON.stringify(metaLead, null, 2));
    
    fileLogger.logMetaLeadFetched(event.leadgenId, metaLead);
    
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
    
    console.log("\n========== ENSURING CAMPAIGN RECORD ==========");
    const campaign = await ensureCampaignRecord(metaLead, event, pageConfig);
    console.log("Campaign:", campaign ? JSON.stringify(summarizeCampaignRecord(campaign), null, 2) : "NONE");
    
    console.log("\n========== BUILDING LEAD PAYLOAD ==========");
    const payload = await buildLeadPayload(
      metaLead,
      event,
      pageConfig,
      campaign,
      mappingResolver,
    );
    console.log("Lead payload:", JSON.stringify(payload, null, 2));
    
    fileLogger.logLeadPayload(event.leadgenId, payload);
    
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

    console.log("\n========== CREATING LEAD IN CRM ==========");
    try {
      const result = await leadsService.createOrGetDuplicate(payload, context);
      console.log("Lead creation result:", {
        leadId: result.lead?.id,
        duplicate: result.duplicate,
      });
      
      fileLogger.logLeadCreated(event.leadgenId, result.lead?.id, result.duplicate);
      
      const lead = await ensureMetaAttributes(result.lead, payload, context);
      await markWebhookEvent(eventRecord, {
        status: result.duplicate ? "DUPLICATE_CONTACT" : "PROCESSED",
      });
      
      console.log("Lead processing complete - Success");
      return {
        leadgenId: event.leadgenId,
        lead,
        duplicate: result.duplicate,
        skipped: false,
        reason: result.duplicate ? "contact" : null,
      };
    } catch (error) {
      console.error("Lead creation error:", error);
      fileLogger.logLeadCreationError(event.leadgenId, error);
      
      if (isUniqueViolation(error)) {
        console.log("Unique violation - checking for existing lead");
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
    console.log("\n========== SERVICE: handleWebhook START ==========");
    console.log("Payload object type:", payload?.object);
    console.log("Payload entry count:", Array.isArray(payload?.entry) ? payload.entry.length : 0);
    
    await assertSignature(context.rawBody, signatureHeader, payload);
    console.log("Signature validation passed");

    if (!payload || typeof payload !== "object") {
      console.error("Invalid payload - not an object");
      fileLogger.error("Invalid Payload", { type: typeof payload });
      throw new AppError(400, "Invalid webhook payload", "META_PAYLOAD_INVALID");
    }

    if (payload.object && payload.object !== "page") {
      console.warn("Unexpected object type:", payload.object);
      fileLogger.warn("Unexpected Object Type", { object: payload.object });
      logger?.warn(
        { object: payload.object },
        "Unexpected Meta webhook object type",
      );
    }

    const leadEvents = extractLeadgenEvents(payload);
    console.log("\n========== EXTRACTED LEAD EVENTS ==========");
    console.log("Lead events count:", leadEvents.length);
    console.log("Lead events:", JSON.stringify(leadEvents, null, 2));
    
    fileLogger.logLeadEvents(leadEvents);
    
    if (!leadEvents.length) {
      console.warn("No leadgen events found in payload");
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
      console.log("\n========== PROCESSING LEAD EVENT ==========");
      console.log("Event:", JSON.stringify(event, null, 2));
      
      try {
        const result = await processLeadEvent(event, serviceContext);
        console.log("Event processed successfully:", JSON.stringify(result, null, 2));
        results.push(result);
      } catch (error) {
        console.error("Event processing failed:", error);
        fileLogger.logError(`lead_event_${event.leadgenId}`, error);
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
      console.error("\n========== PROCESSING ERRORS ==========");
      console.error("Errors:", JSON.stringify(errors, null, 2));
      throw new AppError(
        502,
        "Meta webhook processing failed",
        "META_WEBHOOK_PROCESSING_FAILED",
        { errors, processed: results.length },
      );
    }

    const summary = {
      processed: results.filter((item) => !item.skipped).length,
      duplicates: results.filter((item) => item.duplicate).length,
      skipped: results.filter((item) => item.skipped).length,
      leads: results,
    };
    
    console.log("\n========== FINAL SUMMARY ==========");
    console.log(JSON.stringify(summary, null, 2));
    
    return summary;
  }

  return Object.freeze({
    verifyWebhook,
    handleWebhook,
  });
}

export { createMetaLeadService };
