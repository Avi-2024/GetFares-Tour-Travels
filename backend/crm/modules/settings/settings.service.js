import { AppError } from "../../core/errors/index.js";

const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  companyName: "Get2Vacation Travel CRM",
  supportEmail: "support@Get2Vacation.com",
  supportPhone: "",
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  websiteUrl: "",
});

const DEFAULT_INTEGRATION_SETTINGS = Object.freeze({
  metaAppId: "",
  metaAccessToken: "",
  whatsappApiToken: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  webhookUrl: "",
});

const DEFAULT_SYSTEM_PREFERENCES = Object.freeze({
  timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
  locale: DEFAULT_SYSTEM_SETTINGS.locale,
  dateFormat: DEFAULT_SYSTEM_SETTINGS.dateFormat,
});

const CANONICAL_STATUSES = new Set([
  "OPEN",
  "CONTACTED",
  "WIP",
  "QUOTED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
]);

function toPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function createSettingsService({ repository, logger, events, schema }) {
  function getSectionKey(section) {
    const key = schema.keys[section];
    if (!key) {
      throw new AppError(
        400,
        `Unsupported settings section: ${section}`,
        "SETTINGS_SECTION_INVALID",
      );
    }
    return key;
  }

  function getSectionDefaults(section) {
    return section === "system"
      ? DEFAULT_SYSTEM_SETTINGS
      : DEFAULT_INTEGRATION_SETTINGS;
  }

  async function getSection(section, context = {}) {
    const key = getSectionKey(section);
    logger.debug(
      { module: "settings", requestId: context.requestId, section },
      "Getting settings section",
    );
    const existing = await repository.findByKey(key);
    const defaults = getSectionDefaults(section);
    return {
      ...defaults,
      ...toPlainObject(existing?.value),
    };
  }

  async function getAll(context = {}) {
    const [system, integrations] = await Promise.all([
      getSection("system", context),
      getSection("integrations", context),
    ]);

    return {
      system,
      integrations,
    };
  }

  function pickSystemPreferences(system = {}) {
    return {
      timezone: system.timezone || DEFAULT_SYSTEM_PREFERENCES.timezone,
      locale: system.locale || DEFAULT_SYSTEM_PREFERENCES.locale,
      dateFormat: system.dateFormat || DEFAULT_SYSTEM_PREFERENCES.dateFormat,
    };
  }

  async function getSystemPreferences(context = {}) {
    const system = await getSection("system", context);
    return pickSystemPreferences(system);
  }

  async function updateSection(section, payload = {}, context = {}) {
    const key = getSectionKey(section);
    const defaults = getSectionDefaults(section);
    const existing = await repository.findByKey(key);
    const current = toPlainObject(existing?.value);
    const next = {
      ...defaults,
      ...current,
      ...payload,
    };

    logger.debug(
      { module: "settings", requestId: context.requestId, section, payload },
      "Updating settings section",
    );
    const saved = await repository.upsert(key, next, context.user?.id || null);
    events.emitUpdated(section, saved);

    return next;
  }

  async function getLeadStatusWorkflow(context = {}, options = {}) {
    logger.debug(
      { module: "settings", requestId: context.requestId },
      "Getting lead status workflow",
    );
    return repository.listLeadStatusWorkflow(options);
  }

  function assertCanonicalStatus(value) {
    if (!CANONICAL_STATUSES.has(String(value || "").toUpperCase())) {
      throw new AppError(
        400,
        "canonicalStatus is invalid",
        "LEAD_STATUS_CANONICAL_INVALID",
      );
    }
  }

  async function createLeadStatusMain(payload = {}, context = {}) {
    assertCanonicalStatus(payload.canonicalStatus);
    return repository.createLeadStatusMain(payload, context.user?.id || null);
  }

  async function updateLeadStatusMain(id, payload = {}, context = {}) {
    if (payload.canonicalStatus !== undefined) {
      assertCanonicalStatus(payload.canonicalStatus);
    }
    return repository.updateLeadStatusMain(id, payload, context.user?.id || null);
  }

  async function createLeadStatusSub(payload = {}, context = {}) {
    return repository.createLeadStatusSub(payload, context.user?.id || null);
  }

  async function updateLeadStatusSub(id, payload = {}, context = {}) {
    return repository.updateLeadStatusSub(id, payload, context.user?.id || null);
  }

  async function reorderLeadStatusWorkflow(payload = {}, context = {}) {
    return repository.reorderLeadStatusWorkflow(payload, context.user?.id || null);
  }

  return Object.freeze({
    getAll,
    getSection,
    getSystemPreferences,
    updateSection,
    getLeadStatusWorkflow,
    createLeadStatusMain,
    updateLeadStatusMain,
    createLeadStatusSub,
    updateLeadStatusSub,
    reorderLeadStatusWorkflow,
  });
}

export { createSettingsService };
