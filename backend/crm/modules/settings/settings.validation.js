import { z } from "zod";

const emptyToUndefined = (value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

const optionalText = (min, max) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(min).max(max).optional());

const optionalEmail = (max = 160) =>
  z.preprocess(emptyToUndefined, z.string().trim().email().max(max).optional());

const optionalUrl = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().url().max(max).optional());

const DATE_FORMAT_OPTIONS = new Set([
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
]);

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(value) {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0;
  } catch {
    return false;
  }
}

const optionalTimezone = z
  .preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional())
  .refine((value) => !value || isValidTimeZone(value), {
    message: "timezone must be a valid IANA timezone (e.g. Asia/Kolkata)",
  });

const optionalLocale = z
  .preprocess(emptyToUndefined, z.string().trim().min(2).max(20).optional())
  .refine((value) => !value || isValidLocale(value), {
    message: "locale must be a valid locale (e.g. en-IN)",
  });

const optionalDateFormat = z
  .preprocess(emptyToUndefined, z.string().trim().toUpperCase().optional())
  .refine((value) => !value || DATE_FORMAT_OPTIONS.has(value), {
    message:
      "dateFormat must be one of DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY",
  });

const canonicalLeadStatus = z.enum([
  "OPEN",
  "CONTACTED",
  "WIP",
  "QUOTED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
]);

const colorValue = z
  .preprocess(emptyToUndefined, z.string().trim().min(3).max(24).optional());

const statusMainCreatePayload = z.object({
  code: optionalText(2, 80),
  label: z.string().trim().min(2).max(120),
  canonicalStatus: canonicalLeadStatus,
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  color: colorValue,
  isActive: z.boolean().optional(),
  isTerminal: z.boolean().optional(),
  requiresSubStatus: z.boolean().optional(),
  requiresQuotation: z.boolean().optional(),
  createsBooking: z.boolean().optional(),
  isBookingControlled: z.boolean().optional(),
});

const statusMainUpdatePayload = statusMainCreatePayload
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one lead status main field is required",
  );

const statusSubCreatePayload = z.object({
  mainStatusId: z.string().trim().min(1).max(80),
  code: optionalText(2, 80),
  label: z.string().trim().min(2).max(120),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  isTerminal: z.boolean().optional(),
});

const statusSubUpdatePayload = statusSubCreatePayload
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one lead status sub field is required",
  );

const reorderPayload = z.object({
  mainStatuses: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        sortOrder: z.coerce.number().int().min(0).max(10000),
      }),
    )
    .optional(),
  subStatuses: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        sortOrder: z.coerce.number().int().min(0).max(10000),
      }),
    )
    .optional(),
});

const systemPayload = z
  .object({
    companyName: optionalText(2, 160),
    supportEmail: optionalEmail(160),
    supportPhone: optionalText(5, 30),
    timezone: optionalTimezone,
    locale: optionalLocale,
    currency: optionalText(2, 10),
    dateFormat: optionalDateFormat,
    websiteUrl: optionalUrl(500),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one system setting field is required",
  );

const integrationsPayload = z
  .object({
    metaAppId: optionalText(1, 200),
    metaAccessToken: optionalText(1, 600),
    whatsappApiToken: optionalText(1, 600),
    smtpHost: optionalText(1, 200),
    smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
    smtpUser: optionalText(1, 200),
    smtpPassword: optionalText(1, 300),
    smtpFromEmail: optionalEmail(160),
    webhookUrl: optionalUrl(500),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one integration setting field is required",
  );

const readShape = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const getSystemPreferences = readShape;

const updateSystem = z.object({
  body: systemPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateIntegrations = z.object({
  body: integrationsPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const byWorkflowId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().trim().min(1).max(80) }),
  query: z.object({}).optional(),
});

const createLeadStatusMain = z.object({
  body: statusMainCreatePayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateLeadStatusMain = z.object({
  body: statusMainUpdatePayload,
  params: byWorkflowId.shape.params,
  query: z.object({}).optional(),
});

const createLeadStatusSub = z.object({
  body: statusSubCreatePayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateLeadStatusSub = z.object({
  body: statusSubUpdatePayload,
  params: byWorkflowId.shape.params,
  query: z.object({}).optional(),
});

const reorderLeadStatusWorkflow = z.object({
  body: reorderPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const SettingsValidation = {
  getAll: readShape,
  getSystem: readShape,
  getSystemPreferences,
  getIntegrations: readShape,
  updateSystem,
  updateIntegrations,
  getLeadStatusWorkflow: readShape,
  createLeadStatusMain,
  updateLeadStatusMain,
  createLeadStatusSub,
  updateLeadStatusSub,
  reorderLeadStatusWorkflow,
};

export { SettingsValidation };
