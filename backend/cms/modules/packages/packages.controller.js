import { asyncHandler } from "../../core/utils/index.js";

function createCmsPackagesController({ service, uploadService }) {
  return Object.freeze({
    listPublished: asyncHandler(async (req, res) => {
      const packages = await service.listPublished();
      res.json({
        success: true,
        data: packages,
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
      if (req.file) {
        const uploaded = await uploadService.uploadSingle({
          file: req.file,
          prefix: "cms/packages/banner",
          allowVideo: false,
          required: false,
        });
        payload.bannerImageUrl = uploaded?.url || payload.bannerImageUrl;
        payload.galleryImageUrls = payload.bannerImageUrl ? [payload.bannerImageUrl] : payload.galleryImageUrls;
      }

      const pkg = await service.updatePublishedPackage(req.params.id, payload);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    // Main packages
    listMainPackages: asyncHandler(async (req, res) => {
      const packages = await service.listMainPackages();
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
      const pkg = await service.createMainPackage(req.body);
      res.status(201).json({
        success: true,
        data: pkg,
      });
    }),

    updateMainPackage: asyncHandler(async (req, res) => {
      const pkg = await service.updateMainPackage(req.params.id, req.body);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    deleteMainPackage: asyncHandler(async (req, res) => {
      const result = await service.deleteMainPackage(req.params.id);
      res.json(result);
    }),

    // Sub packages
    listSubPackages: asyncHandler(async (req, res) => {
      const packages = await service.listSubPackages(req.params.mainPackageId);
      res.json({
        success: true,
        data: packages,
      });
    }),

    createSubPackage: asyncHandler(async (req, res) => {
      const pkg = await service.createSubPackage(req.body);
      res.status(201).json({
        success: true,
        data: pkg,
      });
    }),

    updateSubPackage: asyncHandler(async (req, res) => {
      const pkg = await service.updateSubPackage(req.params.id, req.body);
      res.json({
        success: true,
        data: pkg,
      });
    }),

    deleteSubPackage: asyncHandler(async (req, res) => {
      const result = await service.deleteSubPackage(req.params.id);
      res.json(result);
    }),
  });
}

export { createCmsPackagesController };
