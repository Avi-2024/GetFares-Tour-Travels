import { LeadFieldsUtils } from "../leads/leadFields.utils.js";
import { normalizeMetaId } from "./metaLeadRouting.rules.js";
import { META_LEAD_SCOPE_RANK, payloadKeyForColumn } from "./metaLeadMapping.constants.js";
import {
  applyMetaFieldTransform,
  normalizeMetaFieldKeyAliases,
} from "./metaLeadMapping.transforms.js";

const {
  flattenMetaFieldData,
  pickFirst,
  deriveFullName,
  splitFixedAndDynamicFields,
  FIXED_FIELD_ALIASES,
  pickMetaTravelDestinationText,
  truncateTravelToDb,
  stripDynamicEntriesByKeyPrefixes,
  META_DESTINATION_INTEREST_KEY_PREFIX,
} = LeadFieldsUtils;

const CACHE_TTL_MS = 60_000;

function normalizeScopeId(value) {
  const normalized = normalizeMetaId(value);
  return normalized || "";
}

function profileMatchesScope(profile, scope) {
  const type = String(profile.scopeType || "").toLowerCase();
  const profileScopeId = normalizeScopeId(profile.scopeId);

  if (type === "default") {
    return profileScopeId === "" || profileScopeId === "*";
  }

  const scopeIds = {
    ad: normalizeScopeId(scope.metaAdId),
    form: normalizeScopeId(scope.metaFormId),
    campaign: normalizeScopeId(scope.metaCampaignId),
    page: normalizeScopeId(scope.metaPageId),
  };

  return profileScopeId !== "" && profileScopeId === scopeIds[type];
}

function resolveProfile(profiles, scope) {
  const matches = profiles.filter(
    (p) => p.isActive !== false && profileMatchesScope(p, scope),
  );

  if (!matches.length) return null;

  matches.sort((a, b) => {
    const rankA = META_LEAD_SCOPE_RANK[a.scopeType] ?? 99;
    const rankB = META_LEAD_SCOPE_RANK[b.scopeType] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });

  return matches[0];
}

function pickFieldByAliases(fields, aliases = []) {
  const normalizedAliases = normalizeMetaFieldKeyAliases(aliases);

  for (const alias of normalizedAliases) {
    if (fields[alias] !== undefined && fields[alias] !== null) {
      return { key: alias, value: fields[alias] };
    }
  }

  for (const alias of normalizedAliases) {
    if (alias.length < 12) continue;
    for (const fieldKey of Object.keys(fields)) {
      if (fieldKey.startsWith(alias)) {
        return { key: fieldKey, value: fields[fieldKey] };
      }
    }
  }

  return null;
}

function applyProfileFieldMaps(fields, labels, fieldMaps = []) {
  const payload = {};
  const consumedKeys = new Set();

  for (const map of fieldMaps) {
    if (map.isActive === false) continue;

    const match = pickFieldByAliases(fields, map.metaFieldKeys);
    if (!match) continue;

    const transformed = applyMetaFieldTransform(match.value, map.transform);
    if (transformed === null || transformed === undefined || transformed === "") {
      continue;
    }

    const payloadKey = payloadKeyForColumn(map.targetColumn);
    if (!payloadKey) continue;

    payload[payloadKey] = transformed;
    consumedKeys.add(match.key);

    if (map.stripFromDynamic !== false) {
      consumedKeys.add(match.key);
    }
  }

  const dynamic = { ...fields };
  const dynamicLabels = { ...labels };
  for (const key of consumedKeys) {
    delete dynamic[key];
    delete dynamicLabels[key];
  }

  return { payload, dynamic, dynamicLabels, consumedKeys };
}

function applyLegacyDestinationFallback(fields, payload, dynamic, dynamicLabels) {
  const travelToRaw = pickMetaTravelDestinationText(fields);
  const travelTo = truncateTravelToDb(travelToRaw, 150);
  if (!travelTo || payload.travelTo) {
    return { payload, dynamic, dynamicLabels };
  }

  let nextDynamic = dynamic;
  let nextLabels = dynamicLabels;
  const interest = fields[META_DESTINATION_INTEREST_KEY_PREFIX] ||
    Object.keys(fields).find((k) =>
      k.startsWith(META_DESTINATION_INTEREST_KEY_PREFIX),
    );

  if (interest) {
    const stripped = stripDynamicEntriesByKeyPrefixes(
      { dynamic: nextDynamic, dynamicLabels: nextLabels },
      [META_DESTINATION_INTEREST_KEY_PREFIX],
    );
    nextDynamic = stripped.dynamic;
    nextLabels = stripped.dynamicLabels;
  }

  return {
    payload: { ...payload, travelTo, destinationName: travelTo },
    dynamic: nextDynamic,
    dynamicLabels: nextLabels,
  };
}

function createMetaLeadMappingResolver({ repository, logger }) {
  let cache = { loadedAt: 0, profiles: [] };

  async function loadProfiles(force = false) {
    const stale = Date.now() - cache.loadedAt > CACHE_TTL_MS;
    if (!force && !stale && cache.profiles.length) {
      return cache.profiles;
    }

    try {
      const profiles = await repository.listActiveProfilesWithMaps();
      cache = { loadedAt: Date.now(), profiles };
      return profiles;
    } catch (error) {
      logger?.warn?.({ err: error }, "Failed to load Meta lead mapping profiles");
      return cache.profiles;
    }
  }

  function invalidateCache() {
    cache = { loadedAt: 0, profiles: [] };
  }

  async function resolveAndApply({
    fieldData = [],
    scope = {},
    useLegacyFallback = true,
  }) {
    const { fields, labels } = flattenMetaFieldData(fieldData);
    const profiles = await loadProfiles();
    const profile = resolveProfile(profiles, scope);

    const baseContact = {
      fullName: pickFirst(fields, FIXED_FIELD_ALIASES.fullName),
      email: pickFirst(fields, FIXED_FIELD_ALIASES.email),
      phone: pickFirst(fields, FIXED_FIELD_ALIASES.phone),
      city: pickFirst(fields, FIXED_FIELD_ALIASES.city),
    };

    if (!profile?.fieldMaps?.length) {
      let { dynamic, dynamicLabels } = splitFixedAndDynamicFields({ fields, labels });
      let payload = { ...baseContact };

      if (useLegacyFallback) {
        const legacy = applyLegacyDestinationFallback(fields, payload, dynamic, dynamicLabels);
        payload = legacy.payload;
        dynamic = legacy.dynamic;
        dynamicLabels = legacy.dynamicLabels;
      }

      payload.fullName =
        payload.fullName ||
        baseContact.fullName ||
        deriveFullName({
          email: baseContact.email,
          phone: baseContact.phone,
          hint: scope.metaLeadId,
        });

      return {
        profile: profile || null,
        payload,
        dynamic,
        dynamicLabels,
        matchedProfileId: profile?.id || null,
        profileAssign: profile ?
            {
              leadType: profile.leadType || null,
              leadCountry: profile.leadCountry || null,
              clientCurrency: profile.clientCurrency || null,
              sourceLabel: profile.sourceLabel || null,
            }
          : null,
      };
    }

    let { payload, dynamic, dynamicLabels } = applyProfileFieldMaps(
      fields,
      labels,
      profile.fieldMaps,
    );

    payload = {
      ...baseContact,
      ...payload,
      fullName:
        payload.fullName ||
        baseContact.fullName ||
        deriveFullName({
          email: baseContact.email,
          phone: baseContact.phone,
          hint: scope.metaLeadId,
        }),
    };

    if (!payload.city && baseContact.city) {
      payload.city = baseContact.city;
    }

    if (payload.travelTo && !payload.destinationName) {
      payload.destinationName = payload.travelTo;
    }

    if (useLegacyFallback && !payload.travelTo) {
      const legacy = applyLegacyDestinationFallback(fields, payload, dynamic, dynamicLabels);
      payload = legacy.payload;
      dynamic = legacy.dynamic;
      dynamicLabels = legacy.dynamicLabels;
    }

    const { dynamic: cleanedDynamic, dynamicLabels: cleanedLabels } =
      splitFixedAndDynamicFields({ fields: dynamic, labels: dynamicLabels });

    return {
      profile,
      payload,
      dynamic: cleanedDynamic,
      dynamicLabels: cleanedLabels,
      matchedProfileId: profile.id,
      profileAssign: {
        leadType: profile.leadType || null,
        leadCountry: profile.leadCountry || null,
        clientCurrency: profile.clientCurrency || null,
        sourceLabel: profile.sourceLabel || null,
      },
    };
  }

  return Object.freeze({
    loadProfiles,
    invalidateCache,
    resolveAndApply,
    resolveProfile,
    applyProfileFieldMaps,
  });
}

export { createMetaLeadMappingResolver };
