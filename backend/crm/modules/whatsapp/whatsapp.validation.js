import { z } from "zod";
import { requiredPhoneSchema } from "../../core/utils/phone-validation.js";

const verify = z.object({
  query: z
    .object({
      "hub.mode": z.string().optional(),
      "hub.verify_token": z.string().optional(),
      "hub.challenge": z.string().optional(),
    })
    .passthrough(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const receive = z.object({
  body: z.unknown(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const configStatus = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const sendText = z.object({
  body: z
    .object({
      to: requiredPhoneSchema,
      text: z.string().min(1).max(4000),
      previewUrl: z.boolean().optional(),
      leadId: z.string().min(10).max(64).optional(),
      phoneNumberId: z.string().min(4).max(64).optional(),
      countryId: z.string().min(4).max(64).optional(),
      countryCode: z.string().min(2).max(10).optional(),
      country: z.string().min(2).max(80).optional(),
      countryName: z.string().min(2).max(80).optional(),
    })
    .passthrough(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const listConversationMessages = z.object({
  params: z.object({
    leadId: z.string().min(10).max(64),
  }),
  query: z
    .object({
      region: z.string().max(16).optional(),
    })
    .passthrough(),
  body: z.object({}).optional(),
});

const listThreads = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      q: z.string().max(120).optional(),
      region: z.string().max(16).optional(),
    })
    .passthrough(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const sendTemplate = z.object({
  body: z
    .object({
      to: requiredPhoneSchema,
      templateName: z.string().min(1).max(200),
      language: z.string().min(2).max(10).optional(),
      components: z.array(z.any()).optional(),
      phoneNumberId: z.string().min(4).max(64).optional(),
      countryId: z.string().min(4).max(64).optional(),
      countryCode: z.string().min(2).max(10).optional(),
      country: z.string().min(2).max(80).optional(),
      countryName: z.string().min(2).max(80).optional(),
    })
    .passthrough(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const WhatsAppValidation = {
  verify,
  receive,
  configStatus,
  sendText,
  sendTemplate,
  listConversationMessages,
  listThreads,
};
