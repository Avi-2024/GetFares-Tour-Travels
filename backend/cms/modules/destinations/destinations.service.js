import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  findDisplayOrderConflict,
  normalizeDisplayOrderInput,
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createDestinationsService({ repository }) {
  function parseCountryIds(value) {
    const parsed = parseJsonValue(value, value);
    const source =
      Array.isArray(parsed) ? parsed
      : typeof parsed === "string" ? parsed.split(",")
      : [];

    return Array.from(
      new Set(
        source
          .map((item) => normalizeText(item))
          .filter((item) => Boolean(item)),
      ),
    );
  }

  function includesCountryId(countryIds, countryId) {
    if (!countryId) return true;
    if (!Array.isArray(countryIds) || countryIds.length === 0) return true;
    return countryIds.some(
      (id) =>
        String(id).trim().toLowerCase() ===
        String(countryId).trim().toLowerCase(),
    );
  }

  function toDisplayTextList(items = [], formatter) {
    return items.map((item) => formatter(item)).filter((item) => Boolean(item));
  }

  function parseJsonValue(value, fallback) {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return value;
  }

  function normalizeStringList(value) {
    const parsed = parseJsonValue(value, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeText(item))
      .filter((item) => Boolean(item));
  }

  function normalizeStringOrList(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeText(item))
        .filter((item) => Boolean(item));
    }

    if (typeof value === "string") {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return [];
      }

      const parsed = parseJsonValue(normalizedValue, null);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeText(item))
          .filter((item) => Boolean(item));
      }

      return normalizedValue
        .split(",")
        .map((item) => normalizeText(item))
        .filter((item) => Boolean(item));
    }

    const normalized = normalizeText(value);
    return normalized ? [normalized] : [];
  }

  function normalizeObjectList(value, mapper) {
    const parsed = parseJsonValue(value, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item, index) => mapper(item, index))
      .filter((item) => Boolean(item));
  }

  function normalizeMediaPayload(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const titleImage =
      normalizeText(value.title_image) ||
      normalizeText(value.titleImage) ||
      null;
    const gallerySource =
      Array.isArray(value.gallery) ? value.gallery
      : Array.isArray(value.galary) ? value.galary
      : [];
    const gallery = gallerySource
      .map((item) => normalizeText(item))
      .filter((item) => Boolean(item))
      .slice(0, 4);
    return {
      title_image: titleImage,
      gallery,
    };
  }

  function toDestination(row) {
    if (!row) return null;
    const categories = normalizeStringOrList(row.categories ?? row.category);
    const seasonFocus = normalizeStringOrList(row.season_focus ?? row.season);
    const parsedMedia = normalizeMediaPayload(
      parseJsonValue(row.media, row.media),
    );
    const titleImage =
      normalizeText(parsedMedia?.title_image) ||
      normalizeText(row.title_image_url) ||
      normalizeText(row.thumbnail_url) ||
      normalizeText(row.hero_image_url) ||
      null;
    const countryIds = parseCountryIds(row.country_ids);
    const services = normalizeObjectList(row.services, (item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        title: normalizeText(item.title),
        description: normalizeText(item.description),
      };
    });
    const bestTimeToVisit = normalizeObjectList(
      row.best_time_to_visit,
      (item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        return {
          iconName: normalizeText(item.iconName || item.icon_name),
          color: normalizeText(item.color),
          title: normalizeText(item.title),
          from: normalizeText(item.from),
          to: normalizeText(item.to),
          description: normalizeText(item.description),
          suggestion: normalizeText(item.suggestion),
        };
      },
    );
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      shortDescription: row.short_description,
      country: row.country,
      countryIds,
      region: row.region,
      category: categories[0] || normalizeText(row.category),
      categories,
      rating: parseFloat(row.rating) || 0,
      isPopular: row.is_popular,
      isNew: row.is_new,
      travelType: row.travel_type,
      season: seasonFocus[0] || normalizeText(row.season),
      seasonFocus,
      keyHighlights: normalizeStringList(row.key_highlights),
      services,
      servicesDisplay: toDisplayTextList(services, (item) =>
        [item.title, item.description]
          .filter((part) => Boolean(part))
          .join(": "),
      ),
      bestTimeToVisit,
      bestTimeToVisitDisplay: toDisplayTextList(bestTimeToVisit, (item) => {
        const monthRange = [item.from, item.to]
          .filter((part) => Boolean(part))
          .join("-");
        return [item.title, monthRange, item.description]
          .filter((part) => Boolean(part))
          .join(" | ");
      }),
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      displayOrder: toNumber(row.display_order, -1),
      isActive: row.is_active,
      isDeleted: row.is_deleted,
      is_deleted: row.is_deleted,
      media: {
        title_image: titleImage,
        gallery: Array.isArray(parsedMedia?.gallery) ? parsedMedia.gallery : [],
      },
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

  function toGalleryUrls(mediaRows, titleImageUrl, inlineGallery = []) {
    const titleUrl = normalizeText(titleImageUrl);
    const urls = [
      ...inlineGallery,
      ...mediaRows
        .sort(
          (a, b) => toNumber(a.display_order, 0) - toNumber(b.display_order, 0),
        )
        .map((item) => normalizeText(item.media_url))
        .filter((url) => Boolean(url) && url !== titleUrl),
    ];
    return Array.from(new Set(urls)).slice(0, 4);
  }

  async function reassignDestinationDisplayOrder({
    displayOrder,
    excludeId = null,
  }) {
    const normalizedOrder = normalizeDisplayOrderInput(displayOrder, -1);
    if (normalizedOrder < 0) {
      return normalizedOrder;
    }
    const rows = await repository.findAll({ includeDeleted: true });
    const duplicate = findDisplayOrderConflict(
      normalizedOrder,
      rows,
      excludeId,
    );
    if (duplicate) {
      await repository.update(duplicate.id, { display_order: -1 });
    }
    return normalizedOrder;
  }

  return Object.freeze({
    async list(filters = {}) {
      const { countryId, countryIds, ...repositoryFilters } = filters;
      const rows = await repository.findAll(repositoryFilters);
      const requestedCountryId =
        normalizeText(countryId) || parseCountryIds(countryIds)[0] || null;
      const destinations = rows
        .map(toDestination)
        .filter((destination) =>
          includesCountryId(destination.countryIds || [], requestedCountryId),
        );
      return Promise.all(
        destinations.map(async (destination) => {
          const mediaRows = await repository.findMedia(destination.id);
          const gallery = toGalleryUrls(
            mediaRows,
            destination.media?.title_image,
            destination.media?.gallery,
          );
          return {
            ...destination,
            media: {
              ...destination.media,
              gallery,
            },
          };
        }),
      );
    },

    async listDeleted(filters = {}) {
      const { countryId, countryIds, ...repositoryFilters } = filters;
      const rows = await repository.findAll({
        ...repositoryFilters,
        is_deleted: true,
      });
      const requestedCountryId =
        normalizeText(countryId) || parseCountryIds(countryIds)[0] || null;
      const destinations = rows
        .map(toDestination)
        .filter((destination) =>
          includesCountryId(destination.countryIds || [], requestedCountryId),
        );
      return Promise.all(
        destinations.map(async (destination) => {
          const mediaRows = await repository.findMedia(destination.id);
          const gallery = toGalleryUrls(
            mediaRows,
            destination.media?.title_image,
            destination.media?.gallery,
          );
          return {
            ...destination,
            media: {
              ...destination.media,
              gallery,
            },
          };
        }),
      );
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }
      const destination = toDestination(row);
      const mediaRows = await repository.findMedia(destination.id);
      const gallery = toGalleryUrls(
        mediaRows,
        destination.media?.title_image,
        destination.media?.gallery,
      );
      return {
        ...destination,
        media: {
          ...destination.media,
          gallery,
        },
      };
    },

    async getBySlug(slug) {
      const row = await repository.findBySlug(slug);
      if (!row) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }
      const destination = toDestination(row);
      const mediaRows = await repository.findMedia(destination.id);
      const gallery = toGalleryUrls(
        mediaRows,
        destination.media?.title_image,
        destination.media?.gallery,
      );
      return {
        ...destination,
        media: {
          ...destination.media,
          gallery,
        },
      };
    },

    async create(data) {
      const slug = data.slug || toSlug(data.name);
      const country = normalizeText(data.country);
      const countryIds = parseCountryIds(
        data.countryIds ?? data.country_ids ?? data.countryId,
      );
      if (!country && !countryIds.length) {
        throw new AppError(
          400,
          "At least one country or countryId is required for destination",
          "COUNTRY_REQUIRED",
        );
      }

      const existing = await repository.findBySlug(slug);
      if (existing) {
        throw new AppError(
          400,
          "Destination slug already exists",
          "DUPLICATE_SLUG",
        );
      }

      const categories = normalizeStringOrList(
        data.categories ?? data.category,
      );
      const seasonFocus = normalizeStringOrList(
        data.seasonFocus ?? data.season,
      );
      const mediaPayload = normalizeMediaPayload(data.media);
      const titleImageUrl =
        normalizeText(data.titleImageUrl) ||
        normalizeText(mediaPayload?.title_image) ||
        normalizeText(data.thumbnailUrl) ||
        normalizeText(data.heroImageUrl);

      const row = await repository.create({
        name: normalizeText(data.name),
        slug,
        description: normalizeText(data.description),
        short_description: normalizeText(data.shortDescription),
        country,
        country_ids: countryIds,
        region: normalizeText(data.region),
        category: categories[0] || null,
        categories,
        rating: (() => {
          const rating = toNumber(data.rating, null);
          if (rating !== null && (rating < 0 || rating > 5)) {
            throw new AppError(
              400,
              "Rating must be between 0 and 5",
              "INVALID_RATING",
            );
          }
          return rating;
        })(),
        title_image_url: titleImageUrl,
        media: mediaPayload,
        is_popular: toBoolean(data.isPopular, false),
        is_new: toBoolean(data.isNew, false),
        travel_type: normalizeText(data.travelType),
        season: seasonFocus[0] || null,
        season_focus: seasonFocus,
        key_highlights:
          Array.isArray(data.keyHighlights) ? data.keyHighlights : [],
        services: Array.isArray(data.services) ? data.services : [],
        best_time_to_visit:
          Array.isArray(data.bestTimeToVisit) ? data.bestTimeToVisit : [],
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        display_order: await reassignDestinationDisplayOrder({
          displayOrder: data.displayOrder,
        }),
        is_active: toBoolean(data.isActive, true),
      });

      const destination = toDestination(row);
      return {
        ...destination,
        media: {
          ...destination.media,
          gallery:
            Array.isArray(mediaPayload?.gallery) ? mediaPayload.gallery : [],
        },
      };
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
      if (data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        updates.country = country;
      }
      if (
        data.countryIds !== undefined ||
        data.country_ids !== undefined ||
        data.countryId !== undefined
      ) {
        updates.country_ids = parseCountryIds(
          data.countryIds ?? data.country_ids ?? data.countryId,
        );
      }
      if (data.region !== undefined)
        updates.region = normalizeText(data.region);
      if (data.category !== undefined || data.categories !== undefined) {
        const categories = normalizeStringOrList(
          data.categories ?? data.category,
        );
        updates.category = categories[0] || null;
        updates.categories = categories;
      }
      if (data.rating !== undefined) {
        const rating = toNumber(data.rating);
        if (rating !== null && (rating < 0 || rating > 5)) {
          throw new AppError(
            400,
            "Rating must be between 0 and 5",
            "INVALID_RATING",
          );
        }
        updates.rating = rating;
      }
      if (data.media !== undefined) {
        const mediaPayload = normalizeMediaPayload(data.media);
        if (!mediaPayload) {
          throw new AppError(400, "Invalid media payload", "INVALID_MEDIA");
        }
        updates.media = mediaPayload;
        updates.title_image_url = normalizeText(mediaPayload.title_image);
      }
      if (data.titleImageUrl !== undefined) {
        updates.title_image_url = normalizeText(data.titleImageUrl);
      }
      if (data.isPopular !== undefined)
        updates.is_popular = toBoolean(data.isPopular, false);
      if (data.isNew !== undefined)
        updates.is_new = toBoolean(data.isNew, false);
      if (data.travelType !== undefined)
        updates.travel_type = normalizeText(data.travelType);
      if (data.season !== undefined || data.seasonFocus !== undefined) {
        const seasonFocus = normalizeStringOrList(
          data.seasonFocus ?? data.season,
        );
        updates.season = seasonFocus[0] || null;
        updates.season_focus = seasonFocus;
      }
      if (data.keyHighlights !== undefined) {
        updates.key_highlights =
          Array.isArray(data.keyHighlights) ? data.keyHighlights : [];
      }
      if (data.services !== undefined) {
        updates.services = Array.isArray(data.services) ? data.services : [];
      }
      if (data.bestTimeToVisit !== undefined) {
        updates.best_time_to_visit =
          Array.isArray(data.bestTimeToVisit) ? data.bestTimeToVisit : [];
      }
      if (data.metaTitle !== undefined)
        updates.meta_title = normalizeText(data.metaTitle);
      if (data.metaDescription !== undefined)
        updates.meta_description = normalizeText(data.metaDescription);
      if (data.displayOrder !== undefined) {
        updates.display_order = await reassignDestinationDisplayOrder({
          displayOrder: data.displayOrder,
          excludeId: id,
        });
      }
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const updated = await repository.update(id, updates);
      const destination = toDestination(updated);
      const mediaRows = await repository.findMedia(destination.id);
      const gallery = toGalleryUrls(
        mediaRows,
        destination.media?.title_image,
        destination.media?.gallery,
      );
      return {
        ...destination,
        media: {
          ...destination.media,
          gallery,
        },
      };
    },

    async updateStatus(id, isActive) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }

      const updated = await repository.update(id, {
        is_active: toBoolean(isActive, true),
      });
      const destination = toDestination(updated);
      const mediaRows = await repository.findMedia(destination.id);
      const gallery = toGalleryUrls(
        mediaRows,
        destination.media?.title_image,
        destination.media?.gallery,
      );
      return {
        ...destination,
        media: {
          ...destination.media,
          gallery,
        },
      };
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }

      await repository.delete(id);
      return { success: true };
    },

    async hardDelete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }

      await repository.hardDelete(id);
      return { success: true };
    },

    async restore(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Destination not found", "NOT_FOUND");
      }

      await repository.restore(id);
      return { success: true };
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
        is_featured: toBoolean(data.isFeatured, false),
      });

      return toMedia(row);
    },

    async updateMedia(mediaId, data) {
      const existing = await repository.findMediaById(mediaId);
      if (!existing) {
        throw new AppError(404, "Media not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.mediaType !== undefined)
        updates.media_type = normalizeText(data.mediaType);
      if (data.mediaUrl !== undefined)
        updates.media_url = normalizeText(data.mediaUrl);
      if (data.thumbnailUrl !== undefined)
        updates.thumbnail_url = normalizeText(data.thumbnailUrl);
      if (data.title !== undefined) updates.title = normalizeText(data.title);
      if (data.caption !== undefined)
        updates.caption = normalizeText(data.caption);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isFeatured !== undefined)
        updates.is_featured = toBoolean(data.isFeatured, false);

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

    async hardDeleteMedia(mediaId) {
      const existing = await repository.findMediaById(mediaId);
      if (!existing) {
        throw new AppError(404, "Media not found", "NOT_FOUND");
      }

      await repository.hardDeleteMedia(mediaId);
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

    async hardDeleteSeason(seasonId) {
      const existing = await repository.findSeasonById(seasonId);
      if (!existing) {
        throw new AppError(404, "Season card not found", "NOT_FOUND");
      }

      await repository.hardDeleteSeason(seasonId);
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
      const destination = await this.getById(destinationId);
      const mainPackage = await repository.findMainPackageById(mainPackageId);
      if (!mainPackage) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }
      if (!destination.country || !mainPackage.country) {
        throw new AppError(
          400,
          "Both destination and main package must have country configured",
          "COUNTRY_REQUIRED",
        );
      }

      if (
        String(destination.country).toLowerCase() !==
        String(mainPackage.country).toLowerCase()
      ) {
        throw new AppError(
          400,
          "Main package country does not match destination country",
          "COUNTRY_MISMATCH",
        );
      }

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

    async hardUnmapPackage(mapId) {
      await repository.hardDeletePackageMap(mapId);
      return { success: true };
    },
  });
}

export { createDestinationsService };
