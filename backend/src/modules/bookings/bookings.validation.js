const { z } = require('zod');

const bookingStatus = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']);
const paymentStatus = z.enum(['PENDING', 'PARTIAL', 'FULL', 'REFUNDED']);
const currencyCode = z.string().trim().min(3).max(10);

const dateTimeString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Invalid date-time',
});

const createPayload = z
  .object({
    quotationId: z.string().uuid(),
    bookingNumber: z.string().trim().min(3).max(50).optional(),
    travelStartDate: z.string().date(),
    travelEndDate: z.string().date(),
    totalAmount: z.coerce.number().nonnegative(),
    costAmount: z.coerce.number().nonnegative(),
    isNonRefundable: z.boolean().optional(),
    advanceRequired: z.coerce.number().nonnegative().optional(),
    clientCurrency: currencyCode.optional(),
    supplierCurrency: currencyCode.optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    exchangeLocked: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.travelEndDate < value.travelStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['travelEndDate'],
        message: 'travelEndDate must be on or after travelStartDate',
      });
    }

    if (value.costAmount > value.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['costAmount'],
        message: 'costAmount cannot be greater than totalAmount',
      });
    }
  });

const updatePayload = z
  .object({
    travelStartDate: z.string().date().optional(),
    travelEndDate: z.string().date().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    costAmount: z.coerce.number().nonnegative().optional(),
    advanceRequired: z.coerce.number().nonnegative().optional(),
    paymentStatus: paymentStatus.optional(),
    clientCurrency: currencyCode.optional(),
    supplierCurrency: currencyCode.optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    exchangeLocked: z.boolean().optional(),
    cancellationReason: z.string().trim().min(3).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update');

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      status: bookingStatus.optional(),
      paymentStatus: paymentStatus.optional(),
      quotationId: z.string().uuid().optional(),
      createdBy: z.string().uuid().optional(),
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

const transitionStatus = z.object({
  body: z
    .object({
      status: bookingStatus,
      cancellationReason: z.string().trim().min(3).max(1000).optional(),
      changedAt: dateTimeString.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.status === 'CANCELLED' && !value.cancellationReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cancellationReason'],
          message: 'cancellationReason is required when status is CANCELLED',
        });
      }
    }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const generateInvoice = z.object({
  body: z
    .object({
      invoiceNumber: z.string().trim().min(3).max(50).optional(),
      pdfUrl: z.string().url().max(2000).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

module.exports = {
  BookingsValidation: {
    list,
    create,
    update,
    byId,
    transitionStatus,
    generateInvoice,
  },
};
