import { z } from "zod";

const uuidParam = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const changes = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      cursor: z.string().trim().max(2000).optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
      entities: z.string().trim().max(200).optional(),
    })
    .optional(),
});

const webhookEvents = z.enum([
  "*",
  "lead.created",
  "lead.updated",
  "booking.created",
  "booking.updated",
  "payment.created",
  "payment.updated",
  "refund.created",
  "refund.updated",
]);

const webhookUrl = z
  .string()
  .url()
  .max(1000)
  .refine((value) => {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" ||
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    );
  }, "Production webhook URLs must use HTTPS");

const createWebhookEndpoint = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    webhookUrl,
    subscribedEvents: z.array(webhookEvents).min(1).max(20),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateWebhookEndpoint = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      webhookUrl: webhookUrl.optional(),
      subscribedEvents: z.array(webhookEvents).min(1).max(20).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listWebhookDeliveries = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(25),
      status: z.enum(["PENDING", "PROCESSING", "DELIVERED", "FAILED"]).optional(),
    })
    .optional(),
});

const PartnerIntegrationValidation = Object.freeze({
  changes,
  byId: uuidParam,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  listWebhookDeliveries,
});

export { PartnerIntegrationValidation };
