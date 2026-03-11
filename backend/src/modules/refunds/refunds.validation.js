const { z } = require('zod');

const refundStatus = z.enum(['INITIATED', 'APPROVED', 'REJECTED', 'PROCESSED']);

const dateTimeString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Invalid date-time',
});

const createPayload = z.object({
  bookingId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  refundAmount: z.coerce.number().positive(),
  supplierPenalty: z.coerce.number().nonnegative().optional(),
  serviceCharge: z.coerce.number().nonnegative().optional(),
  gatewayRefundId: z.string().trim().min(2).max(150).optional(),
});

const updatePayload = z
  .object({
    refundAmount: z.coerce.number().positive().optional(),
    supplierPenalty: z.coerce.number().nonnegative().optional(),
    serviceCharge: z.coerce.number().nonnegative().optional(),
    gatewayRefundId: z.string().trim().min(2).max(150).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update');

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      bookingId: z.string().uuid().optional(),
      paymentId: z.string().uuid().optional(),
      status: refundStatus.optional(),
      approvedBy: z.string().uuid().optional(),
    })
    .optional(),
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

module.exports = {
  RefundsValidation: {
    create,
    update,
    byId,
    list,
    approve,
    reject,
    process: processRefund,
  },
};
