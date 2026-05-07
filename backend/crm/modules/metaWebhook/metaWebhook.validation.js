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

export const MetaWebhookValidation = {
  verify,
  receive,
};
