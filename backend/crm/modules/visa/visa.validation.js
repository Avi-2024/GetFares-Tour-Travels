import { z } from "zod";
import { optionalQueryBoolean } from "../../core/utils/zod-query-boolean.js";

const visaStatus = z.enum([
  "DOCUMENT_PENDING",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
]);

const visaWorkflowStage = z.enum([
  "DOCUMENT_COLLECTION",
  "APPLICATION_SUBMITTED",
  "BIOMETRICS_SCHEDULED",
  "UNDER_PROCESS",
  "APPROVED",
  "REJECTED",
  "DELIVERED",
]);

const dateSchema = z.string().date();
const uuidSchema = z.string().uuid();

function resolveTargetStage(value = {}) {
  if (value.workflowStage) {
    return value.workflowStage;
  }

  if (value.status === "DOCUMENT_PENDING") {
    return "DOCUMENT_COLLECTION";
  }

  if (value.status === "SUBMITTED") {
    return "APPLICATION_SUBMITTED";
  }

  if (value.status === "APPROVED") {
    return "APPROVED";
  }

  if (value.status === "REJECTED") {
    return "REJECTED";
  }

  return null;
}

function validateVisaStageRequirements(value, ctx) {
  const targetStage = resolveTargetStage(value);

  if (targetStage === "BIOMETRICS_SCHEDULED" && !value.appointmentDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["appointmentDate"],
      message: "appointmentDate is required for BIOMETRICS_SCHEDULED stage",
    });
  }

  if (
    (targetStage === "APPROVED" || targetStage === "DELIVERED") &&
    !value.visaValidUntil
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["visaValidUntil"],
      message: "visaValidUntil is required for APPROVED or DELIVERED stage",
    });
  }

  if (targetStage === "REJECTED" && !value.rejectionReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectionReason"],
      message: "rejectionReason is required for REJECTED stage",
    });
  }
}

const create = z.object({
  body: z
    .object({
      bookingId: uuidSchema.optional(),
      supplierId: uuidSchema.optional(),
      country: z.string().trim().min(2).max(100),
      visaType: z.string().trim().min(2).max(100),
      visaNumber: z.string().trim().max(100).optional(),
      fees: z.coerce.number().nonnegative().optional(),
      appointmentDate: dateSchema.optional(),
      submissionDate: dateSchema.optional(),
      status: visaStatus.optional(),
      workflowStage: visaWorkflowStage.optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      visaValidUntil: dateSchema.optional(),
      deliveredAt: dateSchema.optional(),
    })
    .superRefine(validateVisaStageRequirements),
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
      status: visaStatus.optional(),
      workflowStage: visaWorkflowStage.optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      visaValidUntil: dateSchema.optional(),
      deliveredAt: dateSchema.optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required for update",
    )
    .superRefine(validateVisaStageRequirements),
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
      workflowStage: visaWorkflowStage.optional(),
      country: z.string().trim().min(2).max(100).optional(),
      bookingId: uuidSchema.optional(),
      supplierId: uuidSchema.optional(),
    })
    .optional(),
});

const transitionStatus = z.object({
  body: z
    .object({
      status: visaStatus.optional(),
      workflowStage: visaWorkflowStage.optional(),
      appointmentDate: dateSchema.optional(),
      submissionDate: dateSchema.optional(),
      visaValidUntil: dateSchema.optional(),
      visaNumber: z.string().trim().max(100).optional(),
      rejectionReason: z.string().trim().max(2000).optional(),
      deliveredAt: dateSchema.optional(),
      note: z.string().trim().max(2000).optional(),
    })
    .refine(
      (value) => Boolean(value.status || value.workflowStage),
      "status or workflowStage is required",
    )
    .superRefine((value, ctx) => {
      validateVisaStageRequirements(value, ctx);
    }),
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
});

const createDocument = z.object({
  body: z.object({
    documentType: z.string().trim().min(2).max(100),
    fileUrl: z.string().trim().min(5).max(2000).optional(),
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
      isVerified: optionalQueryBoolean,
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
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one checklist field is required",
    ),
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

const VisaValidation = {
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
};

export { VisaValidation };
