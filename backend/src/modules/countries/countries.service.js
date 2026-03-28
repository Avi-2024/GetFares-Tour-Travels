import { AppError } from "../../core/errors/index.js";

function createCountriesService({ repository, events }) {
  function normalizeCode(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized || null;
  }

  function normalizeName(value) {
    const normalized = String(value || "").trim();
    return normalized || null;
  }

  function toCountry(row, usage = null) {
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.is_active ?? row.isActive ?? true,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      usage: usage || undefined,
    };
  }

  async function requireCountry(id) {
    const country = await repository.findById(id);
    if (!country) {
      throw new AppError(404, "Country not found", "COUNTRY_NOT_FOUND");
    }
    return country;
  }

  return Object.freeze({
    async list(filters = {}) {
      const rows = await repository.findAll({
        includeInactive: filters.includeInactive !== false,
        search: filters.search ? String(filters.search).trim() : null,
      });

      return rows.map((row) => toCountry(row));
    },

    async getById(id, { includeUsage = false } = {}) {
      const country = await requireCountry(id);
      if (!includeUsage) {
        return toCountry(country);
      }

      const usage = await repository.countUsage(id);
      return toCountry(country, usage);
    },

    async create(payload = {}, context = {}) {
      const code = normalizeCode(payload.code);
      const name = normalizeName(payload.name);
      if (!code) {
        throw new AppError(400, "Country code is required", "COUNTRY_CODE_REQUIRED");
      }
      if (!name) {
        throw new AppError(400, "Country name is required", "COUNTRY_NAME_REQUIRED");
      }

      const [duplicateCode, duplicateName] = await Promise.all([
        repository.findByCode(code),
        repository.findByName(name),
      ]);
      if (duplicateCode) {
        throw new AppError(409, "Country code already exists", "COUNTRY_CODE_EXISTS");
      }
      if (duplicateName) {
        throw new AppError(409, "Country name already exists", "COUNTRY_NAME_EXISTS");
      }

      const created = await repository.create({
        code,
        name,
        is_active: payload.isActive ?? true,
        created_by: context.user?.id || null,
        updated_by: context.user?.id || null,
      });

      const mapped = toCountry(created);
      events.emitCreated?.(mapped);
      return mapped;
    },

    async update(id, payload = {}, context = {}) {
      const existing = await requireCountry(id);

      const updates = {};
      if (payload.code !== undefined) {
        const code = normalizeCode(payload.code);
        if (!code) {
          throw new AppError(
            400,
            "Country code cannot be empty",
            "COUNTRY_CODE_REQUIRED",
          );
        }
        const duplicateCode = await repository.findByCode(code);
        if (duplicateCode && duplicateCode.id !== id) {
          throw new AppError(
            409,
            "Country code already exists",
            "COUNTRY_CODE_EXISTS",
          );
        }
        updates.code = code;
      }

      if (payload.name !== undefined) {
        const name = normalizeName(payload.name);
        if (!name) {
          throw new AppError(
            400,
            "Country name cannot be empty",
            "COUNTRY_NAME_REQUIRED",
          );
        }
        const duplicateName = await repository.findByName(name);
        if (duplicateName && duplicateName.id !== id) {
          throw new AppError(
            409,
            "Country name already exists",
            "COUNTRY_NAME_EXISTS",
          );
        }
        updates.name = name;
      }

      if (payload.isActive !== undefined) {
        updates.is_active = payload.isActive;
      }

      if (!Object.keys(updates).length) {
        return toCountry(existing);
      }

      updates.updated_by = context.user?.id || null;
      updates.updated_at = new Date().toISOString();

      const updated = await repository.update(id, updates);
      const mapped = toCountry(updated || existing);
      events.emitUpdated?.(mapped);
      return mapped;
    },
  });
}

export { createCountriesService };
