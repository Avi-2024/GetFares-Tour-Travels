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

async function uploadRefundFile({ file, s3, prefix, metadata }) {
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

function createRefundsController({ service, s3 }) {
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

    async listAssignableUsers(req, res) {
      const result = await service.listAssignableAccountsUsers(req.context);
      res.status(200).json({ data: result });
    },

	    async create(req, res) {
      const payload = { ...req.validated.body };
      const bookingId = payload.bookingId || "unknown";
      const proofFile = pickUploadedFile(req, "proofFile", "file");
      const proofUrl = await uploadRefundFile({
        file: proofFile,
        s3,
        prefix: `refunds/${bookingId}/proofs`,
        metadata: {
          bookingId: payload.bookingId || "",
          paymentId: payload.paymentId || "",
          type: "proof",
        },
      });

      if (proofUrl) payload.proofUrl = proofUrl;

      const result = await service.create(payload, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const payload = { ...req.validated.body };
      const refundId = req.validated.params.id;
      const proofFile = pickUploadedFile(req, "proofFile", "file");
      const proofUrl = await uploadRefundFile({
        file: proofFile,
        s3,
        prefix: `refunds/${refundId}/proofs`,
        metadata: {
          refundId,
          type: "proof",
        },
      });

      if (proofUrl) payload.proofUrl = proofUrl;

      const result = await service.update(
        req.validated.params.id,
        payload,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async approve(req, res) {
      const result = await service.approve(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async reject(req, res) {
      const result = await service.reject(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async process(req, res) {
      const result = await service.process(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createRefundsController };
