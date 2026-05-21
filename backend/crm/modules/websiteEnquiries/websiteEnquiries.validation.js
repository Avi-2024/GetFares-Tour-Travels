import { z } from "zod";
import { webhookOptionalPhoneSchema } from "../../core/utils/phone-validation.js";

const optionalDateOnly = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    const s = String(val).trim();
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },
  z.string().date().optional(),
);

const createCaptureSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: webhookOptionalPhoneSchema,
    clientCurrency: z.string().trim().min(3).max(10).optional(),
    destination: z.string().min(2).max(150).optional(),
    destinationName: z.string().min(2).max(150).optional(),
    nationality: z.string().min(2).max(80).optional(),
    leadCountry: z.string().min(2).max(100).optional(),
    country: z.string().min(2).max(100).optional(),
    travelDate: optionalDateOnly,
    budget: z.coerce.number().nonnegative().optional(),
    numberOfDays: z.coerce.number().int().positive().optional(),
    numberOfTravellers: z.coerce.number().int().positive().optional(),
    subject: z.string().max(200).optional(),
    message: z.string().max(4000).optional(),
    leadType: z.enum(["HOLIDAY", "VISA", "BOTH"]).optional(),
    source: z.string().max(120).optional(),
    sourcePage: z.string().max(120).optional(),
    pageUrl: z.string().max(1000).optional(),
    pagePath: z.string().max(400).optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
    clientCreatedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
      .optional(),
    clientTimezone: z.string().min(2).max(80).optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.fullName && !value.name && !value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one identifier required: fullName/name/email/phone",
      });
    }
  });

const capture = z.object({
  body: createCaptureSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const WebsiteEnquiriesValidation = Object.freeze({
  capture,
});

export { WebsiteEnquiriesValidation };
