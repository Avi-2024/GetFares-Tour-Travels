import { z } from "zod";

const customerSegment = z.enum(["PLATINUM", "GOLD", "SILVER", "NEW"]);
const listSortBy = z.enum(["name", "ltv", "bookings", "createdAt"]);
const listSortOrder = z.enum(["asc", "desc"]);

/** Empty string from forms is not a value — treat as omitted for optional fields. */
function emptyToUndefined(value) {
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
}

const optionalPan = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(5).max(20).optional(),
);

const optionalPhone = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(6).max(20).optional(),
);

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email().max(150).optional(),
);

const optionalClientCurrency = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(3).max(10).optional(),
);

const createPayload = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: optionalPhone,
  email: optionalEmail,
  preferences: z.string().trim().max(5000).optional(),
  lifetimeValue: z.coerce.number().nonnegative().optional(),
  segment: customerSegment.optional(),
  panNumber: optionalPan,
  addressLine: z.string().trim().max(2000).optional(),
  clientCurrency: optionalClientCurrency,
});

const updatePayload = z
  .object({
    fullName: z.string().trim().min(2).max(150).optional(),
    phone: optionalPhone,
    email: optionalEmail,
    preferences: z.string().trim().max(5000).optional(),
    lifetimeValue: z.coerce.number().nonnegative().optional(),
    segment: customerSegment.optional(),
    panNumber: optionalPan,
    addressLine: z.string().trim().max(2000).optional(),
    clientCurrency: optionalClientCurrency,
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );

const create = z.object({
  body: createPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: updatePayload,
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
      search: z.string().trim().max(150).optional(),
      sortBy: listSortBy.optional(),
      sortOrder: listSortOrder.optional(),
      createdFrom: z.string().date().optional(),
      createdTo: z.string().date().optional(),
      segment: customerSegment.optional(),
      email: z.string().email().optional(),
      phone: z.string().trim().min(6).max(20).optional(),
      clientCurrency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

const remove = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

export const CustomersValidation = {
  create,
  update,
  byId,
  list,
  remove,
};
