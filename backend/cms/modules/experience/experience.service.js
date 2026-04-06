import { AppError } from "../../core/middlewares/errorHandler.js";
import { normalizeText, toBoolean, toNumber } from "../../core/utils/index.js";

function createExperienceService({ repository }) {
  function toFeaturedPick(row) {
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      category: row.category,
      campaignType: row.campaign_type || "featured",
      sectionKey: row.section_key || "featured-hot-picks",
      referenceId: row.reference_id,
      country: row.country,
      rating: row.rating ? Number(row.rating) : 0,
      badgeText: row.badge_text,
      originalPrice: row.original_price ? Number(row.original_price) : null,
      discountedPrice:
        row.discounted_price ? Number(row.discounted_price) : null,
      duration: row.duration,
      description: row.description,
      imageUrl: row.image_url,
      buttonText: row.button_text,
      ctaUrl: row.cta_url,
      expiresOn: row.expires_on,
      tags: row.tags || [],
      highlights: row.highlights || [],
      metadata: row.metadata || {},
      displayOrder: row.display_order || 0,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toSeasonCard(row) {
    if (!row) return null;
    return {
      id: row.id,
      destinationId: row.destination_id,
      destinationName: row.destination_name,
      destinationSlug: row.destination_slug,
      destinationThumbnailUrl: row.destination_thumbnail_url,
      title: row.title,
      fromMonth: row.from_month,
      toMonth: row.to_month,
      description: row.description,
      tag: row.tag,
      imageUrl: row.image_url,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      bgColor: row.bg_color,
      displayOrder: row.display_order || 0,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toHeroSection(row) {
    if (!row) return null;
    return {
      id: row.id,
      country: row.country,
      sectionKey: row.section_key,
      eyebrowText: row.eyebrow_text,
      headingLine1: row.heading_line_1,
      headingLine2: row.heading_line_2,
      description: row.description,
      primaryCtaLabel: row.primary_cta_label,
      primaryCtaUrl: row.primary_cta_url,
      secondaryCtaLabel: row.secondary_cta_label,
      secondaryCtaUrl: row.secondary_cta_url,
      backgroundImageUrl: row.background_image_url,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async listFeaturedPicks(filters = {}) {
      const rows = await repository.findFeaturedPicks(filters);
      return rows
        .map(toFeaturedPick)
        .sort((first, second) => first.displayOrder - second.displayOrder);
    },

    async getFeaturedPickById(id) {
      const row = await repository.findFeaturedPickById(id);
      if (!row) {
        throw new AppError(404, "Featured pick not found", "NOT_FOUND");
      }
      return toFeaturedPick(row);
    },

    async createFeaturedPick(data) {
      const country = normalizeText(data.country);
      if (!country) {
        throw new AppError(
          400,
          "Country is required for featured pick",
          "COUNTRY_REQUIRED",
        );
      }

      const row = await repository.createFeaturedPick({
        slug: normalizeText(data.slug),
        title: normalizeText(data.title),
        subtitle: normalizeText(data.subtitle),
        category: normalizeText(data.category || "destination"),
        campaign_type: normalizeText(data.campaignType || "featured"),
        section_key: normalizeText(data.sectionKey || "featured-hot-picks"),
        reference_id: normalizeText(data.referenceId),
        country,
        rating: toNumber(data.rating, 0),
        badge_text: normalizeText(data.badgeText),
        original_price: toNumber(data.originalPrice, null),
        discounted_price: toNumber(data.discountedPrice, null),
        duration: normalizeText(data.duration),
        description: normalizeText(data.description),
        image_url: normalizeText(data.imageUrl),
        button_text: normalizeText(data.buttonText || "Book Now"),
        cta_url: normalizeText(data.ctaUrl),
        expires_on: data.expiresOn || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        metadata:
          data.metadata && typeof data.metadata === "object" ?
            data.metadata
          : {},
        display_order: toNumber(data.displayOrder, 0),
        is_active: toBoolean(data.isActive, true),
      });

      return toFeaturedPick(row);
    },

    async updateFeaturedPick(id, data) {
      const existing = await repository.findFeaturedPickById(id);
      if (!existing) {
        throw new AppError(404, "Featured pick not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.slug !== undefined) updates.slug = normalizeText(data.slug);
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.subtitle !== undefined) {
        updates.subtitle = normalizeText(data.subtitle);
      }
      if (data.category !== undefined)
        updates.category = normalizeText(data.category);
      if (data.campaignType !== undefined) {
        updates.campaign_type = normalizeText(data.campaignType);
      }
      if (data.sectionKey !== undefined) {
        updates.section_key = normalizeText(data.sectionKey);
      }
      if (data.referenceId !== undefined) {
        updates.reference_id = normalizeText(data.referenceId);
      }
      if (data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        updates.country = country;
      }
      if (data.rating !== undefined) updates.rating = toNumber(data.rating, 0);
      if (data.badgeText !== undefined) {
        updates.badge_text = normalizeText(data.badgeText);
      }
      if (data.originalPrice !== undefined) {
        updates.original_price = toNumber(data.originalPrice, null);
      }
      if (data.discountedPrice !== undefined) {
        updates.discounted_price = toNumber(data.discountedPrice, null);
      }
      if (data.duration !== undefined)
        updates.duration = normalizeText(data.duration);
      if (data.description !== undefined) {
        updates.description = normalizeText(data.description);
      }
      if (data.imageUrl !== undefined) {
        updates.image_url = normalizeText(data.imageUrl);
      }
      if (data.buttonText !== undefined) {
        updates.button_text = normalizeText(data.buttonText);
      }
      if (data.ctaUrl !== undefined)
        updates.cta_url = normalizeText(data.ctaUrl);
      if (data.expiresOn !== undefined)
        updates.expires_on = data.expiresOn || null;
      if (data.tags !== undefined && Array.isArray(data.tags))
        updates.tags = data.tags;
      if (data.highlights !== undefined && Array.isArray(data.highlights)) {
        updates.highlights = data.highlights;
      }
      if (data.metadata !== undefined && typeof data.metadata === "object") {
        updates.metadata = data.metadata;
      }
      if (data.displayOrder !== undefined) {
        updates.display_order = toNumber(data.displayOrder, 0);
      }
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const row = await repository.updateFeaturedPick(id, updates);
      return toFeaturedPick(row);
    },

    async deleteFeaturedPick(id) {
      const existing = await repository.findFeaturedPickById(id);
      if (!existing) {
        throw new AppError(404, "Featured pick not found", "NOT_FOUND");
      }

      await repository.deactivateFeaturedPick(id);
      return { success: true };
    },

    async listSeasonCards(filters = {}) {
      const rows = await repository.findSeasonCards(filters);
      return rows.map(toSeasonCard);
    },

    async getSeasonCardById(id) {
      const row = await repository.findSeasonCardById(id);
      if (!row) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }
      return toSeasonCard(row);
    },

    async createSeasonCard(data) {
      const row = await repository.createSeasonCard({
        destination_id: normalizeText(data.destinationId),
        title: normalizeText(data.title),
        from_month: normalizeText(data.fromMonth),
        to_month: normalizeText(data.toMonth),
        description: normalizeText(data.description),
        tag: normalizeText(data.tag),
        image_url: normalizeText(data.imageUrl),
        icon_name: normalizeText(data.iconName),
        icon_color: normalizeText(data.iconColor),
        bg_color: normalizeText(data.bgColor),
        display_order: toNumber(data.displayOrder, 0),
        is_active: toBoolean(data.isActive, true),
      });
      return toSeasonCard(row);
    },

    async updateSeasonCard(id, data) {
      const existing = await repository.findSeasonCardById(id);
      if (!existing) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.destinationId !== undefined) {
        updates.destination_id = normalizeText(data.destinationId);
      }
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.fromMonth !== undefined) {
        updates.from_month = normalizeText(data.fromMonth);
      }
      if (data.toMonth !== undefined)
        updates.to_month = normalizeText(data.toMonth);
      if (data.description !== undefined) {
        updates.description = normalizeText(data.description);
      }
      if (data.tag !== undefined) updates.tag = normalizeText(data.tag);
      if (data.imageUrl !== undefined) {
        updates.image_url = normalizeText(data.imageUrl);
      }
      if (data.iconName !== undefined) {
        updates.icon_name = normalizeText(data.iconName);
      }
      if (data.iconColor !== undefined) {
        updates.icon_color = normalizeText(data.iconColor);
      }
      if (data.bgColor !== undefined)
        updates.bg_color = normalizeText(data.bgColor);
      if (data.displayOrder !== undefined) {
        updates.display_order = toNumber(data.displayOrder, 0);
      }
      if (data.isActive !== undefined) {
        updates.is_active = toBoolean(data.isActive, true);
      }

      const row = await repository.updateSeasonCard(id, updates);
      return toSeasonCard(row);
    },

    async deleteSeasonCard(id) {
      const existing = await repository.findSeasonCardById(id);
      if (!existing) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }

      await repository.deleteSeasonCard(id);
      return { success: true };
    },

    async listHeroSections(filters = {}) {
      const rows = await repository.findHeroSections(filters);
      return rows.map(toHeroSection);
    },

    async upsertHeroSection(sectionKey, data) {
      const country = normalizeText(data.country);
      if (!country) {
        throw new AppError(
          400,
          "Country is required for hero section",
          "COUNTRY_REQUIRED",
        );
      }

      const row = await repository.upsertHeroSection(sectionKey, {
        country,
        eyebrow_text: normalizeText(data.eyebrowText),
        heading_line_1: normalizeText(data.headingLine1),
        heading_line_2: normalizeText(data.headingLine2),
        description: normalizeText(data.description),
        primary_cta_label: normalizeText(data.primaryCtaLabel),
        primary_cta_url: normalizeText(data.primaryCtaUrl),
        secondary_cta_label: normalizeText(data.secondaryCtaLabel),
        secondary_cta_url: normalizeText(data.secondaryCtaUrl),
        background_image_url: normalizeText(data.backgroundImageUrl),
        is_active: toBoolean(data.isActive, true),
      });
      return toHeroSection(row);
    },
  });
}

export { createExperienceService };
