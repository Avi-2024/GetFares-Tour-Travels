import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
} from "../../core/utils/index.js";

function createLandingService({ repository }) {
  function toLandingPlace(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.name,
      country: row.country ?? null,
      description: row.tag ?? null,
      tag: row.tag,
      image: row.image_url,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const rows = await repository.findAll(filters);
      return rows
        .map(toLandingPlace)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }
      return toLandingPlace(row);
    },

    async create(data) {
      const country = normalizeText(data.country);
      const supportsCountry = await repository.supportsCountry();
      if (supportsCountry && !country) {
        throw new AppError(
          400,
          "Country is required for landing place",
          "COUNTRY_REQUIRED",
        );
      }

      const existing = await repository.findAll(
        supportsCountry && country ? { is_active: true, country } : { is_active: true },
      );
      if (existing.length >= 4) {
        throw new AppError(
          400,
          supportsCountry && country ?
            `Maximum 4 landing places allowed per country (${country})`
          : "Maximum 4 landing places allowed.",
          "MAX_LIMIT_REACHED",
        );
      }

      const title = normalizeText(data.title ?? data.name);
      if (!title) {
        throw new AppError(400, "Title is required", "TITLE_REQUIRED");
      }

      const imageUrl = normalizeText(data.image ?? data.imageUrl);
      if (!imageUrl) {
        throw new AppError(400, "Image is required", "IMAGE_REQUIRED");
      }

      const row = await repository.create({
        name: title,
        ...(supportsCountry ? { country } : {}),
        tag: normalizeText(data.tag ?? data.subtitle ?? data.description),
        image_url: imageUrl,
        display_order: toNumber(data.displayOrder, existing.length),
        is_active: toBoolean(data.isActive, true),
      });

      return toLandingPlace(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      const updates = {};
      const supportsCountry = await repository.supportsCountry();
      if (data.name !== undefined || data.title !== undefined) {
        updates.name = normalizeText(data.title ?? data.name);
      }
      if (supportsCountry && data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        if (String(existing.country || "").toLowerCase() !== country.toLowerCase()) {
          const countryPlaces = await repository.findAll({ is_active: true, country });
          if (countryPlaces.length >= 4) {
            throw new AppError(
              400,
              `Maximum 4 landing places allowed per country (${country})`,
              "MAX_LIMIT_REACHED",
            );
          }
        }
        updates.country = country;
      }
      if (
        data.tag !== undefined ||
        data.subtitle !== undefined ||
        data.description !== undefined
      ) {
        const tag = normalizeText(data.tag ?? data.subtitle ?? data.description);
        if (!tag) {
          throw new AppError(400, "Tag cannot be empty", "INVALID_TAG");
        }
        updates.tag = tag;
      }
      if (data.imageUrl !== undefined || data.image !== undefined)
        updates.image_url = normalizeText(data.image ?? data.imageUrl);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const updated = await repository.update(id, updates);
      return toLandingPlace(updated);
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      await repository.delete(id);
      return { success: true };
    },

    async reorder(items) {
      if (!Array.isArray(items)) {
        throw new AppError(400, "Items must be an array", "INVALID_INPUT");
      }

      await repository.updateOrder(items);
      return { success: true };
    },
  });
}

export { createLandingService };
