import { AppError } from "../../core/middlewares/errorHandler.js";
import { normalizeText, toNumber } from "../../core/utils/index.js";

function createCmsMediaService({ repository }) {
  function toMediaAsset(row) {
    if (!row) return null;
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      mediaKind: row.media_kind || "image",
      mediaUrl: row.media_url,
      thumbnailUrl: row.thumbnail_url,
      title: row.title,
      altText: row.alt_text,
      displayOrder: row.display_order || 0,
      isPrimary: row.is_primary === true,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const query = { ...filters };
      if (query.is_active === undefined) {
        query.is_active = true;
      }
      const rows = await repository.findAll(query);
      return rows
        .map(toMediaAsset)
        .sort((first, second) => first.displayOrder - second.displayOrder);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Media asset not found", "NOT_FOUND");
      }
      return toMediaAsset(row);
    },

    async create(data) {
      const row = await repository.create({
        entity_type: normalizeText(data.entityType),
        entity_id: normalizeText(data.entityId),
        media_kind: normalizeText(data.mediaKind || "image"),
        media_url: normalizeText(data.mediaUrl),
        thumbnail_url: normalizeText(data.thumbnailUrl),
        title: normalizeText(data.title),
        alt_text: normalizeText(data.altText),
        display_order: toNumber(data.displayOrder, 0),
        is_primary: data.isPrimary === true,
        is_active: data.isActive !== false,
      });
      return toMediaAsset(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Media asset not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.mediaKind !== undefined) {
        updates.media_kind = normalizeText(data.mediaKind);
      }
      if (data.mediaUrl !== undefined) {
        updates.media_url = normalizeText(data.mediaUrl);
      }
      if (data.thumbnailUrl !== undefined) {
        updates.thumbnail_url = normalizeText(data.thumbnailUrl);
      }
      if (data.title !== undefined) {
        updates.title = normalizeText(data.title);
      }
      if (data.altText !== undefined) {
        updates.alt_text = normalizeText(data.altText);
      }
      if (data.displayOrder !== undefined) {
        updates.display_order = toNumber(data.displayOrder, 0);
      }
      if (data.isPrimary !== undefined) {
        updates.is_primary = data.isPrimary;
      }
      if (data.isActive !== undefined) {
        updates.is_active = data.isActive;
      }

      const row = await repository.update(id, updates);
      return toMediaAsset(row);
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Media asset not found", "NOT_FOUND");
      }

      await repository.deactivate(id);
      return { success: true };
    },
  });
}

export { createCmsMediaService };
