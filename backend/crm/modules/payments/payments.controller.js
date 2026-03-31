import { AppError } from "../../core/errors/index.js";

function createPaymentsController({ service, s3 }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async stats(req, res) {
      const result = await service.stats(req.context);
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
          prefix: `payments/${payload.bookingId || "unknown"}/proofs`,
          metadata: {
            bookingId: payload.bookingId || "",
          },
        });

        payload.proofUrl = upload.url;
      }

      const result = await service.create(payload, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
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
          prefix: `payments/${req.validated.params.id}/proofs`,
          metadata: {
            paymentId: req.validated.params.id,
          },
        });

        payload.proofUrl = upload.url;
      }

      const result = await service.update(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async verify(req, res) {
      const payload = { ...(req.validated.body || {}) };

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
          prefix: `payments/${req.validated.params.id}/proofs`,
          metadata: {
            paymentId: req.validated.params.id,
          },
        });

        payload.proofUrl = upload.url;
      }

      const result = await service.verify(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createPaymentsController };
