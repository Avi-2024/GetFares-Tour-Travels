import { AppError } from "../../core/middlewares/errorHandler.js";
import { normalizeText, toBoolean, toNumber } from "../../core/utils/index.js";

function createCountriesService({ repository }) {
  function toCountry(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      codeAlpha2: row.code_alpha2,
      flagEmoji: row.flag_emoji,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      phoneCode: row.phone_code,
      isActive: row.is_active,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const rows = await repository.findAll(filters);
      return rows.map(toCountry);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Country not found", "NOT_FOUND");
      }
      return toCountry(row);
    },

    async getByCode(code) {
      const row = await repository.findByCode(code);
      if (!row) {
        throw new AppError(404, "Country not found", "NOT_FOUND");
      }
      return toCountry(row);
    },

    async getByIds(ids) {
      const rows = await repository.findByIds(ids);
      return rows.map(toCountry);
    },

    async create(data) {
      const name = normalizeText(data.name);
      const code = normalizeText(data.code)?.toUpperCase();
      const codeAlpha2 = normalizeText(data.codeAlpha2)?.toUpperCase();

      if (!name || !code || !codeAlpha2) {
        throw new AppError(
          400,
          "Name, code, and codeAlpha2 are required",
          "VALIDATION_ERROR"
        );
      }

      const existingByName = await repository.findByName(name);
      if (existingByName) {
        throw new AppError(400, "Country name already exists", "DUPLICATE_NAME");
      }

      const existingByCode = await repository.findByCode(code);
      if (existingByCode) {
        throw new AppError(400, "Country code already exists", "DUPLICATE_CODE");
      }

      const row = await repository.create({
        name,
        code,
        code_alpha2: codeAlpha2,
        flag_emoji: normalizeText(data.flagEmoji),
        currency_code: normalizeText(data.currencyCode),
        currency_symbol: normalizeText(data.currencySymbol),
        phone_code: normalizeText(data.phoneCode),
        is_active: toBoolean(data.isActive, true),
        display_order: toNumber(data.displayOrder, 0),
      });

      return toCountry(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Country not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.name !== undefined) {
        const name = normalizeText(data.name);
        if (!name) {
          throw new AppError(400, "Name cannot be empty", "INVALID_NAME");
        }
        const existingByName = await repository.findByName(name);
        if (existingByName && existingByName.id !== id) {
          throw new AppError(400, "Country name already exists", "DUPLICATE_NAME");
        }
        updates.name = name;
      }
      if (data.code !== undefined) {
        const code = normalizeText(data.code)?.toUpperCase();
        if (!code) {
          throw new AppError(400, "Code cannot be empty", "INVALID_CODE");
        }
        const existingByCode = await repository.findByCode(code);
        if (existingByCode && existingByCode.id !== id) {
          throw new AppError(400, "Country code already exists", "DUPLICATE_CODE");
        }
        updates.code = code;
      }
      if (data.codeAlpha2 !== undefined) {
        updates.code_alpha2 = normalizeText(data.codeAlpha2)?.toUpperCase();
      }
      if (data.flagEmoji !== undefined) {
        updates.flag_emoji = normalizeText(data.flagEmoji);
      }
      if (data.currencyCode !== undefined) {
        updates.currency_code = normalizeText(data.currencyCode);
      }
      if (data.currencySymbol !== undefined) {
        updates.currency_symbol = normalizeText(data.currencySymbol);
      }
      if (data.phoneCode !== undefined) {
        updates.phone_code = normalizeText(data.phoneCode);
      }
      if (data.isActive !== undefined) {
        updates.is_active = toBoolean(data.isActive, true);
      }
      if (data.displayOrder !== undefined) {
        updates.display_order = toNumber(data.displayOrder, 0);
      }

      const updated = await repository.update(id, updates);
      return toCountry(updated);
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Country not found", "NOT_FOUND");
      }

      await repository.delete(id);
      return { success: true };
    },
  });
}

export { createCountriesService };
