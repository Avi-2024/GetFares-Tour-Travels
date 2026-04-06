import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createLandingService({ repository }) {
  function toLandingPlace(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      subtitle: row.subtitle,
      description: row.description,
      tag: row.tag,
      imageUrl: row.image_url,
      ctaText: row.cta_text,
      ctaUrl: row.cta_url,
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
      const existing = await repository.findAll({ is_active: true });
      if (existing.length >= 4) {
        throw new AppError(
          400,
          "Maximum 4 landing places allowed",
          "MAX_LIMIT_REACHED",
        );
      }

      const row = await repository.create({
        name: normalizeText(data.name),
        slug: toSlug(data.slug || data.name),
        subtitle: normalizeText(data.subtitle),
        description: normalizeText(data.description),
        tag: normalizeText(data.tag),
        image_url: normalizeText(data.imageUrl),
        cta_text: normalizeText(data.ctaText),
        cta_url: normalizeText(data.ctaUrl),
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
      if (data.name !== undefined) updates.name = normalizeText(data.name);
      if (data.slug !== undefined) updates.slug = toSlug(data.slug);
      if (data.subtitle !== undefined)
        updates.subtitle = normalizeText(data.subtitle);
      if (data.description !== undefined)
        updates.description = normalizeText(data.description);
      if (data.tag !== undefined) updates.tag = normalizeText(data.tag);
      if (data.imageUrl !== undefined)
        updates.image_url = normalizeText(data.imageUrl);
      if (data.ctaText !== undefined)
        updates.cta_text = normalizeText(data.ctaText);
      if (data.ctaUrl !== undefined)
        updates.cta_url = normalizeText(data.ctaUrl);
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
