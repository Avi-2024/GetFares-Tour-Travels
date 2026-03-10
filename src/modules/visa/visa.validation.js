const { z } = require('zod');

const visaStatus = z.enum(['DOCUMENT_PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED']);

const dateSchema = z.string().date();
const uuidSchema = z.string().uuid();

const create = z.object({
  body: z.object({
    bookingId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
    country: z.string().trim().min(2).max(100),
    visaType: z.string().trim().min(2).max(100),
    visaNumber: z.string().trim().max(100).optional(),
    fees: z.coerce.number().nonnegative().optional(),
    appointmentDate: dateSchema.optional(),
    submissionDate: dateSchema.optional(),
    status: visaStatus.optional(),
    rejectionReason: z.string().trim().max(2000).optional(),
    visaValidUntil: dateSchema.optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: z
    .object({
      bookingId: uuidSchema.optional(),
      supplierId: uuidSchema.optional(),
      country: z.string().trim().min(2).max(100).optional(),
      visaType: z.string().trim().min(2).max(100).optional(),
      visaNumber: z.string().trim().max(100).optional(),
      fees: z.coerce.number().nonnegative().optional(),
      appointmentDate: dateSchema.optional(),
      submissionDate: dateSchema.optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      visaValidUntil: dateSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update'),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      status: visaStatus.optional(),
      country: z.string().trim().min(2).max(100).optional(),
      bookingId: uuidSchema.optional(),
      supplierId: uuidSchema.optional(),
    })
    .optional(),
});

const transitionStatus = z.object({
  body: z
    .object({
      status: visaStatus,
      submissionDate: dateSchema.optional(),
      visaValidUntil: dateSchema.optional(),
      visaNumber: z.string().trim().max(100).optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      note: z.string().trim().max(2000).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.status === 'REJECTED' && !value.rejectionReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rejectionReason'],
          message: 'rejectionReason is required for REJECTED status',
        });
      }

      if (value.status === 'APPROVED' && !value.visaValidUntil) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['visaValidUntil'],
          message: 'visaValidUntil is required for APPROVED status',
        });
      }
    }),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const createDocument = z.object({
  body: z.object({
    documentType: z.string().trim().min(2).max(100),
    fileUrl: z.string().trim().min(5).max(2000),
    isVerified: z.boolean().optional(),
  }),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const verifyDocument = z.object({
  body: z.object({
    isVerified: z.boolean(),
    note: z.string().trim().max(2000).optional(),
  }),
  params: z.object({ documentId: uuidSchema }),
  query: z.object({}).optional(),
});

const listDocuments = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: uuidSchema }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      isVerified: z.coerce.boolean().optional(),
    })
    .optional(),
});

const updateChecklist = z.object({
  body: z
    .object({
      passportVerified: z.boolean().optional(),
      visaVerified: z.boolean().optional(),
      insuranceVerified: z.boolean().optional(),
      ticketVerified: z.boolean().optional(),
      hotelVerified: z.boolean().optional(),
      transferVerified: z.boolean().optional(),
      tourVerified: z.boolean().optional(),
      finalItineraryUploaded: z.boolean().optional(),
      travelReady: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one checklist field is required'),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const byVisaId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const summaryReport = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
});

module.exports = {
  VisaValidation: {
    create,
    update,
    byId,
    list,
    transitionStatus,
    createDocument,
    verifyDocument,
    listDocuments,
    updateChecklist,
    byVisaId,
    summaryReport,
  },
};
