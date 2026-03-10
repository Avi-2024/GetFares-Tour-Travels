const { z } = require('zod');

const customerSegment = z.enum(['PLATINUM', 'GOLD', 'SILVER', 'NEW']);

const createPayload = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(6).max(20).optional(),
  email: z.string().email().max(150).optional(),
  preferences: z.string().trim().max(5000).optional(),
  lifetimeValue: z.coerce.number().nonnegative().optional(),
  segment: customerSegment.optional(),
  panNumber: z.string().trim().min(5).max(20).optional(),
  addressLine: z.string().trim().max(2000).optional(),
  clientCurrency: z.string().trim().min(3).max(10).optional(),
});

const updatePayload = z
  .object({
    fullName: z.string().trim().min(2).max(150).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    email: z.string().email().max(150).optional(),
    preferences: z.string().trim().max(5000).optional(),
    lifetimeValue: z.coerce.number().nonnegative().optional(),
    segment: customerSegment.optional(),
    panNumber: z.string().trim().min(5).max(20).optional(),
    addressLine: z.string().trim().max(2000).optional(),
    clientCurrency: z.string().trim().min(3).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update');

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
      segment: customerSegment.optional(),
      email: z.string().email().optional(),
      phone: z.string().trim().min(6).max(20).optional(),
      clientCurrency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

module.exports = {
  CustomersValidation: {
    create,
    update,
    byId,
    list,
  },
};
