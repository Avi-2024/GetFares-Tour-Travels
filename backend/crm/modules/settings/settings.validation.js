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

const SettingsValidation = {
  getAll: readShape,
  getSystem: readShape,
  getSystemPreferences,
  getIntegrations: readShape,
  updateSystem,
  updateIntegrations,
};

export { SettingsValidation };
