import { asyncHandler } from "../../core/utils/index.js";

function createDestinationsController({ service, uploadService }) {
  async function attachGalleryMedia({ destinationId, files, startingOrder = 0 }) {
    const uploadedFiles = await uploadService.uploadMany({
      files,
      prefix: "cms/destinations/gallery",
      allowVideo: true,
      maxCount: 50,
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

      const destinations = await service.list(filters);
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
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      const bannerFile = req.files?.bannerImage?.[0] || null;
      const galleryFiles = req.files?.gallery || [];

      if (bannerFile) {
        const bannerUpload = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/destinations/banner",
          allowVideo: false,
          required: false,
        });
        payload.heroImageUrl = bannerUpload?.url || payload.heroImageUrl;
        payload.thumbnailUrl = bannerUpload?.url || payload.thumbnailUrl;
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
      if (!payload.country && req.query.country) {
        payload.country = req.query.country;
      }
      const bannerFile = req.files?.bannerImage?.[0] || null;
      const galleryFiles = req.files?.gallery || [];

      if (bannerFile) {
        const bannerUpload = await uploadService.uploadSingle({
          file: bannerFile,
          prefix: "cms/destinations/banner",
          allowVideo: false,
          required: false,
        });
        payload.heroImageUrl = bannerUpload?.url || payload.heroImageUrl;
        payload.thumbnailUrl = bannerUpload?.url || payload.thumbnailUrl;
      }

      const destination = await service.update(req.params.id, payload);
      const existingMedia = await service.getMedia(req.params.id);
      const gallery = await attachGalleryMedia({
        destinationId: req.params.id,
        files: galleryFiles,
        startingOrder: existingMedia.length,
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
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
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
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
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
  });
}

export { createDestinationsController };
