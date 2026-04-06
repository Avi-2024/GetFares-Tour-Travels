import { AppError } from "../../core/middlewares/errorHandler.js";
import { normalizeText, toNumber, toSlug } from "../../core/utils/index.js";

function createDestinationsService({ repository }) {
  function toDestination(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      shortDescription: row.short_description,
      country: row.country,
      region: row.region,
      category: row.category,
      rating: parseFloat(row.rating) || 0,
      heroImageUrl: row.hero_image_url,
      thumbnailUrl: row.thumbnail_url,
      isPopular: row.is_popular,
      isNew: row.is_new,
      travelType: row.travel_type,
      season: row.season,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toMedia(row) {
    if (!row) return null;
    return {
      id: row.id,
      destinationId: row.destination_id,
      mediaType: row.media_type,
      mediaUrl: row.media_url,
      thumbnailUrl: row.thumbnail_url,
      title: row.title,
      caption: row.caption,
      displayOrder: row.display_order,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toSeason(row) {
    if (!row) return null;
    return {
      id: row.id,
      destinationId: row.destination_id,
      title: row.title,
      fromMonth: row.from_month,
      toMonth: row.to_month,
      description: row.description,
      tag: row.tag,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      bgColor: row.bg_color,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const rows = await repository.findAll(filters);
      return rows.map(toDestination);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }
      return toDestination(row);
    },

    async getBySlug(slug) {
      const row = await repository.findBySlug(slug);
      if (!row) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }
      return toDestination(row);
    },

    async create(data) {
      const slug = data.slug || toSlug(data.name);

      const existing = await repository.findBySlug(slug);
      if (existing) {
        throw new AppError(
          400,
          "Destination slug already exists",
          "DUPLICATE_SLUG",
        );
      }

      const row = await repository.create({
        name: normalizeText(data.name),
        slug,
        description: normalizeText(data.description),
        short_description: normalizeText(data.shortDescription),
        country: normalizeText(data.country),
        region: normalizeText(data.region),
        category: normalizeText(data.category),
        rating: toNumber(data.rating, 0),
        hero_image_url: normalizeText(data.heroImageUrl),
        thumbnail_url: normalizeText(data.thumbnailUrl),
        is_popular: data.isPopular || false,
        is_new: data.isNew || false,
        travel_type: normalizeText(data.travelType),
        season: normalizeText(data.season),
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        is_active: data.isActive !== false,
      });

      return toDestination(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.name !== undefined) updates.name = normalizeText(data.name);
      if (data.slug !== undefined) {
        const slug = toSlug(data.slug);
        const slugExists = await repository.findBySlug(slug);
        if (slugExists && slugExists.id !== id) {
          throw new AppError(400, "Slug already exists", "DUPLICATE_SLUG");
        }
        updates.slug = slug;
      }
      if (data.description !== undefined)
        updates.description = normalizeText(data.description);
      if (data.shortDescription !== undefined)
        updates.short_description = normalizeText(data.shortDescription);
      if (data.country !== undefined)
        updates.country = normalizeText(data.country);
      if (data.region !== undefined)
        updates.region = normalizeText(data.region);
      if (data.category !== undefined)
        updates.category = normalizeText(data.category);
      if (data.rating !== undefined) updates.rating = toNumber(data.rating);
      if (data.heroImageUrl !== undefined)
        updates.hero_image_url = normalizeText(data.heroImageUrl);
      if (data.thumbnailUrl !== undefined)
        updates.thumbnail_url = normalizeText(data.thumbnailUrl);
      if (data.isPopular !== undefined) updates.is_popular = data.isPopular;
      if (data.isNew !== undefined) updates.is_new = data.isNew;
      if (data.travelType !== undefined)
        updates.travel_type = normalizeText(data.travelType);
      if (data.season !== undefined)
        updates.season = normalizeText(data.season);
      if (data.metaTitle !== undefined)
        updates.meta_title = normalizeText(data.metaTitle);
      if (data.metaDescription !== undefined)
        updates.meta_description = normalizeText(data.metaDescription);
      if (data.isActive !== undefined) updates.is_active = data.isActive;

      const updated = await repository.update(id, updates);
      return toDestination(updated);
    },

    async getMedia(destinationId) {
      await this.getById(destinationId);
      const rows = await repository.findMedia(destinationId);
      return rows.map(toMedia).sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return a.displayOrder - b.displayOrder;
      });
    },

    async addMedia(destinationId, data) {
      await this.getById(destinationId);

      const row = await repository.createMedia({
        destination_id: destinationId,
        media_type: data.mediaType || "image",
        media_url: normalizeText(data.mediaUrl),
        thumbnail_url: normalizeText(data.thumbnailUrl),
        title: normalizeText(data.title),
        caption: normalizeText(data.caption),
        display_order: toNumber(data.displayOrder, 0),
        is_featured: data.isFeatured || false,
      });

      return toMedia(row);
    },

    async updateMedia(mediaId, data) {
      const existing = await repository.findMediaById(mediaId);
      if (!existing) {
        throw new AppError(404, "Media not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.mediaUrl !== undefined)
        updates.media_url = normalizeText(data.mediaUrl);
      if (data.thumbnailUrl !== undefined)
        updates.thumbnail_url = normalizeText(data.thumbnailUrl);
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.caption !== undefined)
        updates.caption = normalizeText(data.caption);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isFeatured !== undefined) updates.is_featured = data.isFeatured;

      const updated = await repository.updateMedia(mediaId, updates);
      return toMedia(updated);
    },

    async deleteMedia(mediaId) {
      const existing = await repository.findMediaById(mediaId);
      if (!existing) {
        throw new AppError(404, "Media not found", "NOT_FOUND");
      }

      await repository.deleteMedia(mediaId);
      return { success: true };
    },

    async getSeasons(destinationId) {
      await this.getById(destinationId);
      const rows = await repository.findSeasons(destinationId);
      return rows.map(toSeason).sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async addSeason(destinationId, data) {
      await this.getById(destinationId);

      const row = await repository.createSeason({
        destination_id: destinationId,
        title: normalizeText(data.title),
        from_month: normalizeText(data.fromMonth),
        to_month: normalizeText(data.toMonth),
        description: normalizeText(data.description),
        tag: normalizeText(data.tag),
        icon_name: normalizeText(data.iconName),
        icon_color: normalizeText(data.iconColor),
        bg_color: normalizeText(data.bgColor),
        display_order: toNumber(data.displayOrder, 0),
      });

      return toSeason(row);
    },

    async updateSeason(seasonId, data) {
      const existing = await repository.findSeasonById(seasonId);
      if (!existing) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.fromMonth !== undefined)
        updates.from_month = normalizeText(data.fromMonth);
      if (data.toMonth !== undefined)
        updates.to_month = normalizeText(data.toMonth);
      if (data.description !== undefined)
        updates.description = normalizeText(data.description);
      if (data.tag !== undefined) updates.tag = normalizeText(data.tag);
      if (data.iconName !== undefined)
        updates.icon_name = normalizeText(data.iconName);
      if (data.iconColor !== undefined)
        updates.icon_color = normalizeText(data.iconColor);
      if (data.bgColor !== undefined)
        updates.bg_color = normalizeText(data.bgColor);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);

      const updated = await repository.updateSeason(seasonId, updates);
      return toSeason(updated);
    },

    async deleteSeason(seasonId) {
      const existing = await repository.findSeasonById(seasonId);
      if (!existing) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }

      await repository.deleteSeason(seasonId);
      return { success: true };
    },

    async getPackages(destinationId) {
      await this.getById(destinationId);
      const rows = await repository.findPackageMaps(destinationId);
      return rows.map((row) => ({
        id: row.id,
        mainPackageId: row.main_package_id,
        packageName: row.name,
        startingPrice: row.starting_price,
        duration: row.duration,
        bannerImageUrl: row.banner_image_url,
        displayOrder: row.display_order,
        isFeatured: row.is_featured,
      }));
    },

    async mapPackage(destinationId, mainPackageId, displayOrder = 0) {
      await this.getById(destinationId);

      const row = await repository.createPackageMap({
        destination_id: destinationId,
        main_package_id: mainPackageId,
        display_order: toNumber(displayOrder, 0),
      });

      return {
        id: row.id,
        destinationId: row.destination_id,
        mainPackageId: row.main_package_id,
        displayOrder: row.display_order,
      };
    },

    async unmapPackage(mapId) {
      await repository.deletePackageMap(mapId);
      return { success: true };
    },
  });
}

export { createDestinationsService };
