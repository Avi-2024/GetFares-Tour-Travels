import { AppError } from "../../core/errors/index.js";

const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  companyName: "GetFares Travel CRM",
  supportEmail: "support@getfares.com",
  supportPhone: "",
  timezone: "Asia/Kolkata",
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

  return Object.freeze({
    getAll,
    getSection,
    updateSection,
  });
}

export { createSettingsService };
