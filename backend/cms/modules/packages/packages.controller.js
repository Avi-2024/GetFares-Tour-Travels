import { asyncHandler } from "../../core/utils/index.js";
import {
  getFirstRequestFile,
  getRequestFiles,
} from "../../core/uploads/request-files.util.js";

function createCmsPackagesController({ service, uploadService }) {
  return Object.freeze({
    listPublished: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const packages = await service.listPublished(filters);
      res.json({
        success: true,
        data: packages,
      });
    }),

    listDeleted: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      const packages = await service.listDeleted(filters);
      res.json({
        success: true,
        data: packages,
      });
    }),

    createPublishedPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const bannerFile = getFirstRequestFile(req, [
        "bannerImage",
        "banner",
        "image",
        "file",
      ]);
      const galleryFiles = getRequestFiles(req, [
        "gallery",
        "galleryImages",
        "images",
        "media",
      ]);

      if (bannerFile) {
        const uploaded = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/packages/banner",
          allowVideo: false,
          required: false,
        });
        payload.bannerImageUrl = uploaded?.url || payload.bannerImageUrl;
      }

      if (galleryFiles.length) {
        const uploadedGallery = await uploadService.uploadMany({
          files: galleryFiles,
          prefix: "cms/packages/gallery",
          allowVideo: false,
          maxCount: 50,
        });
        payload.galleryImageUrls = uploadedGallery.map((item) => item.url);
      } else if (!payload.galleryImageUrls && payload.bannerImageUrl) {
        payload.galleryImageUrls = [payload.bannerImageUrl];
      }

      const pkg = await service.createPublishedPackage(payload);
      res.status(201).json({
        success: true,
        data: pkg,
      });
    }),

    getPackageById: asyncHandler(async (req, res) => {
      const pkg = await service.getPackageById(req.params.id);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    updatePublishedPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const bannerFile = getFirstRequestFile(req, [
        "bannerImage",
        "banner",
        "image",
        "file",
      ]);
      const galleryFiles = getRequestFiles(req, [
        "gallery",
        "galleryImages",
        "images",
        "media",
      ]);

      if (bannerFile) {
        const uploaded = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/packages/banner",
          allowVideo: false,
          required: false,
        });
        payload.bannerImageUrl = uploaded?.url || payload.bannerImageUrl;
      }

      if (galleryFiles.length) {
        const uploadedGallery = await uploadService.uploadMany({
          files: galleryFiles,
          prefix: "cms/packages/gallery",
          allowVideo: false,
          maxCount: 50,
        });
        payload.galleryImageUrls = uploadedGallery.map((item) => item.url);
      }

      const pkg = await service.updatePublishedPackage(req.params.id, payload);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    deletePublishedPackage: asyncHandler(async (req, res) => {
      const result = await service.deletePublishedPackage(req.params.id);
      res.json(result);
    }),

    hardDeletePublishedPackage: asyncHandler(async (req, res) => {
      const result = await service.hardDeletePublishedPackage(req.params.id);
      res.json(result);
    }),

    restorePublishedPackage: asyncHandler(async (req, res) => {
      const result = await service.restorePublishedPackage(req.params.id);
      res.json(result);
    }),

    // Main packages
    listMainPackages: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.isFeatured !== undefined) {
        filters.is_featured = req.query.isFeatured === "true";
      }
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const packages = await service.listMainPackages(filters);
      res.json({
        success: true,
        data: packages,
      });
    }),

    listDeletedMainPackages: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      const packages = await service.listDeletedMainPackages(filters);
      res.json({
        success: true,
        data: packages,
      });
    }),

    getMainPackageById: asyncHandler(async (req, res) => {
      const pkg = await service.getMainPackageById(req.params.id);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    createMainPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }

      const pkg = await service.createMainPackage(payload);
      res.status(201).json({
        success: true,
        data: pkg,
      });
    }),

    updateMainPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }

      const pkg = await service.updateMainPackage(req.params.id, payload);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    deleteMainPackage: asyncHandler(async (req, res) => {
      const result = await service.deleteMainPackage(req.params.id);
      res.json(result);
    }),

    hardDeleteMainPackage: asyncHandler(async (req, res) => {
      const result = await service.hardDeleteMainPackage(req.params.id);
      res.json(result);
    }),

    restoreMainPackage: asyncHandler(async (req, res) => {
      const result = await service.restoreMainPackage(req.params.id);
      res.json(result);
    }),

    // Sub packages
    listSubPackages: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) {
        filters.country = req.query.country;
      }
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const packages = await service.listSubPackages(
        req.params.mainPackageId,
        filters,
      );
      res.json({
        success: true,
        data: packages,
      });
    }),

    listDeletedSubPackages: asyncHandler(async (_req, res) => {
      const packages = await service.listDeletedSubPackages({});
      res.json({
        success: true,
        data: packages,
      });
    }),

    getSubPackageById: asyncHandler(async (req, res) => {
      const pkg = await service.getSubPackageById(req.params.id);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    createSubPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const imageFile = getFirstRequestFile(req, [
        "image",
        "bannerImage",
        "file",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
          prefix: "cms/packages/sub",
          allowVideo: false,
          required: false,
        });
        payload.image = uploaded?.url || payload.image;
      }
      const pkg = await service.createSubPackage(payload);
      res.status(201).json({
        success: true,
        data: pkg,
      });
    }),

    updateSubPackage: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const imageFile = getFirstRequestFile(req, [
        "image",
        "bannerImage",
        "file",
      ]);
      if (imageFile) {
        const uploaded = await uploadService.uploadSingle({
          file: imageFile,
          prefix: "cms/packages/sub",
          allowVideo: false,
          required: false,
        });
        payload.image = uploaded?.url || payload.image;
      }
      const pkg = await service.updateSubPackage(req.params.id, payload);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    deleteSubPackage: asyncHandler(async (req, res) => {
      const result = await service.deleteSubPackage(req.params.id);
      res.json(result);
    }),

    hardDeleteSubPackage: asyncHandler(async (req, res) => {
      const result = await service.hardDeleteSubPackage(req.params.id);
      res.json(result);
    }),

    restoreSubPackage: asyncHandler(async (req, res) => {
      const result = await service.restoreSubPackage(req.params.id);
      res.json(result);
    }),
  });
}

export { createCmsPackagesController };
