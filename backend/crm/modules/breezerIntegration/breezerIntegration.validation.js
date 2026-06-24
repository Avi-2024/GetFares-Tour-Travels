import { z } from "zod";

const BreezerIntegrationValidation = Object.freeze({
  byId: {
    params: z.object({
      id: z.string().trim().min(1),
    }),
  },
});

export { BreezerIntegrationValidation };
