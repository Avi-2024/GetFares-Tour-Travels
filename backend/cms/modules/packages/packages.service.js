import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  normalizeText,
  toBoolean,
  toNumber,
  toSlug,
} from "../../core/utils/index.js";

function createCmsPackagesService({ repository }) {
  function toPackage(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      destination: row.destination,
      duration: row.duration,
      startingPrice: parseFloat(row.starting_price) || 0,
      bannerImageUrl: row.banner_image_url,
      galleryImageUrls: row.gallery_image_urls || [],
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      publishToWebsite: row.publish_to_website,
      websiteSlug: row.website_slug,
      isSoldOut: row.is_sold_out,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toMainPackage(row) {
    if (!row) return null;
    return {
      id: row.id,
      packageId: row.package_id,
      country: row.country,
      packageName: row.name,
      destination: row.destination,
      startingPrice: parseFloat(row.starting_price) || 0,
      duration: row.duration,
      bannerImageUrl: row.banner_image_url,
      displayOrder: row.display_order,
      isFeatured: row.is_featured,
      publishToWebsite: row.publish_to_website,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toSubPackage(row) {
    if (!row) return null;
    return {
      id: row.id,
      mainPackageId: row.main_package_id,
      packageId: row.package_id,
      packageName: row.name,
      startingPrice: parseFloat(row.starting_price) || 0,
      duration: row.duration,
      bannerImageUrl: row.banner_image_url,
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

    async getPackageById(id) {
      const row = await repository.findPackageById(id);
      if (!row || row.is_deleted) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }
      return toPackage(row);
    },

    async createPublishedPackage(data) {
      const name = normalizeText(data.name);
      const destination = normalizeText(data.destination);
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
        gallery_image_urls: Array.isArray(data.galleryImageUrls) ?
            data.galleryImageUrls
          : [],
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
      if (data.destination !== undefined) {
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
        updates.gallery_image_urls = data.galleryImageUrls;
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

    async listMainPackages(filters = {}) {
      const rows = await repository.findAllMainPackages(filters);
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
      const pkg = await repository.findPackageById(data.packageId);
      if (!pkg) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }
      if (!pkg.publish_to_website) {
        throw new AppError(
          400,
          "Package must be published to website",
          "NOT_PUBLISHED",
        );
      }
      if (!normalizeText(data.country)) {
        throw new AppError(
          400,
          "Country is required for main package",
          "COUNTRY_REQUIRED",
        );
      }

      const row = await repository.createMainPackage({
        package_id: data.packageId,
        country: normalizeText(data.country),
        display_order: toNumber(data.displayOrder, 0),
        is_featured: toBoolean(data.isFeatured, false),
      });

      return {
        id: row.id,
        packageId: row.package_id,
        country: row.country,
        displayOrder: row.display_order,
        isFeatured: row.is_featured,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async updateMainPackage(id, data) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.country !== undefined) {
        const country = normalizeText(data.country);
        if (!country) {
          throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
        }
        updates.country = country;
      }
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isFeatured !== undefined)
        updates.is_featured = toBoolean(data.isFeatured, false);

      const updated = await repository.updateMainPackage(id, updates);
      return {
        id: updated.id,
        packageId: updated.package_id,
        country: updated.country,
        displayOrder: updated.display_order,
        isFeatured: updated.is_featured,
        updatedAt: updated.updated_at,
      };
    },

    async deleteMainPackage(id) {
      const existing = await repository.findMainPackageById(id);
      if (!existing) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      await repository.deleteMainPackage(id);
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

      const rows = await repository.findSubPackages(mainPackageId);
      return rows.map(toSubPackage);
    },

    async createSubPackage(data) {
      const mainPackage = await repository.findMainPackageById(
        data.mainPackageId,
      );
      if (!mainPackage) {
        throw new AppError(404, "Main package not found", "NOT_FOUND");
      }

      const pkg = await repository.findPackageById(data.packageId);
      if (!pkg) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }
      if (!pkg.publish_to_website) {
        throw new AppError(
          400,
          "Package must be published to website",
          "NOT_PUBLISHED",
        );
      }

      const row = await repository.createSubPackage({
        main_package_id: data.mainPackageId,
        package_id: data.packageId,
        display_order: toNumber(data.displayOrder, 0),
      });

      return {
        id: row.id,
        mainPackageId: row.main_package_id,
        packageId: row.package_id,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async updateSubPackage(id, data) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      const updates = {};
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);

      const updated = await repository.updateSubPackage(id, updates);
      return {
        id: updated.id,
        mainPackageId: updated.main_package_id,
        packageId: updated.package_id,
        displayOrder: updated.display_order,
        updatedAt: updated.updated_at,
      };
    },

    async deleteSubPackage(id) {
      const existing = await repository.findSubPackageById(id);
      if (!existing) {
        throw new AppError(404, "Sub package not found", "NOT_FOUND");
      }

      await repository.deleteSubPackage(id);
      return { success: true };
    },
  });
}

export { createCmsPackagesService };
