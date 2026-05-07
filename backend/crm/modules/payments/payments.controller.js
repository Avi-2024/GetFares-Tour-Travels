import { AppError } from "../../core/errors/index.js";

function pickUploadedFile(req, ...fieldNames) {
  if (req.file) {
    return req.file;
  }

  const uploaded = req.files;
  if (!uploaded || typeof uploaded !== "object") {
    return null;
  }

  for (const fieldName of fieldNames) {
    const entries = uploaded[fieldName];
    if (Array.isArray(entries) && entries.length > 0) {
      return entries[0];
    }
  }

  return null;
}

async function uploadPaymentFile({
  file,
  s3,
  prefix,
  metadata,
}) {
  if (!file) {
    return null;
  }

  if (!s3?.uploadBuffer) {
    throw new AppError(
      500,
      "Media storage is not configured",
      "S3_NOT_CONFIGURED",
    );
  }

  const upload = await s3.uploadBuffer({
    buffer: file.buffer,
    contentType: file.mimetype,
    originalName: file.originalname,
    prefix,
    metadata,
  });

  return upload.url;
}

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
      const result = await service.stats(
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
      const payload = { ...req.validated.body };
      const bookingId = payload.bookingId || "unknown";
      const proofFile = pickUploadedFile(req, "proofFile", "file");
      const invoiceFile = pickUploadedFile(req, "invoiceFile");

      const [proofUrl, invoiceUrl] = await Promise.all([
        uploadPaymentFile({
          file: proofFile,
          s3,
          prefix: `payments/${bookingId}/proofs`,
          metadata: {
            bookingId: payload.bookingId || "",
            type: "proof",
          },
        }),
        uploadPaymentFile({
          file: invoiceFile,
          s3,
          prefix: `payments/${bookingId}/invoices`,
          metadata: {
            bookingId: payload.bookingId || "",
            type: "invoice",
          },
        }),
      ]);

      if (proofUrl) payload.proofUrl = proofUrl;
      if (invoiceUrl) payload.invoiceUrl = invoiceUrl;

      const result = await service.create(payload, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const payload = { ...req.validated.body };
      const paymentId = req.validated.params.id;
      const proofFile = pickUploadedFile(req, "proofFile", "file");
      const invoiceFile = pickUploadedFile(req, "invoiceFile");

      const [proofUrl, invoiceUrl] = await Promise.all([
        uploadPaymentFile({
          file: proofFile,
          s3,
          prefix: `payments/${paymentId}/proofs`,
          metadata: {
            paymentId,
            type: "proof",
          },
        }),
        uploadPaymentFile({
          file: invoiceFile,
          s3,
          prefix: `payments/${paymentId}/invoices`,
          metadata: {
            paymentId,
            type: "invoice",
          },
        }),
      ]);

      if (proofUrl) payload.proofUrl = proofUrl;
      if (invoiceUrl) payload.invoiceUrl = invoiceUrl;

      const result = await service.update(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async verify(req, res) {
      const payload = { ...(req.validated.body || {}) };
      const paymentId = req.validated.params.id;
      const proofFile = pickUploadedFile(req, "proofFile", "file");
      const invoiceFile = pickUploadedFile(req, "invoiceFile");

      const [proofUrl, invoiceUrl] = await Promise.all([
        uploadPaymentFile({
          file: proofFile,
          s3,
          prefix: `payments/${paymentId}/proofs`,
          metadata: {
            paymentId,
            type: "proof",
          },
        }),
        uploadPaymentFile({
          file: invoiceFile,
          s3,
          prefix: `payments/${paymentId}/invoices`,
          metadata: {
            paymentId,
            type: "invoice",
          },
        }),
      ]);

      if (proofUrl) payload.proofUrl = proofUrl;
      if (invoiceUrl) payload.invoiceUrl = invoiceUrl;

      const result = await service.verify(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async downloadAttachment(req, res) {
      const { id, attachmentType } = req.validated.params;
      const attachment = await service.getAttachmentDownload(
        id,
        attachmentType,
        req.context,
      );

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(attachment.url);
      } catch (_error) {
        throw new AppError(
          502,
          "Failed to fetch payment attachment from storage",
          "PAYMENT_ATTACHMENT_FETCH_FAILED",
        );
      }

      if (!upstreamResponse.ok) {
        throw new AppError(
          502,
          "Payment attachment is not accessible from storage",
          "PAYMENT_ATTACHMENT_UNAVAILABLE",
        );
      }

      const contentType =
        upstreamResponse.headers.get("content-type") ||
        "application/octet-stream";
      const fileName = String(attachment.fileName || "payment-attachment")
        .replace(/["\\\r\n]/g, "_");

      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Cache-Control", "no-store");
      res.status(200).send(buffer);
    },
  });
}

export { createPaymentsController };
