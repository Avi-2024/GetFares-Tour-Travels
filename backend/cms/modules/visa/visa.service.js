import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createVisaService({ repository }) {
  function toVisaDestination(row) {
    if (!row) return null;
    return {
      id: row.id,
      country: row.country,
      title: row.title,
      slug: row.slug,
      subtitle: row.subtitle,
      description: row.description,
      imageUrl: row.image_url,
      heroImageUrl: row.hero_image_url,
      processingTime: row.processing_time,
      supportInfo: row.support_info,
      iconName: row.icon_name,
      highlights: row.highlights || [],
      ctaText: row.cta_text,
      displayOrder: row.display_order,
      isActive: row.is_active,
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
      value: row.value,
      displayOrder: row.display_order,
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
        title: normalizeText(data.title),
        slug,
        subtitle: normalizeText(data.subtitle),
        description: normalizeText(data.description),
        image_url: normalizeText(data.imageUrl),
        hero_image_url: normalizeText(data.heroImageUrl),
        processing_time: normalizeText(data.processingTime),
        support_info: normalizeText(data.supportInfo),
        icon_name: normalizeText(data.iconName),
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
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
      if (data.subtitle !== undefined)
        updates.subtitle = normalizeText(data.subtitle);
      if (data.description !== undefined)
        updates.description = normalizeText(data.description);
      if (data.imageUrl !== undefined)
        updates.image_url = normalizeText(data.imageUrl);
      if (data.heroImageUrl !== undefined)
        updates.hero_image_url = normalizeText(data.heroImageUrl);
      if (data.processingTime !== undefined)
        updates.processing_time = normalizeText(data.processingTime);
      if (data.supportInfo !== undefined)
        updates.support_info = normalizeText(data.supportInfo);
      if (data.iconName !== undefined)
        updates.icon_name = normalizeText(data.iconName);
      if (data.highlights !== undefined && Array.isArray(data.highlights))
        updates.highlights = data.highlights;
      if (data.ctaText !== undefined)
        updates.cta_text = normalizeText(data.ctaText);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const updated = await repository.update(id, updates);
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

    // Details methods
    async getDetails(visaDestinationId, sectionType = null) {
      await this.getById(visaDestinationId); // Verify exists
      const rows = await repository.findDetails(visaDestinationId, sectionType);
      return rows.map(toDetail).sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async addDetail(visaDestinationId, data) {
      await this.getById(visaDestinationId); // Verify exists

      const row = await repository.createDetail({
        visa_destination_id: visaDestinationId,
        section_type: data.sectionType,
        label: normalizeText(data.label),
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
  });
}

export { createVisaService };
