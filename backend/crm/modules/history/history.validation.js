import { z } from "zod";

const wallClock = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

const create = z.object({
  body: z.object({
    created_at: wallClock,
    timezone: z.string().trim().min(1).max(50),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
});

export const HistoryValidation = {
  create,
  list,
};
