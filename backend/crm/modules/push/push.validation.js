import { z } from "zod";

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
  body: z.object({
    subscription: z.record(z.any()),
    userAgent: z.string().max(255).optional(),
  }),
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

