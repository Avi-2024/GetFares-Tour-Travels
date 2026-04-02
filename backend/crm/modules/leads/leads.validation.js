import { z } from "zod";

const leadStatus = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .transform((value) => value.toUpperCase());
const leadType = z.enum(["HOLIDAY", "VISA", "BOTH"]);
const hotelCategory = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["3_STAR", "4_STAR", "5_STAR", "ANY"]).optional(),
);

const dateTimeString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date-time",
  });

const basePayload = z.object({
  fullName: z.string().min(2),
  nationality: z.string().min(2).max(80).optional(),
  leadCountry: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  countryId: z.string().uuid().optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  panNumber: z.string().min(8).max(20).optional(),
  addressLine: z.string().min(5).max(2000).optional(),
  clientCurrency: z.string().min(3).max(10).optional(),
  destinationId: z.string().uuid().optional(),
  travelFrom: z.string().min(2).max(150).optional(),
  travelTo: z.string().min(2).max(150).optional(),
  destinationName: z.string().min(2).max(150).optional(),
  destination: z.string().min(2).max(150).optional(),
  travelDate: z.string().date().optional(),
  travelEndDate: z.string().date().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  source: z.string().min(2).max(100).optional(),
  campaignId: z.string().uuid().optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  adultsCount: z.coerce.number().int().min(0).optional(),
  childrenCount: z.coerce.number().int().min(0).optional(),
  childAges: z.array(z.coerce.number().int().min(0).max(18)).optional(),
  visaRequired: z.boolean().optional(),
  leadType: leadType.optional(),
  type: z.string().min(2).max(40).optional(),
  preferredHotelCategory: hotelCategory,
  travelPurpose: z.string().max(50).optional(),
  subStatus: z.string().max(60).optional(),
  respondedPositively: z.boolean().optional(),
  priorityLevel: z.coerce.number().int().nonnegative().optional(),
  isVip: z.boolean().optional(),
  callsDisabled: z.boolean().optional(),
  followupType: z
    .enum(["CALL", "WHATSAPP", "EMAIL", "FINAL_REMINDER", "TASK"])
    .optional(),
  status: leadStatus.optional(),
  assignedTo: z.string().uuid().optional(),
  qualificationCompleted: z.boolean().optional(),
  closedReason: z.string().max(1000).optional(),
  nextFollowupDate: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

const create = z.object({
  body: basePayload
    .extend({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().min(6).max(20),
      email: z.string().email(),
      autoAssign: z.boolean().optional(),
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: basePayload
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required for update",
    )
    .superRefine((value, ctx) => {
      if (value.status === "LOST" && !value.closedReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closedReason"],
          message: "closedReason is required when status is LOST",
        });
      }
    }),
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
      search: z.string().trim().max(150).optional(),
      quickFilter: z
        .enum(["ALL", "ACTIVE", "FOLLOW_UP", "CLOSED", "LATE_RESPONSE"])
        .optional(),
      status: leadStatus.optional(),
      source: z.string().optional(),
      temperature: z.enum(["HOT", "WARM", "COLD"]).optional(),
      subStatus: z.string().max(60).optional(),
      leadType: leadType.optional(),
      type: z.string().min(2).max(40).optional(),
      leadCountry: z.string().min(2).max(100).optional(),
      country: z.string().min(2).max(100).optional(),
      countryId: z.string().uuid().optional(),
      assignedTo: z.string().uuid().optional(),
      email: z.string().trim().max(150).optional(),
      phone: z.string().trim().max(20).optional(),
      leadId: z.string().trim().max(120).optional(),
      destination: z.string().trim().max(150).optional(),
      fromDate: z.string().date().optional(),
      toDate: z.string().date().optional(),
      sla: z.enum(["WITHIN_SLA", "OVERDUE", "PENDING"]).optional(),
      sortBy: z
        .enum(["NEWEST_FIRST", "OLDEST_FIRST", "NAME_A_Z", "STATUS"])
        .optional(),
    })
    .optional(),
});

const assign = z.object({
  body: z
    .object({
      force: z.boolean().optional(),
      assignedTo: z.string().uuid().optional(),
      excludeUserId: z.string().uuid().optional(),
      reason: z.string().max(200).optional(),
      mode: z
        .enum([
          "MANUAL",
          "AUTO",
          "AUTO_DISTRIBUTION",
          "AUTO_REASSIGN",
          "AUTO_CREATE",
        ])
        .optional(),
      roleName: z.enum(["agent", "manager"]).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const distribute = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
      reason: z.string().max(200).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const reassignInactive = z.object({
  body: z
    .object({
      inactiveMinutes: z.coerce.number().int().positive().max(1440).optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
      reason: z.string().max(200).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createFollowup = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
    followupType: z
      .enum(["CALL", "WHATSAPP", "EMAIL", "FINAL_REMINDER", "TASK"])
      .optional(),
    followupNumber: z.coerce.number().int().min(1).max(4).optional(),
    cadenceCode: z.string().max(50).optional(),
    followupDate: dateTimeString,
    notes: z.string().max(2000).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listFollowupsByLeadId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listOverdueFollowups = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
});

const processOverdueFollowups = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const processSlaBreaches = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const processNonResponsive = z.object({
  body: z
    .object({
      staleDays: z.coerce.number().int().positive().max(30).optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const processCadenceAutomation = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
      staleDays: z.coerce.number().int().positive().max(30).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const disableCalls = z.object({
  body: z.object({
    disabled: z.boolean(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const LeadsValidation = {
  create,
  update,
  byId,
  list,
  assign,
  distribute,
  reassignInactive,
  createFollowup,
  listFollowupsByLeadId,
  listOverdueFollowups,
  processOverdueFollowups,
  processSlaBreaches,
  processNonResponsive,
  processCadenceAutomation,
  disableCalls,
};

export { LeadsValidation };
