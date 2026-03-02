const { z } = require('zod');

const basePayload = z.object({
  name: z.string().min(2),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  metadata: z.record(z.any()).optional(),
});

const create = z.object({
  body: basePayload,
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
  CampaignsValidation: {
    create,
    update,
    byId,
    list,
  },
};
