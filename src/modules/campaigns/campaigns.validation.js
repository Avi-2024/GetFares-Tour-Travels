const { z } = require('zod');

const dateString = z.string().date();

const basePayload = z.object({
  name: z.string().trim().min(2).max(150),
  source: z.string().trim().min(2).max(100).optional(),
  budget: z.coerce.number().nonnegative().optional(),
  actualSpend: z.coerce.number().nonnegative().optional(),
  leadsGenerated: z.coerce.number().int().nonnegative().optional(),
  revenueGenerated: z.coerce.number().nonnegative().optional(),
  metaCampaignId: z.string().trim().max(100).optional(),
  metaAdsetId: z.string().trim().max(100).optional(),
  metaAdId: z.string().trim().max(100).optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});

const validateDateRange = (value, ctx) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be on or after startDate',
    });
  }
};

const createPayload = basePayload.superRefine(validateDateRange);

const updatePayload = basePayload
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update')
  .superRefine(validateDateRange);

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
      source: z.string().trim().min(2).max(100).optional(),
      name: z.string().trim().min(2).max(150).optional(),
      metaCampaignId: z.string().trim().max(100).optional(),
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
