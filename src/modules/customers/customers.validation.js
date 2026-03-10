const { z } = require('zod');

const customerSegment = z.enum(['PLATINUM', 'GOLD', 'SILVER', 'NEW']);

const basePayload = z.object({
  fullName: z.string().min(2).max(150).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  preferences: z.string().max(4000).optional(),
  lifetimeValue: z.coerce.number().nonnegative().optional(),
  segment: customerSegment.optional(),
  isDeleted: z.boolean().optional(),
});

const create = z.object({
  body: basePayload.refine(
    (value) => Boolean(value.fullName || value.phone || value.email),
    'At least one identifier is required: fullName/phone/email',
  ),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: basePayload.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required for update'),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      status: z.string().optional(),
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
