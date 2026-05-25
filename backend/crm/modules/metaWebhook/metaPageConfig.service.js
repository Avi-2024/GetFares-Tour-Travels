import { AppError } from "../../core/errors/index.js";
import {
  buildIntegrationSecretPublic,
  buildPageSecretPublic,
  decryptField,
  decryptPageRow,
  encryptField,
  encryptPageSecrets,
  getEncryptionKey,
  shouldUpdateSecret,
} from "./metaPageConfig.secrets.js";

function toPublicPageConfig(row, country = null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pageId: row.page_id ?? row.pageId,
    pageName: row.page_name ?? row.pageName ?? null,
    countryId: row.country_id ?? row.countryId ?? null,
    countryCode:
      country?.code ?? row.country_code ?? row.countryCode ?? null,
    countryName:
      country?.name ?? row.country_name ?? row.countryName ?? null,
    sourceLabel: row.source_label ?? row.sourceLabel ?? null,
    graphVersion: row.graph_version ?? row.graphVersion ?? null,
    graphBaseUrl: row.graph_base_url ?? row.graphBaseUrl ?? null,
    graphFields: row.graph_fields ?? row.graphFields ?? null,
    isActive: row.is_active ?? row.isActive ?? true,
    secretsConfirmedAt:
      row.secrets_confirmed_at ?? row.secretsConfirmedAt ?? null,
    secrets: buildPageSecretPublic(row),
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  };
}

function toPublicIntegration(row, envFallback = {}) {
  return {
    graphBaseUrl:
      row?.graph_base_url ??
      row?.graphBaseUrl ??
      envFallback.graphBaseUrl ??
      null,
    graphVersion:
      row?.graph_version ??
      row?.graphVersion ??
      envFallback.graphVersion ??
      null,
    graphFields:
      row?.graph_fields ?? row?.graphFields ?? envFallback.graphFields ?? null,
    allowInsecureWebhooks:
      row?.allow_insecure_webhooks ??
      row?.allowInsecureWebhooks ??
      envFallback.allowInsecureWebhooks ??
      false,
    secretsConfirmedAt:
      row?.secrets_confirmed_at ?? row?.secretsConfirmedAt ?? null,
    secrets: buildIntegrationSecretPublic(row),
    configSource: row ? "database" : "environment",
  };
}

function createMetaPageConfigService({ repository, config, logger }) {
  const encryptionKey = getEncryptionKey(config);
  const envMeta = config?.meta ?? {};

  function assertEncryptionKey() {
    if (!encryptionKey) {
      throw new AppError(
        500,
        "META_SECRETS_ENCRYPTION_KEY (min 32 chars) is required to store Meta secrets",
        "META_ENCRYPTION_KEY_MISSING",
      );
    }
  }

  async function listPages(query = {}) {
    const rows = await repository.listPageConfigs(query);
    const result = [];
    for (const row of rows) {
      const country = await repository.findCountry(
        row.country_id ?? row.countryId,
      );
      result.push(toPublicPageConfig(row, country));
    }
    return result.filter(Boolean);
  }

  async function getPageById(id) {
    const row = await repository.findPageConfigById(id);
    if (!row) {
      throw new AppError(404, "Meta page config not found", "META_PAGE_NOT_FOUND");
    }
    const country = await repository.findCountry(
      row.country_id ?? row.countryId,
    );
    return toPublicPageConfig(row, country);
  }

  async function createPage(body) {
    assertEncryptionKey();

    const pageId = String(body.pageId || "").trim();
    if (!pageId) {
      throw new AppError(400, "pageId is required", "META_PAGE_INVALID");
    }

    const existing = await repository.findPageConfigByPageId(pageId);
    if (existing) {
      throw new AppError(
        409,
        "A config for this page ID already exists",
        "META_PAGE_EXISTS",
      );
    }

    const encrypted = encryptPageSecrets(
      {
        accessToken: body.accessToken,
        appSecret: body.appSecret,
        verifyToken: body.verifyToken,
      },
      encryptionKey,
    );

    const hasNewSecrets =
      shouldUpdateSecret(body.accessToken) ||
      shouldUpdateSecret(body.appSecret) ||
      shouldUpdateSecret(body.verifyToken);

    const row = await repository.insertPageConfig({
      pageId,
      pageName: body.pageName,
      countryId: body.countryId,
      countryCode: body.countryCode,
      countryName: body.countryName,
      sourceLabel: body.sourceLabel,
      graphVersion: body.graphVersion,
      graphBaseUrl: body.graphBaseUrl,
      graphFields: body.graphFields,
      isActive: body.isActive,
      accessToken: encrypted.access_token,
      appSecret: encrypted.app_secret,
      verifyToken: encrypted.verify_token,
      secretsConfirmedAt: hasNewSecrets ? new Date() : null,
    });

    const country = await repository.findCountry(
      row?.country_id ?? body.countryId,
    );
    return toPublicPageConfig(row, country);
  }

  async function updatePage(id, body) {
    assertEncryptionKey();

    const existing = await repository.findPageConfigById(id);
    if (!existing) {
      throw new AppError(404, "Meta page config not found", "META_PAGE_NOT_FOUND");
    }

    const encrypted = encryptPageSecrets(
      {
        accessToken: shouldUpdateSecret(body.accessToken) ?
          body.accessToken
        : undefined,
        appSecret: shouldUpdateSecret(body.appSecret) ?
          body.appSecret
        : undefined,
        verifyToken: shouldUpdateSecret(body.verifyToken) ?
          body.verifyToken
        : undefined,
      },
      encryptionKey,
    );

    const hasNewSecrets = Object.values(encrypted).some(Boolean);
    const confirmSecrets = body.confirmSecrets === true;

    const row = await repository.updatePageConfig(id, {
      pageName: body.pageName,
      countryId: body.countryId,
      countryCode: body.countryCode,
      countryName: body.countryName,
      sourceLabel: body.sourceLabel,
      graphVersion: body.graphVersion,
      graphBaseUrl: body.graphBaseUrl,
      graphFields: body.graphFields,
      isActive: body.isActive,
      accessToken: encrypted.access_token,
      appSecret: encrypted.app_secret,
      verifyToken: encrypted.verify_token,
      secretsConfirmedAt:
        hasNewSecrets || confirmSecrets ?
          new Date()
        : undefined,
    });

    const country = await repository.findCountry(
      row?.country_id ?? existing.country_id,
    );
    return toPublicPageConfig(row, country);
  }

  async function getIntegration() {
    const row = await repository.getIntegrationRow();
    return toPublicIntegration(row, {
      graphBaseUrl: envMeta.graphBaseUrl,
      graphVersion: envMeta.graphVersion,
      graphFields: envMeta.graphFields,
      allowInsecureWebhooks: envMeta.allowInsecureWebhooks,
    });
  }

  async function updateIntegration(body) {
    assertEncryptionKey();

    const patch = {};
    if (shouldUpdateSecret(body.appSecret)) {
      patch.appSecret = encryptField(body.appSecret, encryptionKey);
    }
    if (shouldUpdateSecret(body.verifyToken)) {
      patch.verifyToken = encryptField(body.verifyToken, encryptionKey);
    }
    if (body.graphBaseUrl !== undefined) patch.graphBaseUrl = body.graphBaseUrl;
    if (body.graphVersion !== undefined) patch.graphVersion = body.graphVersion;
    if (body.graphFields !== undefined) patch.graphFields = body.graphFields;
    if (body.allowInsecureWebhooks !== undefined) {
      patch.allowInsecureWebhooks = body.allowInsecureWebhooks;
    }

    const hasNewSecrets =
      patch.appSecret !== undefined || patch.verifyToken !== undefined;

    if (hasNewSecrets || body.confirmSecrets === true) {
      patch.secretsConfirmedAt = new Date();
    }

    const row = await repository.upsertIntegrationSettings(patch);
    return toPublicIntegration(row, {
      graphBaseUrl: envMeta.graphBaseUrl,
      graphVersion: envMeta.graphVersion,
      graphFields: envMeta.graphFields,
      allowInsecureWebhooks: envMeta.allowInsecureWebhooks,
    });
  }

  async function getResolvedIntegrationForWebhook() {
    const row = await repository.getIntegrationRow();
    const decryptedAppSecret = row ?
      decryptField(row.app_secret, encryptionKey)
    : null;
    const decryptedVerify = row ?
      decryptField(row.verify_token, encryptionKey)
    : null;

    return {
      appSecret: decryptedAppSecret || envMeta.appSecret || null,
      verifyToken: decryptedVerify || envMeta.verifyToken || null,
      allowInsecureWebhooks:
        row?.allow_insecure_webhooks ??
        row?.allowInsecureWebhooks ??
        envMeta.allowInsecureWebhooks ??
        false,
      graphBaseUrl:
        row?.graph_base_url ?? row?.graphBaseUrl ?? envMeta.graphBaseUrl,
      graphVersion:
        row?.graph_version ?? row?.graphVersion ?? envMeta.graphVersion,
      graphFields: row?.graph_fields ?? row?.graphFields ?? envMeta.graphFields,
    };
  }

  async function hydratePageConfigForWebhook(row) {
    if (!row) {
      return null;
    }

    const country = await repository.findCountry(
      row.country_id ?? row.countryId,
    );
    const secrets = decryptPageRow(row, encryptionKey);

    return {
      id: row.id,
      pageId: row.page_id ?? row.pageId,
      pageName: row.page_name ?? row.pageName,
      countryId: row.country_id ?? row.countryId,
      countryCode:
        country?.code ?? row.country_code ?? row.countryCode ?? null,
      countryName:
        country?.name ?? row.country_name ?? row.countryName ?? null,
      sourceLabel: row.source_label ?? row.sourceLabel,
      accessToken: secrets.accessToken,
      appSecret: secrets.appSecret,
      verifyToken: secrets.verifyToken,
      graphVersion: row.graph_version ?? row.graphVersion,
      graphBaseUrl: row.graph_base_url ?? row.graphBaseUrl,
      graphFields: row.graph_fields ?? row.graphFields,
      isActive: row.is_active ?? row.isActive ?? true,
    };
  }

  async function listActivePagesForWebhook() {
    const rows = await repository.listPageConfigs({ isActive: true });
    const hydrated = [];
    for (const row of rows) {
      try {
        hydrated.push(await hydratePageConfigForWebhook(row));
      } catch (error) {
        logger?.error(
          { err: error, pageId: row?.page_id },
          "Failed to decrypt meta page config",
        );
      }
    }
    return hydrated.filter(Boolean);
  }

  async function findPageConfigForWebhook(pageId) {
    const row = await repository.findPageConfigByPageId(pageId);
    if (!row || row.is_active === false) {
      return null;
    }
    return hydratePageConfigForWebhook(row);
  }

  return Object.freeze({
    listPages,
    getPageById,
    createPage,
    updatePage,
    getIntegration,
    updateIntegration,
    getResolvedIntegrationForWebhook,
    listActivePagesForWebhook,
    findPageConfigForWebhook,
    hydratePageConfigForWebhook,
  });
}

export { createMetaPageConfigService };
