import { z } from "zod";

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
      to: z.string().min(6).max(25),
      text: z.string().min(1).max(4000),
      previewUrl: z.boolean().optional(),
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

const sendTemplate = z.object({
  body: z
    .object({
      to: z.string().min(6).max(25),
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
};
