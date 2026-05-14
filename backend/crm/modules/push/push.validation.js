import { z } from "zod";

const webPushSubscriptionSchema = z.object({
  endpoint: z.string().min(1),
  expirationTime: z.union([z.number(), z.null()]).optional(),
  keys: z
    .object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    })
    .passthrough()
    .optional(),
});

const listMine = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const publicKey = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const subscribe = z.object({
  body: z.union([
    z.object({
      subscription: webPushSubscriptionSchema
        .or(z.record(z.unknown()))
        .optional(),
      endpoint: z.string().min(1).optional(),
      expirationTime: z.union([z.number(), z.null()]).optional(),
      keys: z
        .object({
          p256dh: z.string().min(1),
          auth: z.string().min(1),
        })
        .passthrough()
        .optional(),
      userAgent: z.string().max(255).optional(),
    }),
    webPushSubscriptionSchema.extend({
      userAgent: z.string().max(255).optional(),
    }),
  ]),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const unsubscribe = z.object({
  body: z.object({
    endpoint: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const PushValidation = Object.freeze({
  listMine,
  publicKey,
  subscribe,
  unsubscribe,
});

export { PushValidation };

