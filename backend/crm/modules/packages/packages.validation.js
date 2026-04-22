import { z } from "zod";
import { optionalQueryBoolean } from "../../core/utils/zod-query-boolean.js";

const packageStatus = z.enum(["DRAFT", "ACTIVE", "EXPIRED", "SOLD_OUT"]);
const packageCategory = z.enum([
  "BUDGET",
  "PREMIUM",
  "LUXURY",
  "HONEYMOON",
  "FAMILY",
]);
const packageKind = z.enum(["READY", "CUSTOMIZED"]);

const customServiceLine = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  cost: z.coerce.number().nonnegative(),
  markupPercent: z.coerce.number().min(0).max(100).optional(),
  sellValue: z.coerce.number().nonnegative().optional(),
});

const emptyToUndefined = (value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().date().optional(),
);

const create = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    destination: z.string().trim().min(2).max(120),
    duration: z.string().trim().min(2).max(30).optional(),
    baseCost: z.coerce.number().nonnegative().optional(),
    markupPercent: z.coerce.number().min(0).max(100).optional(),
    startingPrice: z.coerce.number().nonnegative().optional(),
    packageKind: packageKind.optional(),
    customServices: z.array(customServiceLine).max(80).optional(),
    visaDetails: z.string().max(8000).optional(),
    paymentTerms: z.string().max(4000).optional(),
    inclusions: z.string().max(10000).optional(),
    exclusions: z.string().max(10000).optional(),
    itinerary: z.any().optional(),
    hotelDetails: z.string().max(4000).optional(),
    validFrom: optionalDate,
    validTo: optionalDate,
    cancellationPolicy: z.string().max(4000).optional(),
    packageCategory: packageCategory.optional(),
    status: packageStatus.optional(),
    bannerImageUrl: z.string().max(4000).optional(),
    galleryImageUrls: z.array(z.string().max(4000)).optional(),
    metaTitle: z.string().max(180).optional(),
    metaDescription: z.string().max(2000).optional(),
    keywords: z.string().max(1000).optional(),
    publishToWebsite: z.boolean().optional(),
    websiteSlug: z.string().max(180).optional(),
    isSoldOut: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(200).optional(),
      destination: z.string().trim().min(2).max(120).optional(),
      duration: z.string().trim().min(2).max(30).optional(),
      baseCost: z.coerce.number().nonnegative().optional(),
      markupPercent: z.coerce.number().min(0).max(100).optional(),
      startingPrice: z.coerce.number().nonnegative().optional(),
      packageKind: packageKind.optional(),
      customServices: z.array(customServiceLine).max(80).optional(),
      visaDetails: z.string().max(8000).optional(),
      paymentTerms: z.string().max(4000).optional(),
      inclusions: z.string().max(10000).optional(),
      exclusions: z.string().max(10000).optional(),
      itinerary: z.any().optional(),
      hotelDetails: z.string().max(4000).optional(),
      validFrom: optionalDate,
      validTo: optionalDate,
      cancellationPolicy: z.string().max(4000).optional(),
      packageCategory: packageCategory.optional(),
      status: packageStatus.optional(),
      bannerImageUrl: z.string().max(4000).optional(),
      galleryImageUrls: z.array(z.string().max(4000)).optional(),
      metaTitle: z.string().max(180).optional(),
      metaDescription: z.string().max(2000).optional(),
      keywords: z.string().max(1000).optional(),
      publishToWebsite: z.boolean().optional(),
      websiteSlug: z.string().max(180).optional(),
      isSoldOut: z.boolean().optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required for update",
    ),
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
      limit: z.coerce.number().int().positive().optional(),
      status: packageStatus.optional(),
      destination: z.string().optional(),
      packageCategory: packageCategory.optional(),
      publishToWebsite: optionalQueryBoolean,
      isSoldOut: optionalQueryBoolean,
      search: z.string().max(120).optional(),
    })
    .optional(),
});

const publish = z.object({
  body: z
    .object({
      publishToWebsite: z.boolean().optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const createEnquiry = z.object({
  body: z.object({
    leadId: z.string().uuid().optional(),
    packageName: z.string().trim().min(2).max(200).optional(),
    travelDate: z.string().date().optional(),
    travellersCount: z.coerce.number().int().positive().optional(),
    fullName: z.string().trim().min(2).max(150).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    email: z.string().email().optional(),
    source: z.string().trim().min(2).max(120).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listEnquiries = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const PackagesValidation = {
  create,
  update,
  byId,
  list,
  publish,
  delete: byId,
  restore: byId,
  hardDelete: byId,
  createEnquiry,
  listEnquiries,

  // CMS-like main/sub endpoints (keep permissive; CMS service validates deeper)
  mainList: z.object({
    body: z.object({}).optional(),
    params: z.object({}).optional(),
    query: z.record(z.any()).optional(),
  }),
  mainById: byId,
  mainCreate: z.object({
    body: z.record(z.any()),
    params: z.object({}).optional(),
    query: z.record(z.any()).optional(),
  }),
  mainUpdate: z.object({
    body: z.record(z.any()),
    params: z.object({ id: z.string().uuid() }),
    query: z.record(z.any()).optional(),
  }),
  mainRestore: byId,
  mainHardDelete: byId,

  subList: z.object({
    body: z.object({}).optional(),
    params: z.object({ mainPackageId: z.string().uuid() }),
    query: z.record(z.any()).optional(),
  }),
  subById: byId,
  subCreate: z.object({
    body: z.record(z.any()),
    params: z.object({}).optional(),
    query: z.record(z.any()).optional(),
  }),
  subUpdate: z.object({
    body: z.record(z.any()),
    params: z.object({ id: z.string().uuid() }),
    query: z.record(z.any()).optional(),
  }),
  subRestore: byId,
  subHardDelete: byId,
};

export { PackagesValidation };
