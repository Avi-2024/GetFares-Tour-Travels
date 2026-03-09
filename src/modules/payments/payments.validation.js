const { z } = require('zod');

const paymentStatus = z.enum(['PENDING', 'PARTIAL', 'FULL', 'REFUNDED']);
const paymentMode = z.enum(['CASH', 'BANK_TRANSFER', 'PAYMENT_GATEWAY', 'UPI', 'CARD', 'BANK', 'GATEWAY']);

const dateTimeString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Invalid date-time',
});

const createPayload = z.object({
  bookingId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(10).optional(),
  paymentMode: paymentMode,
  gatewayProvider: z.string().trim().min(2).max(50).optional(),
  gatewayOrderId: z.string().trim().min(2).max(150).optional(),
  gatewayPaymentId: z.string().trim().min(2).max(150).optional(),
  gatewaySignature: z.string().trim().min(2).max(4000).optional(),
  paymentReference: z.string().trim().min(2).max(100).optional(),
  proofUrl: z.string().url().max(2000).optional(),
  status: paymentStatus.optional(),
  paidAt: dateTimeString.optional(),
  isVerified: z.boolean().optional(),
});

const updatePayload = z
  .object({
    amount: z.coerce.number().positive().optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    paymentMode: paymentMode.optional(),
    gatewayProvider: z.string().trim().min(2).max(50).optional(),
    gatewayOrderId: z.string().trim().min(2).max(150).optional(),
    gatewayPaymentId: z.string().trim().min(2).max(150).optional(),
    gatewaySignature: z.string().trim().min(2).max(4000).optional(),
    paymentReference: z.string().trim().min(2).max(100).optional(),
    proofUrl: z.string().url().max(2000).optional(),
    status: paymentStatus.optional(),
    paidAt: dateTimeString.optional(),
    isVerified: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update');

const verifyPayload = z.object({
  body: z
    .object({
      paidAt: dateTimeString.optional(),
      status: paymentStatus.optional(),
      proofUrl: z.string().url().max(2000).optional(),
      paymentReference: z.string().trim().min(2).max(100).optional(),
      gatewayPaymentId: z.string().trim().min(2).max(150).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
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

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      bookingId: z.string().uuid().optional(),
      status: paymentStatus.optional(),
      paymentMode: paymentMode.optional(),
      isVerified: z.coerce.boolean().optional(),
    })
    .optional(),
});

module.exports = {
  PaymentsValidation: {
    create,
    update,
    byId,
    list,
    verify: verifyPayload,
  },
};
