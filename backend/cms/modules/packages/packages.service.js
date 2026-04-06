import { AppError } from "../../core/middlewares/errorHandler.js";
import { toNumber } from "../../core/utils/index.js";

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
    async listPublished() {
      const rows = await repository.findPublishedPackages();
      return rows.map(toPackage);
    },

    async getPackageById(id) {
      const row = await repository.findPackageById(id);
      if (!row) {
        throw new AppError(404, "Package not found", "NOT_FOUND");
      }
      return toPackage(row);
    },

    async listMainPackages() {
      const rows = await repository.findAllMainPackages();
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

      const row = await repository.createMainPackage({
        package_id: data.packageId,
        display_order: toNumber(data.displayOrder, 0),
        is_featured: data.isFeatured || false,
      });

      return {
        id: row.id,
        packageId: row.package_id,
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
      if (data.displayOrder !== undefined)
        updates.display_order = toNumber(data.displayOrder);
      if (data.isFeatured !== undefined) updates.is_featured = data.isFeatured;

      const updated = await repository.updateMainPackage(id, updates);
      return {
        id: updated.id,
        packageId: updated.package_id,
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

    async listSubPackages(mainPackageId) {
      const mainPackage = await repository.findMainPackageById(mainPackageId);
      if (!mainPackage) {
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
