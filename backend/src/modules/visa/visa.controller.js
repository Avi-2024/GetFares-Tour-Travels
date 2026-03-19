import { AppError } from "../../core/errors/index.js";

function createVisaController({ service, s3 }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(
        req.validated.params.id,
        req.context,
      );
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

    async transitionStatus(req, res) {
      const result = await service.transitionStatus(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createDocument(req, res) {
      const payload = { ...req.validated.body };

      if (req.file) {
        if (!s3?.uploadBuffer) {
          throw new AppError(
            500,
            "Media storage is not configured",
            "S3_NOT_CONFIGURED",
          );
        }

        const upload = await s3.uploadBuffer({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          originalName: req.file.originalname,
          prefix: `visa/${req.validated.params.id}/documents`,
          metadata: {
            documentType: String(payload.documentType || "").trim(),
          },
        });
        payload.fileUrl = upload.url;
      }

      if (!payload.fileUrl) {
        throw new AppError(
          400,
          "fileUrl or file upload is required",
          "VISA_DOCUMENT_FILE_REQUIRED",
        );
      }

      const result = await service.createDocument(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async listDocuments(req, res) {
      const result = await service.listDocuments(
        req.validated.params.id,
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async verifyDocument(req, res) {
      const result = await service.verifyDocument(
        req.validated.params.documentId,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getChecklist(req, res) {
      const result = await service.getChecklist(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async updateChecklist(req, res) {
      const result = await service.updateChecklist(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getSummaryReport(req, res) {
      const result = await service.getSummaryReport(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createVisaController };
