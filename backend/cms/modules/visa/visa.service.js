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
    const supportList = parseJsonArray(row.support_list);
    const visaDetails = parseJsonArray(row.visa_details);
    const requirements = parseJsonArray(row.requirements);

    return {
      id: row.id,
      country: row.country,
      title: row.title,
      slug: row.slug,
      subDescription: row.sub_description,
      imageUrl: row.image_url,
      highlights,
      overviewTitle: row.overview_title,
      overviewDescription: row.overview_description,
      quickSupportTitle: row.support_title,
      quickSupportDescription: row.support_description,
      supportIncluded: supportList,
      visaDetails: Array.isArray(visaDetails) ? visaDetails : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      keywords: row.keywords,
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
        title: normalizeText(data.title),
        slug,
        sub_description: normalizeText(data.subDescription),
        image_url: normalizeText(data.imageUrl),
        overview_title: normalizeText(data.overviewTitle),
        overview_description: normalizeText(data.overviewDescription),
        support_title: normalizeText(data.quickSupportTitle),
        support_description: normalizeText(data.quickSupportDescription),
        support_list: JSON.stringify(
          Array.isArray(data.supportIncluded) ? data.supportIncluded : [],
        ),
        highlights: JSON.stringify(Array.isArray(data.highlights) ? data.highlights : []),
        visa_details: JSON.stringify(Array.isArray(data.visaDetails) ? data.visaDetails : []),
        requirements: JSON.stringify(Array.isArray(data.requirements) ? data.requirements : []),
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        keywords: normalizeText(data.keywords),
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
      if (data.subDescription !== undefined)
        updates.sub_description = normalizeText(data.subDescription);
      if (data.imageUrl !== undefined)
        updates.image_url = normalizeText(data.imageUrl);
      if (data.overviewTitle !== undefined)
        updates.overview_title = normalizeText(data.overviewTitle);
      if (data.overviewDescription !== undefined)
        updates.overview_description = normalizeText(data.overviewDescription);
      if (data.quickSupportTitle !== undefined)
        updates.support_title = normalizeText(data.quickSupportTitle);
      if (data.quickSupportDescription !== undefined)
        updates.support_description = normalizeText(data.quickSupportDescription);
      if (data.supportIncluded !== undefined && Array.isArray(data.supportIncluded))
        updates.support_list = JSON.stringify(data.supportIncluded);
      if (data.highlights !== undefined && Array.isArray(data.highlights))
        updates.highlights = JSON.stringify(data.highlights);
      if (data.visaDetails !== undefined && Array.isArray(data.visaDetails))
        updates.visa_details = JSON.stringify(data.visaDetails);
      if (data.requirements !== undefined && Array.isArray(data.requirements))
        updates.requirements = JSON.stringify(data.requirements);
      if (data.metaTitle !== undefined)
        updates.meta_title = normalizeText(data.metaTitle);
      if (data.metaDescription !== undefined)
        updates.meta_description = normalizeText(data.metaDescription);
      if (data.keywords !== undefined)
        updates.keywords = normalizeText(data.keywords);
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
