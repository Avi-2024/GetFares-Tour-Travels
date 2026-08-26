import { z } from "zod";

const BreezerIntegrationValidation = Object.freeze({
  byId: {
    params: z.object({
      id: z.string().trim().min(1),
    }),
  },
  byIdWithEventType: {
    params: z.object({
      id: z.string().trim().min(1),
    }),
    query: z
      .object({
        eventType: z.string().trim().max(80).optional(),
      })
      .optional(),
  },
});

export { BreezerIntegrationValidation };
