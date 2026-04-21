import { asyncHandler } from "../../core/utils/index.js";
import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  getFirstRequestFile,
  getRequestFiles,
} from "../../core/uploads/request-files.util.js";

function createDestinationsController({ service, uploadService }) {
  async function attachGalleryMedia({
    destinationId,
    files,
    startingOrder = 0,
    maxAllowed = 4,
  }) {
    const normalizedFiles = Array.isArray(files) ? files : [];
    if (!normalizedFiles.length) {
      return [];
    }
    if (startingOrder + normalizedFiles.length > maxAllowed) {
      throw new AppError(
        400,
        `Only ${maxAllowed} gallery items allowed.`,
        "MAX_GALLERY_ITEMS_EXCEEDED",
      );
    }

    const uploadedFiles = await uploadService.uploadMany({
      files: normalizedFiles,
      prefix: "cms/destinations/gallery",
      allowVideo: true,
      maxCount: maxAllowed - startingOrder,
    });

    const createdMedia = [];
    for (let index = 0; index < uploadedFiles.length; index += 1) {
      const uploaded = uploadedFiles[index];
      const media = await service.addMedia(destinationId, {
        mediaType: uploaded.mediaType,
        mediaUrl: uploaded.url,
        thumbnailUrl: uploaded.mediaType === "image" ? uploaded.url : null,
        title: uploaded.originalName,
        caption: null,
        displayOrder: startingOrder + index,
        isFeatured: false,
      });
      createdMedia.push(media);
    }
    return createdMedia;
  }

  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) filters.country = req.query.country;
      if (req.query.region) filters.region = req.query.region;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.isActive !== undefined)
        filters.is_active = req.query.isActive === "true";
      if (req.query.isPopular !== undefined)
        filters.is_popular = req.query.isPopular === "true";
      if (req.query.includeDeleted !== undefined) {
        filters.includeDeleted = req.query.includeDeleted === "true";
      }

      const destinations = await service.list(filters);
      res.json({
        success: true,
        data: destinations,
      });
    }),

    listDeleted: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.country) filters.country = req.query.country;
      const destinations = await service.listDeleted(filters);
      res.json({
        success: true,
        data: destinations,
      });
    }),

    getById: asyncHandler(async (req, res) => {
      const destination = await service.getById(req.params.id);
      res.json({
        success: true,
        data: destination,
      });
    }),

    getBySlug: asyncHandler(async (req, res) => {
      const destination = await service.getBySlug(req.params.slug);
      res.json({
        success: true,
        data: destination,
      });
    }),

    create: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (typeof payload.media === "string") {
        try {
          payload.media = JSON.parse(payload.media);
        } catch {
          payload.media = {};
        }
      }
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      const bannerFile = getFirstRequestFile(req, [
        "bannerImage",
        "heroImage",
        "thumbnailImage",
        "image",
        "file",
      ]);
      const galleryFiles = getRequestFiles(req, [
        "gallery",
        "galleryImages",
        "media",
        "files",
      ]);

      if (bannerFile) {
        const bannerUpload = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/destinations/banner",
          allowVideo: false,
          required: false,
        });
        payload.media = {
          ...(payload.media && typeof payload.media === "object" ? payload.media : {}),
          title_image: bannerUpload?.url || payload.media?.title_image || null,
          gallery: Array.isArray(payload.media?.gallery) ? payload.media.gallery : [],
        };
      }

      const destination = await service.create(payload);
      const gallery = await attachGalleryMedia({
        destinationId: destination.id,
        files: galleryFiles,
        startingOrder: 0,
      });

      res.status(201).json({
        success: true,
        data: destination,
        included: {
          galleryCount: gallery.length,
        },
      });
    }),

    update: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (typeof payload.media === "string") {
        try {
          payload.media = JSON.parse(payload.media);
        } catch {
          payload.media = {};
        }
      }
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      const bannerFile = getFirstRequestFile(req, [
        "bannerImage",
        "heroImage",
        "thumbnailImage",
        "image",
        "file",
      ]);
      const galleryFiles = getRequestFiles(req, [
        "gallery",
        "galleryImages",
        "media",
        "files",
      ]);

      if (bannerFile) {
        const bannerUpload = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/destinations/banner",
          allowVideo: false,
          required: false,
        });
        payload.media = {
          ...(payload.media && typeof payload.media === "object" ? payload.media : {}),
          title_image: bannerUpload?.url || payload.media?.title_image || null,
          gallery: Array.isArray(payload.media?.gallery) ? payload.media.gallery : [],
        };
      }

      const destination = await service.update(req.params.id, payload);
      const existingMedia = await service.getMedia(req.params.id);
      const gallery = await attachGalleryMedia({
        destinationId: req.params.id,
        files: galleryFiles,
        startingOrder: existingMedia.length,
        maxAllowed: 4,
      });

      res.json({
        success: true,
        data: destination,
        included: {
          galleryCount: gallery.length,
        },
      });
    }),

    updateStatus: asyncHandler(async (req, res) => {
      const destination = await service.updateStatus(
        req.params.id,
        req.body?.isActive,
      );
      res.json({
        success: true,
        data: destination,
      });
    }),

    delete: asyncHandler(async (req, res) => {
      const result = await service.delete(req.params.id);
      res.json(result);
    }),

    hardDelete: asyncHandler(async (req, res) => {
      const result = await service.hardDelete(req.params.id);
      res.json(result);
    }),

    restore: asyncHandler(async (req, res) => {
      const result = await service.restore(req.params.id);
      res.json(result);
    }),

    // Media endpoints
    getMedia: asyncHandler(async (req, res) => {
      const media = await service.getMedia(req.params.id);
      res.json({
        success: true,
        data: media,
      });
    }),

    addMedia: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const mediaFile = getFirstRequestFile(req, [
        "media",
        "file",
        "image",
        "video",
      ]);
      if (mediaFile) {
        const uploaded = await uploadService.uploadSingle({
          file: mediaFile,
          prefix: "cms/destinations/gallery",
          allowVideo: true,
          required: false,
        });
        payload.mediaType = uploaded?.mediaType || payload.mediaType;
        payload.mediaUrl = uploaded?.url || payload.mediaUrl;
        payload.thumbnailUrl =
          uploaded?.mediaType === "image" ? uploaded.url : payload.thumbnailUrl;
      }

      const media = await service.addMedia(req.params.id, payload);
      res.status(201).json({
        success: true,
        data: media,
      });
    }),

    updateMedia: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      const mediaFile = getFirstRequestFile(req, [
        "media",
        "file",
        "image",
        "video",
      ]);
      if (mediaFile) {
        const uploaded = await uploadService.uploadSingle({
          file: mediaFile,
          prefix: "cms/destinations/gallery",
          allowVideo: true,
          required: false,
        });
        payload.mediaType = uploaded?.mediaType || payload.mediaType;
        payload.mediaUrl = uploaded?.url || payload.mediaUrl;
        payload.thumbnailUrl =
          uploaded?.mediaType === "image" ? uploaded.url : payload.thumbnailUrl;
      }

      const media = await service.updateMedia(req.params.mediaId, payload);
      res.json({
        success: true,
        data: media,
      });
    }),

    deleteMedia: asyncHandler(async (req, res) => {
      const result = await service.deleteMedia(req.params.mediaId);
      res.json(result);
    }),

    hardDeleteMedia: asyncHandler(async (req, res) => {
      const result = await service.hardDeleteMedia(req.params.mediaId);
      res.json(result);
    }),

    // Season endpoints
    getSeasons: asyncHandler(async (req, res) => {
      const seasons = await service.getSeasons(req.params.id);
      res.json({
        success: true,
        data: seasons,
      });
    }),

    addSeason: asyncHandler(async (req, res) => {
      const season = await service.addSeason(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: season,
      });
    }),

    updateSeason: asyncHandler(async (req, res) => {
      const season = await service.updateSeason(req.params.seasonId, req.body);
      res.json({
        success: true,
        data: season,
      });
    }),

    deleteSeason: asyncHandler(async (req, res) => {
      const result = await service.deleteSeason(req.params.seasonId);
      res.json(result);
    }),

    hardDeleteSeason: asyncHandler(async (req, res) => {
      const result = await service.hardDeleteSeason(req.params.seasonId);
      res.json(result);
    }),

    // Package mapping endpoints
    getPackages: asyncHandler(async (req, res) => {
      const packages = await service.getPackages(req.params.id);
      res.json({
        success: true,
        data: packages,
      });
    }),

    mapPackage: asyncHandler(async (req, res) => {
      const { mainPackageId, displayOrder } = req.body;
      const result = await service.mapPackage(
        req.params.id,
        mainPackageId,
        displayOrder,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    }),

    unmapPackage: asyncHandler(async (req, res) => {
      const result = await service.unmapPackage(req.params.mapId);
      res.json(result);
    }),

    hardUnmapPackage: asyncHandler(async (req, res) => {
      const result = await service.hardUnmapPackage(req.params.mapId);
      res.json(result);
    }),
  });
}

export { createDestinationsController };
