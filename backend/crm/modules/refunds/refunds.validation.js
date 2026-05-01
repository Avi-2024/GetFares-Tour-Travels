import { z } from "zod";

const refundStatus = z.enum(["INITIATED", "APPROVED", "REJECTED", "PROCESSED"]);

const dateTimeString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date-time",
  });

const createPayload = z.object({
  bookingId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  raisedByName: z.string().trim().min(2).max(150),
  refundAmount: z.coerce.number().positive(),
  supplierPenalty: z.coerce.number().nonnegative().optional(),
  serviceCharge: z.coerce.number().nonnegative().optional(),
  gatewayRefundId: z.string().trim().min(2).max(150).optional(),
  proofUrl: z.string().url().max(2000).optional(),
  notes: z.string().trim().min(1).max(4000).optional(),
});

const updatePayload = z
  .object({
    assignedTo: z.union([z.string().uuid(), z.literal("")]).optional(),
    raisedByName: z.string().trim().min(2).max(150).optional(),
    refundAmount: z.coerce.number().positive().optional(),
    supplierPenalty: z.coerce.number().nonnegative().optional(),
    serviceCharge: z.coerce.number().nonnegative().optional(),
    gatewayRefundId: z.string().trim().min(2).max(150).optional(),
    proofUrl: z.string().url().max(2000).optional(),
    notes: z.string().trim().min(1).max(4000).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );

const REFUNDS_LIST_DEFAULT_LIMIT = 200;
const REFUNDS_LIST_MAX_LIMIT = 500;

const listQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(REFUNDS_LIST_MAX_LIMIT).optional(),
    bookingId: z.string().uuid().optional(),
    paymentId: z.string().uuid().optional(),
    status: refundStatus.optional(),
    approvedBy: z.string().uuid().optional(),
  })
  .transform((q) => ({
    ...q,
    limit: q.limit ?? REFUNDS_LIST_DEFAULT_LIMIT,
    page: q.page ?? 1,
  }));

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.preprocess(
    (raw) => (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
    listQuery,
  ),
});

const create = z.object({
  body: createPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: updatePayload,
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const assignableUsers = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const approve = z.object({
  body: z
    .object({
      note: z.string().trim().max(1000).optional(),
      approvedAt: dateTimeString.optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const reject = z.object({
  body: z
    .object({
      reason: z.string().trim().min(2).max(1000).optional(),
      rejectedAt: dateTimeString.optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const processRefund = z.object({
  body: z
    .object({
      gatewayRefundId: z.string().trim().min(2).max(150).optional(),
      processedAt: dateTimeString.optional(),
      markPaymentRefunded: z.boolean().optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const RefundsValidation = {
  create,
  update,
  byId,
  assignableUsers,
  list,
  approve,
  reject,
  process: processRefund,
};

export { RefundsValidation };
