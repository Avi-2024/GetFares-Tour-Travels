import { z } from "zod";

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      includeInactive: z.coerce.boolean().optional(),
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
      includeUsage: z.coerce.boolean().optional(),
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
