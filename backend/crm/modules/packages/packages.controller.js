import {
  getFirstRequestFile,
  getRequestFiles,
} from "../../../cms/core/uploads/request-files.util.js";

function createPackagesController({ service, cmsService, uploadService }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const result = await service.update(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async publish(req, res) {
      const result = await service.publish(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async delete(req, res) {
      const result = await service.delete(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async restore(req, res) {
      const result = await service.restore(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async hardDelete(req, res) {
      const result = await service.hardDelete(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    // CMS-like main/sub package management (served under CRM /api)
    async listMain(req, res) {
      const rows = await cmsService.listMainPackages(req.query || {});
      res.status(200).json({ data: rows });
    },

    async getMainById(req, res) {
      const row = await cmsService.getMainPackageById(req.validated.params.id);
      res.status(200).json({ data: row });
    },

    async createMain(req, res) {
      const row = await cmsService.createMainPackage(req.validated.body || {});
      res.status(201).json({ data: row });
    },

    async updateMain(req, res) {
      const row = await cmsService.updateMainPackage(
        req.validated.params.id,
        req.validated.body || {},
      );
      res.status(200).json({ data: row });
    },

    async deleteMain(req, res) {
      const result = await cmsService.deleteMainPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async restoreMain(req, res) {
      const result = await cmsService.restoreMainPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async hardDeleteMain(req, res) {
      const result = await cmsService.hardDeleteMainPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async listSub(req, res) {
      const rows = await cmsService.listSubPackages(
        req.validated.params.mainPackageId,
        req.query || {},
      );
      res.status(200).json({ data: rows });
    },

    async getSubById(req, res) {
      const row = await cmsService.getSubPackageById(req.validated.params.id);
      res.status(200).json({ data: row });
    },

    async createSub(req, res) {
      const row = await cmsService.createSubPackage(req.validated.body || {});
      res.status(201).json({ data: row });
    },

    async updateSub(req, res) {
      const row = await cmsService.updateSubPackage(
        req.validated.params.id,
        req.validated.body || {},
      );
      res.status(200).json({ data: row });
    },

    async deleteSub(req, res) {
      const result = await cmsService.deleteSubPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async restoreSub(req, res) {
      const result = await cmsService.restoreSubPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async hardDeleteSub(req, res) {
      const result = await cmsService.hardDeleteSubPackage(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async uploadMedia(req, res) {
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

      const uploadedBanner = bannerFile
        ? await uploadService.uploadSingle({
            file: bannerFile,
            prefix: "cms/packages/media",
            allowVideo: false,
            required: false,
          })
        : null;

      const uploadedGallery = galleryFiles.length
        ? await uploadService.uploadMany({
            files: galleryFiles,
            prefix: "cms/packages/gallery",
            allowVideo: false,
            maxCount: 50,
          })
        : [];

      res.status(200).json({
        data: {
          bannerUrl: uploadedBanner?.url || null,
          galleryUrls: uploadedGallery.map((item) => item.url),
        },
      });
    },

    async createEnquiry(req, res) {
      const result = await service.createEnquiry(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async listEnquiries(req, res) {
      const result = await service.listEnquiries(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createPackagesController };
