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

/** User wall clock `YYYY-MM-DD HH:mm:ss` — stored as-is, no conversion. */
const wallClockString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  .max(32);

const optionalWallClock = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined ? undefined : v,
  wallClockString.optional(),
);

const optionalClientTimezone = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined ? undefined : String(v).trim(),
  z.string().min(2).max(80).optional(),
);

const requiredClientTimezone = z
  .string()
  .trim()
  .min(2)
  .max(50);

/** Accepts YYYY-MM-DD or ISO datetimes; maps "", null to undefined (omit). */
function preprocessOptionalDateOnly(val) {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  const s = String(val).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const optionalDateOnly = z.preprocess(
  preprocessOptionalDateOnly,
  z.string().date().optional(),
);

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
  travelDate: optionalDateOnly,
  travelEndDate: optionalDateOnly,
  budget: z.coerce.number().nonnegative().optional(),
  salary: z.coerce.number().nonnegative().optional(),
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
  clientCreatedAt: optionalWallClock,
  clientTimezone: optionalClientTimezone,
  activityCreatedAt: optionalWallClock,
  activityTimezone: optionalClientTimezone,
});

const create = z.object({
  body: basePayload
    .extend({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().min(6).max(20),
      email: z.string().email(),
      autoAssign: z.boolean().optional(),
      allowDuplicate: z.boolean().optional(),
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
      limit: z.coerce.number().int().positive().max(50).optional(),
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
      fromDate: optionalDateOnly,
      toDate: optionalDateOnly,
      sla: z.enum(["WITHIN_SLA", "OVERDUE", "PENDING"]).optional(),
      sortBy: z
        .enum([
          "NEWEST_FIRST",
          "OLDEST_FIRST",
          "NAME_A_Z",
          "STATUS",
          "CREATED_AT_DESC",
          "CREATED_AT_ASC",
          "NAME_ASC",
          "STATUS_ASC",
          "COUNTRY_ASC",
        ])
        .optional(),
    })
    .optional(),
});

const listDestinations = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      search: z.string().trim().max(150).optional(),
      country: z.string().trim().max(100).optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
});

const stats = list;

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
      activityCreatedAt: optionalWallClock,
      activityTimezone: optionalClientTimezone,
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
    /** @deprecated optional duplicate; server uses followupLocalAt only */
    followupDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
    followupLocalAt: wallClockString,
    clientTimezone: requiredClientTimezone,
    activityCreatedAt: optionalWallClock,
    activityTimezone: optionalClientTimezone,
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
    activityCreatedAt: optionalWallClock,
    activityTimezone: optionalClientTimezone,
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const createLeadActivity = z.object({
  body: z.object({
    lead_id: z.string().uuid(),
    notes: z.string().max(4000).optional(),
    created_at: wallClockString,
    timezone: z.string().trim().min(1).max(50),
    activity_type: z.string().max(100).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const listLeadActivities = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    lead_id: z.string().uuid(),
  }),
});

const LeadsValidation = {
  create,
  update,
  byId,
  list,
  stats,
  listDestinations,
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
  createLeadActivity,
  listLeadActivities,
};

export { LeadsValidation };
