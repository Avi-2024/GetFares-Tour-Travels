const { z } = require('zod');

const baseCaptureSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    phone: z.string().min(6).max(20).optional(),
    email: z.string().email().optional(),
    panNumber: z.string().min(8).max(20).optional(),
    addressLine: z.string().min(5).max(2000).optional(),
    clientCurrency: z.string().min(3).max(10).optional(),
    budget: z.coerce.number().nonnegative().optional(),
    travelDate: z.string().date().optional(),
    campaignId: z.string().uuid().optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.fullName && !value.name && !value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one identifier is required: fullName/name/email/phone',
      });
    }
  });

const metaLead = z.object({
  body: baseCaptureSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const websiteEnquiry = z.object({
  body: baseCaptureSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const whatsappEnquiry = z.object({
  body: baseCaptureSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  WebhooksValidation: {
    metaLead,
    websiteEnquiry,
    whatsappEnquiry,
  },
};
