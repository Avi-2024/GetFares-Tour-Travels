import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createVisaService({ repository }) {
  function parseJsonArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function toVisaDestination(row) {
    if (!row) return null;
    const highlights = parseJsonArray(row.highlights);
    const subtitleItems = parseJsonArray(row.subtitle_items);
    const descriptionItems = parseJsonArray(row.description_items);
    const supportList = parseJsonArray(row.support_list);

    return {
      id: row.id,
      country: row.country,
      destination: row.destination,
      title: row.title,
      slug: row.slug,
      subDescription: row.sub_description,
      subtitle: row.subtitle,
      description: row.description,
      descriptionItems,
      subtitleItems,
      imageUrl: row.image_url,
      heroImageUrl: row.hero_image_url,
      processingTime: row.processing_time,
      supportInfo: row.support_info,
      supportTitle: row.support_title,
      supportDescription: row.support_description,
      supportList,
      iconName: row.icon_name,
      highlights,
      ctaText: row.cta_text,
      displayOrder: row.display_order,
      isActive: row.is_active,
      isDeleted: row.is_deleted,
      is_deleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toDetail(row) {
    if (!row) return null;
    return {
      id: row.id,
      visaDestinationId: row.visa_destination_id,
      sectionType: row.section_type,
      label: row.label,
      iconName: row.icon_name,
      colSpan: row.col_span,
      displayStyle: row.display_style,
      accentColor: row.accent_color,
      value: row.value,
      displayOrder: row.display_order,
      isDeleted: row.is_deleted,
      is_deleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const rows = await repository.findAll(filters);
      return rows
        .map(toVisaDestination)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async listDeleted(filters = {}) {
      const rows = await repository.findDeleted(filters);
      return rows
        .map(toVisaDestination)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }
      return toVisaDestination(row);
    },

    async getBySlug(slug) {
      const row = await repository.findBySlug(slug);
      if (!row) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }
      return toVisaDestination(row);
    },

    async create(data) {
      const slug = data.slug || toSlug(data.title);
      const country = normalizeText(data.country);
      if (!country) {
        throw new AppError(
          400,
          "Country is required for visa destination",
          "COUNTRY_REQUIRED",
        );
      }

      // Check if slug exists
      const existing = await repository.findBySlug(slug);
      if (existing) {
        throw new AppError(
          400,
          "Visa destination slug already exists",
          "DUPLICATE_SLUG",
        );
      }

      const row = await repository.create({
        country,
        destination: normalizeText(data.destination),
        title: normalizeText(data.title),
        slug,
        sub_description: normalizeText(data.subDescription),
        subtitle: normalizeText(data.subtitle),
        description: normalizeText(data.description),
        description_items: JSON.stringify(
          Array.isArray(data.descriptionItems) ? data.descriptionItems : [],
        ),
        subtitle_items: JSON.stringify(
          Array.isArray(data.subtitleItems) ? data.subtitleItems : [],
        ),
        image_url: normalizeText(data.imageUrl),
        hero_image_url: normalizeText(data.heroImageUrl),
        processing_time: normalizeText(data.processingTime),
        support_info: normalizeText(data.supportInfo),
        support_title: normalizeText(data.supportTitle),
        support_description: normalizeText(data.supportDescription),
        support_list: JSON.stringify(
          Array.isArray(data.supportList) ? data.supportList : [],
        ),
        icon_name: normalizeText(data.iconName),
        highlights: JSON.stringify(Array.isArray(data.highlights) ? data.highlights : []),
        cta_text: normalizeText(data.ctaText),
        display_order: toNumber(data.displayOrder, 0),
        is_active: toBoolean(data.isActive, true),
      });

      return toVisaDestination(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.destination !== undefined) {
        updates.destination = normalizeText(data.destination);
      }
      if (data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        updates.country = country;
      }
      if (data.slug !== undefined) {
        const slug = toSlug(data.slug);
        const slugExists = await repository.findBySlug(slug);
        if (slugExists && slugExists.id !== id) {
          throw new AppError(400, "Slug already exists", "DUPLICATE_SLUG");
        }
        updates.slug = slug;
      }
      if (data.subDescription !== undefined)
        updates.sub_description = normalizeText(data.subDescription);
      if (data.subtitle !== undefined)
        updates.subtitle = normalizeText(data.subtitle);
      if (data.description !== undefined)
        updates.description = normalizeText(data.description);
      if (data.descriptionItems !== undefined && Array.isArray(data.descriptionItems))
        updates.description_items = JSON.stringify(data.descriptionItems);
      if (data.subtitleItems !== undefined && Array.isArray(data.subtitleItems))
        updates.subtitle_items = JSON.stringify(data.subtitleItems);
      if (data.imageUrl !== undefined)
        updates.image_url = normalizeText(data.imageUrl);
      if (data.heroImageUrl !== undefined)
        updates.hero_image_url = normalizeText(data.heroImageUrl);
      if (data.processingTime !== undefined)
        updates.processing_time = normalizeText(data.processingTime);
      if (data.supportInfo !== undefined)
        updates.support_info = normalizeText(data.supportInfo);
      if (data.supportTitle !== undefined)
        updates.support_title = normalizeText(data.supportTitle);
      if (data.supportDescription !== undefined)
        updates.support_description = normalizeText(data.supportDescription);
      if (data.supportList !== undefined && Array.isArray(data.supportList))
        updates.support_list = JSON.stringify(data.supportList);
      if (data.iconName !== undefined)
        updates.icon_name = normalizeText(data.iconName);
      if (data.highlights !== undefined && Array.isArray(data.highlights))
        updates.highlights = JSON.stringify(data.highlights);
      if (data.ctaText !== undefined)
        updates.cta_text = normalizeText(data.ctaText);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const updated = await repository.update(id, updates);
      return toVisaDestination(updated);
    },

    async updateStatus(id, isActive) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }

      const updated = await repository.update(id, {
        is_active: toBoolean(isActive, true),
      });
      return toVisaDestination(updated);
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }

      await repository.delete(id);
      return { success: true };
    },

    async hardDelete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }

      await repository.hardDelete(id);
      return { success: true };
    },

    async restore(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Visa destination not found", "NOT_FOUND");
      }

      await repository.restore(id);
      return { success: true };
    },

    // Details methods
    async getDetails(visaDestinationId, sectionType = null, includeDeleted = false) {
      await this.getById(visaDestinationId); // Verify exists
      const rows = await repository.findDetails(visaDestinationId, sectionType, includeDeleted);
      return rows.map(toDetail).sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async addDetail(visaDestinationId, data) {
      await this.getById(visaDestinationId); // Verify exists

      const row = await repository.createDetail({
        visa_destination_id: visaDestinationId,
        section_type: data.sectionType,
        label: normalizeText(data.label),
        icon_name: normalizeText(data.iconName),
        col_span: toNumber(data.colSpan, 1),
        display_style: normalizeText(data.displayStyle) || "card",
        accent_color: normalizeText(data.accentColor),
        value: normalizeText(data.value),
        display_order: toNumber(data.displayOrder, 0),
      });

      return toDetail(row);
    },

    async updateDetail(detailId, data) {
      const existing = await repository.findDetailById(detailId);
      if (!existing) {
        throw new AppError(404, "Detail not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.label !== undefined) updates.label = normalizeText(data.label);
      if (data.iconName !== undefined)
        updates.icon_name = normalizeText(data.iconName);
      if (data.colSpan !== undefined) updates.col_span = toNumber(data.colSpan, 1);
      if (data.displayStyle !== undefined)
        updates.display_style = normalizeText(data.displayStyle);
      if (data.accentColor !== undefined)
        updates.accent_color = normalizeText(data.accentColor);
      if (data.value !== undefined) updates.value = normalizeText(data.value);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);

      const updated = await repository.updateDetail(detailId, updates);
      return toDetail(updated);
    },

    async deleteDetail(detailId) {
      const existing = await repository.findDetailById(detailId);
      if (!existing) {
        throw new AppError(404, "Detail not found", "NOT_FOUND");
      }

      await repository.deleteDetail(detailId);
      return { success: true };
    },

    async listDeletedDetails(filters = {}) {
      const rows = await repository.findDeletedDetails(filters);
      return rows.map(toDetail).sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async hardDeleteDetail(detailId) {
      const existing = await repository.findDetailById(detailId);
      if (!existing) {
        throw new AppError(404, "Detail not found", "NOT_FOUND");
      }

      await repository.hardDeleteDetail(detailId);
      return { success: true };
    },

    async restoreDetail(detailId) {
      const existing = await repository.findDetailById(detailId);
      if (!existing) {
        throw new AppError(404, "Detail not found", "NOT_FOUND");
      }

      await repository.restoreDetail(detailId);
      return { success: true };
    },
  });
}

export { createVisaService };
