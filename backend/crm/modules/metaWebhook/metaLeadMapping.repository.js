function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    scopeType: row.scope_type ?? row.scopeType,
    scopeId: row.scope_id ?? row.scopeId ?? "",
    priority: Number(row.priority ?? 100),
    leadType: row.lead_type ?? row.leadType ?? null,
    leadCountry: row.lead_country ?? row.leadCountry ?? null,
    clientCurrency: row.client_currency ?? row.clientCurrency ?? null,
    sourceLabel: row.source_label ?? row.sourceLabel ?? null,
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdBy: row.created_by ?? row.createdBy ?? null,
    updatedBy: row.updated_by ?? row.updatedBy ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    fieldMaps: [],
  };
}

function mapFieldMapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id ?? row.profileId,
    metaFieldKeys: parseJsonArray(row.meta_field_keys ?? row.metaFieldKeys),
    targetColumn: row.target_column ?? row.targetColumn,
    transform: row.transform ?? "none",
    stripFromDynamic: Boolean(
      row.strip_from_dynamic ?? row.stripFromDynamic ?? true,
    ),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
  };
}

function createMetaLeadMappingRepository({ db, logger }) {
  const profilesTable = "meta_lead_profiles";
  const mapsTable = "meta_lead_field_maps";

  function isMissingTableError(error) {
    return String(error?.code || "").toUpperCase() === "ER_NO_SUCH_TABLE";
  }

  function activeMapQuery(profileId) {
    return { profile_id: profileId, is_active: true };
  }

  async function listActiveProfilesWithMaps() {
    try {
      const profiles = await db.findMany(profilesTable, { is_active: true });
      if (!Array.isArray(profiles) || !profiles.length) {
        return [];
      }

      const mapped = profiles.map(mapProfileRow).filter(Boolean);
      for (const profile of mapped) {
        const maps = await db.findMany(mapsTable, activeMapQuery(profile.id));
        profile.fieldMaps = (Array.isArray(maps) ? maps : [])
          .map(mapFieldMapRow)
          .filter(Boolean)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }

      return mapped;
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn("meta_lead_profiles table missing; mapping disabled");
        return [];
      }
      throw error;
    }
  }

  async function listProfiles(filters = {}) {
    try {
      const query = {};
      if (filters.isActive !== undefined) {
        query.is_active = filters.isActive;
      }
      const rows = await db.findMany(profilesTable, query);
      const profiles = (Array.isArray(rows) ? rows : [])
        .map(mapProfileRow)
        .filter(Boolean);

      for (const profile of profiles) {
        const maps = await db.findMany(mapsTable, activeMapQuery(profile.id));
        profile.fieldMaps = (Array.isArray(maps) ? maps : [])
          .map(mapFieldMapRow)
          .filter(Boolean)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }

      return profiles.sort((a, b) => {
        const rank =
          String(a.scopeType).localeCompare(String(b.scopeType)) ||
          a.priority - b.priority;
        return rank;
      });
    } catch (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
  }

  async function findProfileById(id) {
    if (!id) return null;
    try {
      const row = await db.findById(profilesTable, id);
      const profile = mapProfileRow(row);
      if (!profile) return null;
      const maps = await db.findMany(mapsTable, activeMapQuery(id));
      profile.fieldMaps = (Array.isArray(maps) ? maps : [])
        .map(mapFieldMapRow)
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return profile;
    } catch (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
  }

  async function createProfile(payload) {
    return db.insert(profilesTable, payload);
  }

  async function updateProfile(id, payload) {
    return db.update(profilesTable, id, payload);
  }

  async function createFieldMap(payload) {
    return db.insert(mapsTable, payload);
  }

  async function updateFieldMap(id, payload) {
    return db.update(mapsTable, id, payload);
  }

  async function findFieldMapById(id) {
    if (!id) return null;
    const row = await db.findById(mapsTable, id);
    return mapFieldMapRow(row);
  }

  async function deleteFieldMap(id) {
    return db.update(mapsTable, id, { is_active: false });
  }

  return Object.freeze({
    listActiveProfilesWithMaps,
    listProfiles,
    findProfileById,
    createProfile,
    updateProfile,
    createFieldMap,
    updateFieldMap,
    findFieldMapById,
    deleteFieldMap,
  });
}

export { createMetaLeadMappingRepository, mapProfileRow, mapFieldMapRow };
