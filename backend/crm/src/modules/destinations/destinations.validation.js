import { z } from "zod";

const emptyToUndefined = (value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

const optionalText = (min, max) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(min).max(max).optional());

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().date().optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean().optional());

const destinationPayload = z.object({
  name: z.string().trim().min(2).max(150),
  country: optionalText(2, 100),
  isActive: z.boolean().optional(),
});

const destinationPatchPayload = z
  .object({
    name: optionalText(2, 150),
    country: optionalText(2, 100),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );

const pricingPayload = z
  .object({
    baseCost: z.coerce.number().nonnegative(),
    minProfitPercent: z.coerce.number().min(0).max(100),
    recommendedProfitPercent: z.coerce.number().min(0).max(100).optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (value.validFrom && value.validTo && value.validFrom > value.validTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  });

const pricingPatchPayload = z
  .object({
    baseCost: z.coerce.number().nonnegative().optional(),
    minProfitPercent: z.coerce.number().min(0).max(100).optional(),
    recommendedProfitPercent: z.coerce.number().min(0).max(100).optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  )
  .superRefine((value, ctx) => {
    if (value.validFrom && value.validTo && value.validFrom > value.validTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  });

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      search: z.string().trim().min(1).max(120).optional(),
      isActive: optionalBoolean,
    })
    .optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const createDestination = z.object({
  body: destinationPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateDestination = z.object({
  body: destinationPatchPayload,
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listPricing = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const createPricing = z.object({
  body: pricingPayload,
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const updatePricing = z.object({
  body: pricingPatchPayload,
  params: z.object({ pricingId: z.string().uuid() }),
  query: z.object({}).optional(),
});

const DestinationsValidation = {
  list,
  byId,
  createDestination,
  updateDestination,
  listPricing,
  createPricing,
  updatePricing,
};

export { DestinationsValidation };
