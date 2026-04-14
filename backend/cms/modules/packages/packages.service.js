import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createCmsPackagesService({ repository }) {
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

  function normalizeObjectList(value, mapper) {
    const parsed = parseJsonValue(value, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item, index) => mapper(item, index))
      .filter((item) => Boolean(item));
  }

  function toPackage(row) {
    if (!row) return null;
    const galleryImageUrls = parseJsonValue(row.gallery_image_urls, []);
    const itinerary = parseJsonValue(row.itinerary, null);
    return {
      id: row.id,
      name: row.name,
      destination: row.destination,
      duration: row.duration,
      startingPrice: parseFloat(row.starting_price) || 0,
      inclusions: row.inclusions,
      exclusions: row.exclusions,
      hotelDetails: row.hotel_details,
      packageCategory: row.package_category,
      bannerImageUrl: row.banner_image_url,
      galleryImageUrls: Array.isArray(galleryImageUrls) ? galleryImageUrls : [],
      itinerary,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      cancellationPolicy: row.cancellation_policy,
      status: row.status,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      keywords: row.keywords,
      publishToWebsite: row.publish_to_website,
      websiteSlug: row.website_slug,
      isSoldOut: row.is_sold_out,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toMainPackage(row) {
    if (!row) return null;
    const features = normalizeObjectList(row.features, (item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        iconName: normalizeText(item.iconName || item.icon_name),
        description: normalizeText(item.description),
      };
    });
    const inclusions = normalizeObjectList(row.inclusions, (item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        iconName: normalizeText(item.iconName || item.icon_name),
        description: normalizeText(item.description),
      };
    });
    return {
      id: row.id,
      packageId: row.package_id,
      destinationId: row.destination_id ?? null,
      country: row.country || row.destination_country || "",
      title: normalizeText(row.title || row.package_name || row.legacy_package_name),
      amount:
        toNumber(
          row.amount ??
            row.starting_price ??
            row.startingPrice,
          0,
        ) || 0,
      destination:
        normalizeText(
          row.destination_name || row.destination || row.legacy_destination,
        ) || "--",
      features,
      inclusions,
      metaTitle: row.meta_title || null,
      metaDescription: row.meta_description || null,
      keywords: row.keywords || null,
      displayOrder: row.display_order,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toSubPackage(row) {
    if (!row) return null;
    const features = normalizeObjectList(row.features, (item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        title: normalizeText(item.title),
        description: normalizeText(item.description),
      };
    });
    const itineraries = normalizeObjectList(row.itineraries, (item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      return {
        day: toNumber(item.day, index + 1) || index + 1,
        title: normalizeText(item.title),
        description: normalizeText(item.description),
        features: normalizeObjectList(item.features, (feature) => {
          if (!feature || typeof feature !== "object") {
            return null;
          }
          return {
            title: normalizeText(feature.title),
            description: normalizeText(feature.description),
          };
        }),
      };
    });
    return {
      id: row.id,
      mainPackageId: row.main_package_id,
      packageId: row.package_id,
      title: normalizeText(row.title || row.package_name || row.legacy_package_name),
      image: row.image || null,
      rating: toNumber(row.rating, 0) || 0,
      location: row.location || null,
      durationDays: toNumber(row.duration_days, 0) || 0,
      durationNights: toNumber(row.duration_nights, 0) || 0,
      duration: row.duration || null,
      startingPrice: toNumber(row.starting_price, 0) || 0,
      transport: row.transport || null,
      description: row.description || null,
      snapshot: row.snapshot || null,
      features,
      itineraries,
      highlights: normalizeStringList(row.highlights),
      inclusions: normalizeStringList(row.inclusions),
      exclusions: normalizeStringList(row.exclusions),
      paymentTerms: normalizeStringList(row.payment_terms),
      cancellationPolicy: normalizeStringList(row.cancellation_policy),
      tnc: normalizeStringList(row.tnc),
      impNotes: normalizeStringList(row.imp_notes),
      metaTitle: row.meta_title || null,
      metaDescription: row.meta_description || null,
      keywords: row.keywords || null,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async listPublished(filters = {}) {
      const rows = await repository.findPublishedPackages(filters);
      return rows.map(toPackage);
    },

    async listDeleted(filters = {}) {
      const rows = await repository.findDeletedPackages(filters);
      return rows.map(toPackage);
    },

    async getPackageById(id) {
      const row = await repository.findPackageById(id);
      if (!row || row.is_deleted) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }
      return toPackage(row);
    },

    async createPublishedPackage(data) {
      const name = normalizeText(data.name);
      const destinationId = normalizeText(data.destinationId);
      let destination = normalizeText(data.destination);
      if (!destination && destinationId) {
        const destinationRow = await repository.findDestinationById(destinationId);
        if (!destinationRow) {
          throw new AppError(
            400,
            "Destination not found",
            "DESTINATION_NOT_FOUND",
          );
        }
        destination = normalizeText(destinationRow.name);
      }
      if (!name || !destination) {
        throw new AppError(
          400,
          "Name and destination are required",
          "VALIDATION_ERROR",
        );
      }

      const publishToWebsite = toBoolean(data.publishToWebsite, false);
      const websiteSlug = normalizeText(data.websiteSlug || toSlug(name));
      if (publishToWebsite && !websiteSlug) {
        throw new AppError(
          400,
          "Website slug is required when package is published",
          "VALIDATION_ERROR",
        );
      }

      if (websiteSlug) {
        const existingSlug = await repository.findPackageByWebsiteSlug(websiteSlug);
        if (existingSlug) {
          throw new AppError(
            400,
            "Website slug already exists",
            "DUPLICATE_WEBSITE_SLUG",
          );
        }
      }

      const row = await repository.createPackage({
        name,
        destination,
        duration: normalizeText(data.duration),
        starting_price: toNumber(data.startingPrice, 0),
        inclusions: normalizeText(data.inclusions),
        exclusions: normalizeText(data.exclusions),
        itinerary:
          data.itinerary && typeof data.itinerary === "object" ?
            data.itinerary
          : null,
        hotel_details: normalizeText(data.hotelDetails),
        valid_from: data.validFrom || null,
        valid_to: data.validTo || null,
        cancellation_policy: normalizeText(data.cancellationPolicy),
        package_category: normalizeText(data.packageCategory),
        status: normalizeText(data.status || "DRAFT"),
        banner_image_url: normalizeText(data.bannerImageUrl),
        gallery_image_urls: JSON.stringify(Array.isArray(data.galleryImageUrls) ? data.galleryImageUrls : []),
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        keywords: normalizeText(data.keywords),
        publish_to_website: publishToWebsite,
        website_slug: websiteSlug || null,
        is_sold_out: toBoolean(data.isSoldOut, false),
        is_deleted: false,
      });

      return toPackage(row);
    },

    async updatePublishedPackage(id, data) {
      const existing = await repository.findPackageById(id);
      if (!existing || existing.is_deleted) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.name !== undefined) {
        const name = normalizeText(data.name);
        if (!name) {
          throw new AppError(400, "Name cannot be empty", "VALIDATION_ERROR");
        }
        updates.name = name;
      }
      if (data.destinationId !== undefined) {
        const destinationId = normalizeText(data.destinationId);
        if (!destinationId) {
          throw new AppError(
            400,
            "Destination cannot be empty",
            "VALIDATION_ERROR",
          );
        }
        const destinationRow = await repository.findDestinationById(destinationId);
        if (!destinationRow) {
          throw new AppError(
            400,
            "Destination not found",
            "DESTINATION_NOT_FOUND",
          );
        }
        updates.destination = normalizeText(destinationRow.name);
      } else if (data.destination !== undefined) {
        const destination = normalizeText(data.destination);
        if (!destination) {
          throw new AppError(
            400,
            "Destination cannot be empty",
            "VALIDATION_ERROR",
          );
        }
        updates.destination = destination;
      }
      if (data.duration !== undefined)
        updates.duration = normalizeText(data.duration);
      if (data.startingPrice !== undefined)
        updates.starting_price = toNumber(data.startingPrice, 0);
      if (data.inclusions !== undefined)
        updates.inclusions = normalizeText(data.inclusions);
      if (data.exclusions !== undefined)
        updates.exclusions = normalizeText(data.exclusions);
      if (data.itinerary !== undefined) {
        updates.itinerary =
          data.itinerary && typeof data.itinerary === "object" ? data.itinerary : null;
      }
      if (data.hotelDetails !== undefined)
        updates.hotel_details = normalizeText(data.hotelDetails);
      if (data.validFrom !== undefined) updates.valid_from = data.validFrom || null;
      if (data.validTo !== undefined) updates.valid_to = data.validTo || null;
      if (data.cancellationPolicy !== undefined) {
        updates.cancellation_policy = normalizeText(data.cancellationPolicy);
      }
      if (data.packageCategory !== undefined) {
        updates.package_category = normalizeText(data.packageCategory);
      }
      if (data.status !== undefined) updates.status = normalizeText(data.status);
      if (data.bannerImageUrl !== undefined) {
        updates.banner_image_url = data.bannerImageUrl;
      }
      if (data.galleryImageUrls !== undefined && Array.isArray(data.galleryImageUrls)) {
        updates.gallery_image_urls = JSON.stringify(data.galleryImageUrls);
      }
      if (data.publishToWebsite !== undefined) {
        updates.publish_to_website = toBoolean(data.publishToWebsite, true);
      }
      if (data.websiteSlug !== undefined) {
        const websiteSlug = normalizeText(data.websiteSlug);
        if (websiteSlug) {
          const existingSlug = await repository.findPackageByWebsiteSlug(websiteSlug);
          if (existingSlug && existingSlug.id !== id) {
            throw new AppError(
              400,
              "Website slug already exists",
              "DUPLICATE_WEBSITE_SLUG",
            );
          }
          updates.website_slug = websiteSlug;
        } else {
          updates.website_slug = null;
        }
      }
      if (data.metaTitle !== undefined)
        updates.meta_title = normalizeText(data.metaTitle);
      if (data.metaDescription !== undefined)
        updates.meta_description = normalizeText(data.metaDescription);
      if (data.keywords !== undefined)
        updates.keywords = normalizeText(data.keywords);
      if (data.isSoldOut !== undefined)
        updates.is_sold_out = toBoolean(data.isSoldOut, false);

      if (!Object.keys(updates).length) {
        return toPackage(existing);
      }

      const updated = await repository.updatePackageById(id, updates);
      return toPackage(updated);
    },

    async deletePublishedPackage(id) {
      const existing = await repository.findPackageById(id);
      if (!existing || existing.is_deleted) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }

      await repository.softDeletePackageById(id);
      return { success: true };
    },

    async hardDeletePublishedPackage(id) {
      const existing = await repository.findPackageById(id);
      if (!existing) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }

      await repository.hardDeletePackageById(id);
      return { success: true };
    },

    async restorePublishedPackage(id) {
      const existing = await repository.findPackageById(id);
      if (!existing) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }

      await repository.restorePackageById(id);
      return { success: true };
    },

    async listMainPackages(filters = {}) {
      const rows = await repository.findAllMainPackages(filters);
      return rows.map(toMainPackage);
    },

    async listDeletedMainPackages(filters = {}) {
      const rows = await repository.findDeletedMainPackages(filters);
      return rows.map(toMainPackage);
    },

    async getMainPackageById(id) {
      const row = await repository.findMainPackageById(id);
      if (!row) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }
      return toMainPackage(row);
    },

    async createMainPackage(data) {
      const destinationId = normalizeText(data.destinationId);
      if (!destinationId) {
        throw new AppError(
          400,
          "Destination is required for main package",
          "DESTINATION_REQUIRED",
        );
      }
      const destination = await repository.findDestinationById(destinationId);
      if (!destination) {
        throw new AppError(404, "Destination not found", "DESTINATION_NOT_FOUND");
      }
      const title = normalizeText(data.title);
      if (!title) {
        throw new AppError(400, "Title is required", "TITLE_REQUIRED");
      }

      const row = await repository.createMainPackage({
        package_id: normalizeText(data.packageId) || null,
        destination_id: destinationId,
        country: normalizeText(data.country) || normalizeText(destination.country),
        title,
        amount: toNumber(data.amount, 0),
        features: Array.isArray(data.features) ? data.features : [],
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        keywords: normalizeText(data.keywords),
        display_order: toNumber(data.displayOrder, 0),
        is_featured: toBoolean(data.isFeatured, false),
      });

      const withJoin = await repository.findMainPackageById(row.id);
      return toMainPackage(withJoin || row);
    },

    async updateMainPackage(id, data) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.destinationId !== undefined) {
        const destinationId = normalizeText(data.destinationId);
        if (!destinationId) {
          throw new AppError(
            400,
            "Destination cannot be empty",
            "INVALID_DESTINATION",
          );
        }
        const destination = await repository.findDestinationById(destinationId);
        if (!destination) {
          throw new AppError(404, "Destination not found", "DESTINATION_NOT_FOUND");
        }
        updates.destination_id = destinationId;
      }
      if (data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        updates.country = country;
      }
      if (data.title !== undefined) {
        const title = normalizeText(data.title);
        if (!title) {
          throw new AppError(400, "Title cannot be empty", "INVALID_TITLE");
        }
        updates.title = title;
      }
      if (data.amount !== undefined) {
        updates.amount = toNumber(data.amount, 0);
      }
      if (data.features !== undefined) {
        updates.features = Array.isArray(data.features) ? data.features : [];
      }
      if (data.inclusions !== undefined) {
        updates.inclusions = Array.isArray(data.inclusions) ? data.inclusions : [];
      }
      if (data.metaTitle !== undefined) {
        updates.meta_title = normalizeText(data.metaTitle);
      }
      if (data.metaDescription !== undefined) {
        updates.meta_description = normalizeText(data.metaDescription);
      }
      if (data.keywords !== undefined) {
        updates.keywords = normalizeText(data.keywords);
      }
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isFeatured !== undefined)
        updates.is_featured = toBoolean(data.isFeatured, false);

      const updated = await repository.updateMainPackage(id, updates);
      const withJoin = await repository.findMainPackageById(updated.id);
      return toMainPackage(withJoin || updated);
    },

    async deleteMainPackage(id) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      await repository.deleteMainPackage(id);
      return { success: true };
    },

    async hardDeleteMainPackage(id) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      await repository.hardDeleteMainPackage(id);
      return { success: true };
    },

    async restoreMainPackage(id) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      await repository.restoreMainPackage(id);
      return { success: true };
    },

    async listSubPackages(mainPackageId, filters = {}) {
      const mainPackage = await repository.findMainPackageById(mainPackageId);
      if (!mainPackage) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }
      if (
        filters.country &&
        String(mainPackage.country || "").toLowerCase() !==
          String(filters.country).toLowerCase()
      ) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      const rows = await repository.findSubPackages(
        mainPackageId,
        filters.includeDeleted === true || filters.includeDeleted === "true",
      );
      return rows.map(toSubPackage);
    },

    async listDeletedSubPackages(filters = {}) {
      const rows = await repository.findDeletedSubPackages(filters);
      return rows.map(toSubPackage);
    },

    async createSubPackage(data) {
      const mainPackage = await repository.findMainPackageById(
        data.mainPackageId,
      );
      if (!mainPackage) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }
      const title = normalizeText(data.title);
      if (!title) {
        throw new AppError(400, "Title is required", "TITLE_REQUIRED");
      }
      const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];
      const normalizedItineraries = itineraries.map((item, index) => ({
        day: toNumber(item?.day, index + 1) || index + 1,
        title: normalizeText(item?.title),
        description: normalizeText(item?.description),
        features: Array.isArray(item?.features) ? item.features : [],
      }));

      const row = await repository.createSubPackage({
        main_package_id: data.mainPackageId,
        package_id: normalizeText(data.packageId) || null,
        title,
        image: normalizeText(data.image),
        rating: toNumber(data.rating, 0),
        location: normalizeText(data.location),
        duration_days: toNumber(data.durationDays, 0),
        duration_nights: toNumber(data.durationNights, 0),
        duration: normalizeText(data.duration),
        starting_price: toNumber(data.startingPrice, 0),
        transport: normalizeText(data.transport),
        description: normalizeText(data.description),
        snapshot: normalizeText(data.snapshot),
        features: Array.isArray(data.features) ? data.features : [],
        itineraries: normalizedItineraries,
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
        exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
        payment_terms: Array.isArray(data.paymentTerms) ? data.paymentTerms : [],
        cancellation_policy: Array.isArray(data.cancellationPolicy)
          ? data.cancellationPolicy
          : [],
        tnc: Array.isArray(data.tnc) ? data.tnc : [],
        imp_notes: Array.isArray(data.impNotes) ? data.impNotes : [],
        meta_title: normalizeText(data.metaTitle),
        meta_description: normalizeText(data.metaDescription),
        keywords: normalizeText(data.keywords),
        display_order: toNumber(data.displayOrder, 0),
      });

      return toSubPackage(row);
    },

    async updateSubPackage(id, data) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.title !== undefined) {
        const title = normalizeText(data.title);
        if (!title) {
          throw new AppError(400, "Title cannot be empty", "INVALID_TITLE");
        }
        updates.title = title;
      }
      if (data.image !== undefined) updates.image = normalizeText(data.image);
      if (data.rating !== undefined) updates.rating = toNumber(data.rating, 0);
      if (data.location !== undefined) updates.location = normalizeText(data.location);
      if (data.durationDays !== undefined) {
        updates.duration_days = toNumber(data.durationDays, 0);
      }
      if (data.durationNights !== undefined) {
        updates.duration_nights = toNumber(data.durationNights, 0);
      }
      if (data.duration !== undefined) updates.duration = normalizeText(data.duration);
      if (data.startingPrice !== undefined) {
        updates.starting_price = toNumber(data.startingPrice, 0);
      }
      if (data.transport !== undefined) updates.transport = normalizeText(data.transport);
      if (data.description !== undefined) {
        updates.description = normalizeText(data.description);
      }
      if (data.snapshot !== undefined) updates.snapshot = normalizeText(data.snapshot);
      if (data.features !== undefined) {
        updates.features = Array.isArray(data.features) ? data.features : [];
      }
      if (data.itineraries !== undefined) {
        const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];
        updates.itineraries = itineraries.map((item, index) => ({
          day: toNumber(item?.day, index + 1) || index + 1,
          title: normalizeText(item?.title),
          description: normalizeText(item?.description),
          features: Array.isArray(item?.features) ? item.features : [],
        }));
      }
      if (data.highlights !== undefined) {
        updates.highlights = Array.isArray(data.highlights) ? data.highlights : [];
      }
      if (data.inclusions !== undefined) {
        updates.inclusions = Array.isArray(data.inclusions) ? data.inclusions : [];
      }
      if (data.exclusions !== undefined) {
        updates.exclusions = Array.isArray(data.exclusions) ? data.exclusions : [];
      }
      if (data.paymentTerms !== undefined) {
        updates.payment_terms = Array.isArray(data.paymentTerms) ? data.paymentTerms : [];
      }
      if (data.cancellationPolicy !== undefined) {
        updates.cancellation_policy = Array.isArray(data.cancellationPolicy)
          ? data.cancellationPolicy
          : [];
      }
      if (data.tnc !== undefined) {
        updates.tnc = Array.isArray(data.tnc) ? data.tnc : [];
      }
      if (data.impNotes !== undefined) {
        updates.imp_notes = Array.isArray(data.impNotes) ? data.impNotes : [];
      }
      if (data.metaTitle !== undefined) updates.meta_title = normalizeText(data.metaTitle);
      if (data.metaDescription !== undefined) {
        updates.meta_description = normalizeText(data.metaDescription);
      }
      if (data.keywords !== undefined) updates.keywords = normalizeText(data.keywords);
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);

      const updated = await repository.updateSubPackage(id, updates);
      return toSubPackage(updated);
    },

    async deleteSubPackage(id) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      await repository.deleteSubPackage(id);
      return { success: true };
    },

    async hardDeleteSubPackage(id) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      await repository.hardDeleteSubPackage(id);
      return { success: true };
    },

    async restoreSubPackage(id) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      await repository.restoreSubPackage(id);
      return { success: true };
    },
  });
}

export { createCmsPackagesService };
