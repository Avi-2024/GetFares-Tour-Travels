import { randomUUID } from "node:crypto";

const INTEGRATION_ID = "default";

function createMetaPageConfigRepository({ db, logger }) {
  const pageTable = "meta_page_configs";
  const integrationTable = "meta_integration_settings";
  const countriesTable = "countries";

  function isMissingTableError(error) {
    return String(error?.code || "").toUpperCase() === "ER_NO_SUCH_TABLE";
  }

  async function findCountry(countryId) {
    if (!countryId) {
      return null;
    }
    try {
      return await db.findById(countriesTable, countryId);
    } catch {
      return null;
    }
  }

  async function listPageConfigs({ isActive } = {}) {
    try {
      const filter =
        isActive === undefined ? {} : { is_active: Boolean(isActive) };
      return await db.findMany(pageTable, filter);
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn({ tableName: pageTable }, "Meta page config table missing");
        return [];
      }
      logger?.error({ err: error }, "Failed to list meta page configs");
      throw error;
    }
  }

  async function findPageConfigById(id) {
    if (!id) {
      return null;
    }
    try {
      return await db.findById(pageTable, id);
    } catch (error) {
      if (isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  async function findPageConfigByPageId(pageId) {
    if (!pageId) {
      return null;
    }
    try {
      return await db.findOne(pageTable, { page_id: String(pageId) });
    } catch (error) {
      if (isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  async function insertPageConfig(payload) {
    const id = randomUUID();
    const row = await db.insert(pageTable, {
      id,
      page_id: payload.pageId,
      page_name: payload.pageName ?? null,
      country_id: payload.countryId ?? null,
      country_code: payload.countryCode ?? null,
      country_name: payload.countryName ?? null,
      source_label: payload.sourceLabel,
      access_token: payload.accessToken ?? null,
      app_secret: payload.appSecret ?? null,
      verify_token: payload.verifyToken ?? null,
      graph_version: payload.graphVersion ?? null,
      graph_base_url: payload.graphBaseUrl ?? null,
      graph_fields: payload.graphFields ?? null,
      is_active: payload.isActive !== false,
      secrets_confirmed_at: payload.secretsConfirmedAt ?? null,
    });
    return row ?? { id, ...payload };
  }

  async function updatePageConfig(id, payload) {
    if (!id) {
      return null;
    }
    const patch = {};
    if (payload.pageName !== undefined) patch.page_name = payload.pageName;
    if (payload.countryId !== undefined) patch.country_id = payload.countryId;
    if (payload.countryCode !== undefined) patch.country_code = payload.countryCode;
    if (payload.countryName !== undefined) patch.country_name = payload.countryName;
    if (payload.sourceLabel !== undefined) patch.source_label = payload.sourceLabel;
    if (payload.accessToken !== undefined) patch.access_token = payload.accessToken;
    if (payload.appSecret !== undefined) patch.app_secret = payload.appSecret;
    if (payload.verifyToken !== undefined) patch.verify_token = payload.verifyToken;
    if (payload.graphVersion !== undefined) patch.graph_version = payload.graphVersion;
    if (payload.graphBaseUrl !== undefined) patch.graph_base_url = payload.graphBaseUrl;
    if (payload.graphFields !== undefined) patch.graph_fields = payload.graphFields;
    if (payload.isActive !== undefined) patch.is_active = payload.isActive;
    if (payload.secretsConfirmedAt !== undefined) {
      patch.secrets_confirmed_at = payload.secretsConfirmedAt;
    }
    if (!Object.keys(patch).length) {
      return findPageConfigById(id);
    }
    return db.update(pageTable, id, patch);
  }

  async function getIntegrationRow() {
    try {
      const row = await db.findById(integrationTable, INTEGRATION_ID);
      if (row) {
        return row;
      }
      return db.findOne(integrationTable, { id: INTEGRATION_ID });
    } catch (error) {
      if (isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  async function upsertIntegrationSettings(payload) {
    const existing = await getIntegrationRow();
    const patch = {};
    if (payload.appSecret !== undefined) patch.app_secret = payload.appSecret;
    if (payload.verifyToken !== undefined) patch.verify_token = payload.verifyToken;
    if (payload.graphBaseUrl !== undefined) patch.graph_base_url = payload.graphBaseUrl;
    if (payload.graphVersion !== undefined) patch.graph_version = payload.graphVersion;
    if (payload.graphFields !== undefined) patch.graph_fields = payload.graphFields;
    if (payload.allowInsecureWebhooks !== undefined) {
      patch.allow_insecure_webhooks = payload.allowInsecureWebhooks;
    }
    if (payload.secretsConfirmedAt !== undefined) {
      patch.secrets_confirmed_at = payload.secretsConfirmedAt;
    }

    if (!existing) {
      try {
        return await db.insert(integrationTable, {
          id: INTEGRATION_ID,
          ...patch,
        });
      } catch (error) {
        if (isMissingTableError(error)) {
          return null;
        }
        throw error;
      }
    }

    if (!Object.keys(patch).length) {
      return existing;
    }

    return db.update(integrationTable, INTEGRATION_ID, patch);
  }

  return Object.freeze({
    findCountry,
    listPageConfigs,
    findPageConfigById,
    findPageConfigByPageId,
    insertPageConfig,
    updatePageConfig,
    getIntegrationRow,
    upsertIntegrationSettings,
  });
}

export { createMetaPageConfigRepository };
