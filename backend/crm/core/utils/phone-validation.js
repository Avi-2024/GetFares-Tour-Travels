import { z } from "zod";

const PHONE_DIGITS_MIN = 9;
const PHONE_DIGITS_MAX = 15;

function countPhoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "").length;
}

function refinePhoneDigits(value, ctx, { required = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone is required",
      });
    }
    return;
  }

  const digits = countPhoneDigits(raw);
  if (digits < PHONE_DIGITS_MIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Phone must contain at least ${PHONE_DIGITS_MIN} digits`,
    });
  }
  if (digits > PHONE_DIGITS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Phone must contain at most ${PHONE_DIGITS_MAX} digits`,
    });
  }
}

/** Optional phone — empty allowed; otherwise 9–15 digits. */
const optionalPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .superRefine((value, ctx) => refinePhoneDigits(value, ctx, { required: false }))
  .optional();

/** Required phone — 9–15 digits. */
const requiredPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .superRefine((value, ctx) => refinePhoneDigits(value, ctx, { required: true }));

/** WhatsApp / quotation recipient phone. */
const recipientPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .superRefine((value, ctx) => refinePhoneDigits(value, ctx, { required: false }));

/**
 * Meta / website / generic webhooks — no minimum digit rule (legacy behaviour).
 * Empty or missing phone is allowed; short numbers from ads still create leads.
 */
const webhookOptionalPhoneSchema = z.string().trim().max(25).optional();

function isWebhookInboundLead(payload = {}, context = {}) {
  if (payload.metaLeadId || payload.meta_lead_id) {
    return true;
  }
  const origin = String(context.origin || "").trim().toLowerCase();
  if (origin === "meta_webhook" || origin === "webhook") {
    return true;
  }
  const platform = String(payload.platform || "").trim().toLowerCase();
  return platform === "meta";
}

export {
  PHONE_DIGITS_MIN,
  PHONE_DIGITS_MAX,
  countPhoneDigits,
  optionalPhoneSchema,
  requiredPhoneSchema,
  recipientPhoneSchema,
  webhookOptionalPhoneSchema,
  isWebhookInboundLead,
};
