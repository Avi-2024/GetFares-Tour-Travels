import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";
import {
  META_LEAD_MAPPABLE_COLUMNS,
  META_LEAD_FORM_QUESTION_FIELDS,
  META_LEAD_PROFILE_DEFAULT_FIELDS,
  META_LEAD_SCOPE_TYPES,
  META_LEAD_TRANSFORMS,
  isAllowedTargetColumn,
} from "./metaLeadMapping.constants.js";
import { normalizeMetaFieldKeyAliases } from "./metaLeadMapping.transforms.js";

function isDuplicateKeyError(error) {
  const code = String(error?.code || "").toUpperCase();
  return code === "ER_DUP_ENTRY" || code === "23505";
}

function normalizeScopeIdForDb(scopeType, scopeId) {
  const type = String(scopeType || "").toLowerCase();
  if (type === "default") {
    return "";
  }
  return String(scopeId || "").trim();
}

function createMetaLeadMappingService({ repository, resolver, logger }) {
  function getMetadata() {
    return {
      mappableColumns: META_LEAD_MAPPABLE_COLUMNS,
      profileDefaultFields: META_LEAD_PROFILE_DEFAULT_FIELDS,
      formQuestionFields: META_LEAD_FORM_QUESTION_FIELDS,
      scopeTypes: META_LEAD_SCOPE_TYPES,
      transforms: META_LEAD_TRANSFORMS,
      configSource:
        "Business rules (lead type, country, currency, question maps) are stored in the database and managed from Settings → Meta Lead Mapping. Environment variables are only used for Meta API secrets and page access tokens.",
    };
  }

  async function listProfiles(filters = {}) {
    return repository.listProfiles(filters);
  }

  async function getProfileById(id) {
    const profile = await repository.findProfileById(id);
    if (!profile) {
      throw new AppError(404, "Mapping profile not found", "META_MAP_PROFILE_NOT_FOUND");
    }
    return profile;
  }

  async function createProfile(body, context = {}) {
    const scopeType = String(body.scopeType).toLowerCase();
    const scopeId = normalizeScopeIdForDb(scopeType, body.scopeId);

    if (scopeType !== "default" && !scopeId) {
      throw new AppError(
        400,
        "scopeId is required for non-default profiles",
        "META_MAP_SCOPE_ID_REQUIRED",
      );
    }

    try {
      const row = await repository.createProfile({
        id: crypto.randomUUID(),
        name: body.name,
        scope_type: scopeType,
        scope_id: scopeId,
        priority: body.priority ?? 100,
        lead_type: body.leadType || null,
      lead_country: body.leadCountry || null,
      client_currency: body.clientCurrency || null,
      source_label: body.sourceLabel || null,
        is_active: body.isActive !== false,
        created_by: context.user?.id || null,
        updated_by: context.user?.id || null,
      });

      resolver.invalidateCache();
      return getProfileById(row.id);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError(
          409,
          "A mapping profile already exists for this scope",
          "META_MAP_SCOPE_DUPLICATE",
        );
      }
      throw error;
    }
  }

  async function updateProfile(id, body, context = {}) {
    await getProfileById(id);

    const patch = { updated_by: context.user?.id || null };
    if (body.name !== undefined) patch.name = body.name;
    if (body.scopeType !== undefined) patch.scope_type = String(body.scopeType).toLowerCase();
    if (body.scopeId !== undefined || body.scopeType !== undefined) {
      const type = patch.scope_type || (await getProfileById(id)).scopeType;
      patch.scope_id = normalizeScopeIdForDb(type, body.scopeId);
    }
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.leadType !== undefined) patch.lead_type = body.leadType || null;
    if (body.leadCountry !== undefined) patch.lead_country = body.leadCountry || null;
    if (body.clientCurrency !== undefined) {
      patch.client_currency = body.clientCurrency || null;
    }
    if (body.sourceLabel !== undefined) patch.source_label = body.sourceLabel || null;
    if (body.isActive !== undefined) patch.is_active = body.isActive;

    await repository.updateProfile(id, patch);
    resolver.invalidateCache();
    return getProfileById(id);
  }

  async function createFieldMap(profileId, body) {
    await getProfileById(profileId);

    if (!isAllowedTargetColumn(body.targetColumn)) {
      throw new AppError(400, "Invalid target column", "META_MAP_INVALID_COLUMN");
    }

    const aliases = normalizeMetaFieldKeyAliases(body.metaFieldKeys);
    if (!aliases.length) {
      throw new AppError(400, "metaFieldKeys is required", "META_MAP_KEYS_REQUIRED");
    }

    const row = await repository.createFieldMap({
      id: crypto.randomUUID(),
      profile_id: profileId,
      meta_field_keys: JSON.stringify(aliases),
      target_column: body.targetColumn,
      transform: body.transform || "none",
      strip_from_dynamic: body.stripFromDynamic !== false,
      sort_order: body.sortOrder ?? 0,
      is_active: body.isActive !== false,
    });

    resolver.invalidateCache();
    return repository.findFieldMapById(row.id);
  }

  async function updateFieldMap(id, body) {
    const existing = await repository.findFieldMapById(id);
    if (!existing) {
      throw new AppError(404, "Field map not found", "META_MAP_FIELD_NOT_FOUND");
    }

    const patch = {};
    if (body.metaFieldKeys !== undefined) {
      const aliases = normalizeMetaFieldKeyAliases(body.metaFieldKeys);
      if (!aliases.length) {
        throw new AppError(400, "metaFieldKeys is required", "META_MAP_KEYS_REQUIRED");
      }
      patch.meta_field_keys = JSON.stringify(aliases);
    }
    if (body.targetColumn !== undefined) {
      if (!isAllowedTargetColumn(body.targetColumn)) {
        throw new AppError(400, "Invalid target column", "META_MAP_INVALID_COLUMN");
      }
      patch.target_column = body.targetColumn;
    }
    if (body.transform !== undefined) patch.transform = body.transform;
    if (body.stripFromDynamic !== undefined) {
      patch.strip_from_dynamic = body.stripFromDynamic;
    }
    if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
    if (body.isActive !== undefined) patch.is_active = body.isActive;

    await repository.updateFieldMap(id, patch);
    resolver.invalidateCache();
    return repository.findFieldMapById(id);
  }

  async function deleteFieldMap(id) {
    const existing = await repository.findFieldMapById(id);
    if (!existing) {
      throw new AppError(404, "Field map not found", "META_MAP_FIELD_NOT_FOUND");
    }
    await repository.deleteFieldMap(id);
    resolver.invalidateCache();
    return { id, deleted: true };
  }

  async function testMapping(body) {
    const result = await resolver.resolveAndApply({
      fieldData: body.fieldData,
      scope: {
        metaAdId: body.metaAdId,
        metaFormId: body.metaFormId,
        metaCampaignId: body.metaCampaignId,
        metaPageId: body.metaPageId,
      },
      useLegacyFallback: true,
    });

    return {
      matchedProfileId: result.matchedProfileId,
      profile: result.profile ?
          {
            id: result.profile.id,
            name: result.profile.name,
            scopeType: result.profile.scopeType,
            scopeId: result.profile.scopeId,
          }
        : null,
      mappedPayload: result.payload,
      dynamicFields: result.dynamic,
      dynamicFieldLabels: result.dynamicLabels,
      profileAssign: result.profileAssign || null,
    };
  }

  async function reloadCache() {
    resolver.invalidateCache();
    const profiles = await resolver.loadProfiles(true);
    logger?.info?.(
      { count: profiles.length },
      "Meta lead mapping cache reloaded",
    );
    return { reloaded: true, profileCount: profiles.length };
  }

  return Object.freeze({
    getMetadata,
    listProfiles,
    getProfileById,
    createProfile,
    updateProfile,
    createFieldMap,
    updateFieldMap,
    deleteFieldMap,
    testMapping,
    reloadCache,
  });
}

export { createMetaLeadMappingService };
