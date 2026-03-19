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

const systemPayload = z
  .object({
    companyName: optionalText(2, 160),
    supportEmail: optionalEmail(160),
    supportPhone: optionalText(5, 30),
    timezone: optionalText(2, 80),
    currency: optionalText(2, 10),
    dateFormat: optionalText(2, 40),
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
  getIntegrations: readShape,
  updateSystem,
  updateIntegrations,
};

export { SettingsValidation };
