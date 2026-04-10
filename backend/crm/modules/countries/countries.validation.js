import { z } from "zod";
import { optionalQueryBoolean } from "../../core/utils/zod-query-boolean.js";

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      includeInactive: optionalQueryBoolean,
      search: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z
    .object({
      includeUsage: optionalQueryBoolean,
    })
    .optional(),
});

const create = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(10),
    name: z.string().trim().min(2).max(120),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: z
    .object({
      code: z.string().trim().min(2).max(10).optional(),
      name: z.string().trim().min(2).max(120).optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const CountriesValidation = Object.freeze({
  list,
  byId,
  create,
  update,
});

export { CountriesValidation };
