const { z } = require('zod');

const quotationStatus = z.enum(['DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED']);
const transitionStatus = z.enum(['APPROVED', 'REJECTED']);
const templateType = z.enum(['READY_PACKAGE', 'VISA', 'CUSTOM_ITINERARY']);
const deliveryChannel = z.enum(['EMAIL', 'WHATSAPP', 'MANUAL']);
const itemType = z.enum(['HOTEL', 'FLIGHT', 'TRANSFER', 'VISA', 'INSURANCE', 'OTHER']);

const componentSchema = z.object({
  itemType,
  description: z.string().min(1).max(1000),
  cost: z.coerce.number().nonnegative(),
});

const currencyCode = z.string().trim().min(3).max(10);

const create = z.object({
  body: z.object({
    leadId: z.string().uuid(),
    parentQuoteId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
    pricingId: z.string().uuid().optional(),
    components: z.array(componentSchema).min(1),
    marginPercent: z.coerce.number().min(0).max(100),
    minMarginPercent: z.coerce.number().min(0).max(100).optional(),
    discount: z.coerce.number().nonnegative().optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
    taxAmount: z.coerce.number().nonnegative().optional(),
    supplierCost: z.coerce.number().nonnegative().optional(),
    supplierTaxAmount: z.coerce.number().nonnegative().optional(),
    markupAmount: z.coerce.number().nonnegative().optional(),
    serviceFeeAmount: z.coerce.number().nonnegative().optional(),
    gstAmount: z.coerce.number().nonnegative().optional(),
    tcsAmount: z.coerce.number().nonnegative().optional(),
    costCurrency: currencyCode.optional(),
    clientCurrency: currencyCode.optional(),
    supplierCurrency: currencyCode.optional(),
    expiresInHours: z.coerce.number().int().positive().max(720).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: z
    .object({
      templateId: z.string().uuid().optional(),
      components: z.array(componentSchema).min(1).optional(),
      marginPercent: z.coerce.number().min(0).max(100).optional(),
      minMarginPercent: z.coerce.number().min(0).max(100).optional(),
      discount: z.coerce.number().nonnegative().optional(),
      taxPercent: z.coerce.number().min(0).max(100).optional(),
      taxAmount: z.coerce.number().nonnegative().optional(),
      supplierCost: z.coerce.number().nonnegative().optional(),
      supplierTaxAmount: z.coerce.number().nonnegative().optional(),
      markupAmount: z.coerce.number().nonnegative().optional(),
      serviceFeeAmount: z.coerce.number().nonnegative().optional(),
      gstAmount: z.coerce.number().nonnegative().optional(),
      tcsAmount: z.coerce.number().nonnegative().optional(),
      costCurrency: currencyCode.optional(),
      clientCurrency: currencyCode.optional(),
      supplierCurrency: currencyCode.optional(),
      notes: z.string().max(2000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update'),
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
      status: quotationStatus.optional(),
      leadId: z.string().uuid().optional(),
      createdBy: z.string().uuid().optional(),
      includeItems: z.coerce.boolean().optional(),
    })
    .optional(),
});

const generatePdf = z.object({
  body: z
    .object({
      pdfUrl: z.string().min(1).max(2000).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const send = z.object({
  body: z
    .object({
      channel: deliveryChannel.optional(),
      recipientEmail: z.string().email().optional(),
      recipientPhone: z.string().min(6).max(25).optional(),
      message: z.string().max(1000).optional(),
      expiresInHours: z.coerce.number().int().positive().max(720).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const trackView = z.object({
  body: z
    .object({
      deviceInfo: z.string().max(500).optional(),
      userAgent: z.string().max(1000).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const approveMargin = z.object({
  body: z
    .object({
      note: z.string().max(2000).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const statusTransition = z.object({
  body: z
    .object({
      status: transitionStatus,
      reason: z.string().max(2000).optional(),
      travelStartDate: z.string().date().optional(),
      travelEndDate: z.string().date().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.status === 'REJECTED' && !value.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'reason is required when status is REJECTED',
        });
      }
    }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const views = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    })
    .optional(),
});

const runReminders = z.object({
  body: z
    .object({
      notOpenedHours: z.coerce.number().int().positive().max(720).optional(),
      viewedNoActionHours: z.coerce.number().int().positive().max(720).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const leadToQuoteReport = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      createdBy: z.string().uuid().optional(),
    })
    .optional(),
});

const createTemplate = z.object({
  body: z.object({
    code: z.string().min(2).max(50),
    name: z.string().min(2).max(150),
    templateType,
    headerBranding: z.string().max(4000).optional(),
    inclusions: z.string().max(8000).optional(),
    exclusions: z.string().max(8000).optional(),
    paymentTerms: z.string().max(4000).optional(),
    cancellationPolicy: z.string().max(4000).optional(),
    footerDisclaimer: z.string().max(4000).optional(),
    minMarginPercent: z.coerce.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateTemplate = z.object({
  body: z
    .object({
      code: z.string().min(2).max(50).optional(),
      name: z.string().min(2).max(150).optional(),
      templateType: templateType.optional(),
      headerBranding: z.string().max(4000).optional(),
      inclusions: z.string().max(8000).optional(),
      exclusions: z.string().max(8000).optional(),
      paymentTerms: z.string().max(4000).optional(),
      cancellationPolicy: z.string().max(4000).optional(),
      footerDisclaimer: z.string().max(4000).optional(),
      minMarginPercent: z.coerce.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update'),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listTemplates = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      isActive: z.coerce.boolean().optional(),
      templateType: templateType.optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    })
    .optional(),
});

module.exports = {
  QuotationsValidation: {
    create,
    update,
    byId,
    list,
    generatePdf,
    send,
    trackView,
    approveMargin,
    statusTransition,
    views,
    runReminders,
    leadToQuoteReport,
    createTemplate,
    updateTemplate,
    listTemplates,
  },
};
