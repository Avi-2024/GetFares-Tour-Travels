import type { PackagesDatasource, PackagesQuery } from "../datasource/packagesDatasource";

export type PackageStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "SOLD_OUT";
export type PackageCategory =
  | "BUDGET"
  | "PREMIUM"
  | "LUXURY"
  | "HONEYMOON"
  | "FAMILY";
export type PackageKind = "READY" | "CUSTOMIZED";

export type PackageCustomServiceLine = {
  id?: string;
  name: string;
  description?: string;
  cost: number;
  markupPercent?: number;
  sellValue?: number;
};

export type PackageRecord = {
  id: string;
  name: string;
  destination: string;
  duration: string | null;
  baseCost: number;
  markupPercent: number;
  startingPrice: number;
  packageKind: PackageKind;
  customServices: PackageCustomServiceLine[];
  visaDetails: string | null;
  paymentTerms: string | null;
  inclusions: string | null;
  exclusions: string | null;
  itinerary: unknown;
  hotelDetails: string | null;
  cancellationPolicy: string | null;
  packageCategory: PackageCategory | null;
  status: PackageStatus;
  validFrom: string | null;
  validTo: string | null;
  publishToWebsite: boolean;
  isSoldOut: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  // CMS-like fields
  country: string | null;
  image: string | null;
  rating: number | null;
  location: string | null;
  transport: string | null;
  snapshot: string | null;
  highlights: string[];
  features: { iconName: string; description: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  displayOrder: number | null;
  isFeatured: boolean;
};

export type PackageEnquiry = {
  id: string;
  packageId: string;
  leadId: string | null;
  packageName: string | null;
  travelDate: string | null;
  travellersCount: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  createdAt: string | null;
};

export type PackageListPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PackageListSummary = {
  totalPackages: number;
  publishedCount: number;
  activeCount: number;
  soldOutCount: number;
  destinationCount: number;
  totalValue: number;
};

export type PackageListResponse = {
  items: PackageRecord[];
  pagination: PackageListPagination;
  summary: PackageListSummary;
};

const extractList = <T>(response: unknown): T[] => {
  const payload = response as { data?: { data?: T[]; items?: T[] } | T[] };
  const data =
    (payload?.data as { data?: T[]; items?: T[] })?.data ??
    (payload?.data as { data?: T[]; items?: T[] })?.items ??
    payload?.data ??
    response;
  return Array.isArray(data) ? data : [];
};

const extractItem = <T>(response: unknown): T | null => {
  const payload = response as { data?: { data?: T } | T };
  const data =
    (payload?.data as { data?: T })?.data ??
    payload?.data ??
    response;
  if (!data || typeof data !== "object") return null;
  return data as T;
};

const extractPagination = (
  response: unknown,
  itemCount: number,
): PackageListPagination => {
  const payload = (response ?? {}) as {
    data?: { pagination?: Partial<PackageListPagination> } | unknown;
    pagination?: Partial<PackageListPagination>;
  };
  const nested =
    typeof payload.data === "object" && payload.data !== null
      ? (payload.data as { pagination?: Partial<PackageListPagination> }).pagination
      : undefined;
  const pagination = payload.pagination ?? nested ?? {};
  const parsedLimit = Number(pagination.limit ?? itemCount ?? 25) || 25;
  return {
    page: Number(pagination.page ?? 1),
    limit: parsedLimit,
    totalItems: Number(pagination.totalItems ?? itemCount),
    totalPages: Number(
      pagination.totalPages ??
        Math.max(1, Math.ceil(itemCount / Math.max(1, parsedLimit))),
    ),
  };
};

const extractSummary = (
  response: unknown,
  items: PackageRecord[],
): PackageListSummary => {
  const payload = (response ?? {}) as {
    data?: { summary?: Partial<PackageListSummary> } | unknown;
    summary?: Partial<PackageListSummary>;
  };
  const nested =
    typeof payload.data === "object" && payload.data !== null
      ? (payload.data as { summary?: Partial<PackageListSummary> }).summary
      : undefined;
  const summary = payload.summary ?? nested ?? {};
  return {
    totalPackages: Number(summary.totalPackages ?? items.length),
    publishedCount: Number(
      summary.publishedCount ??
        items.filter((item) => item.publishToWebsite).length,
    ),
    activeCount: Number(
      summary.activeCount ?? items.filter((item) => item.status === "ACTIVE").length,
    ),
    soldOutCount: Number(
      summary.soldOutCount ?? items.filter((item) => item.isSoldOut).length,
    ),
    destinationCount: Number(
      summary.destinationCount ??
        new Set(items.map((item) => item.destination?.trim()).filter(Boolean)).size,
    ),
    totalValue: Number(
      summary.totalValue ??
        items.reduce((sum, item) => sum + Number(item.startingPrice || 0), 0),
    ),
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMaybeJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const toStringList = (value: unknown): string[] => {
  const parsed = parseMaybeJson<unknown>(value, value);
  return Array.isArray(parsed)
    ? parsed.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
};

const toFeatureList = (
  value: unknown,
): { iconName: string; description: string }[] => {
  const parsed = parseMaybeJson<unknown>(value, value);
  return Array.isArray(parsed)
    ? parsed
        .map((item: any) => ({
          iconName: String(
            item?.iconName ?? item?.icon_name ?? item?.title ?? "",
          ).trim(),
          description: String(item?.description ?? "").trim(),
        }))
        .filter((item) => item.iconName || item.description)
    : [];
};

const toPackageRecord = (row: any): PackageRecord => {
  const kind = String(row?.packageKind ?? "READY").toUpperCase();
  const customRaw = row?.customServices;
  const customServices: PackageCustomServiceLine[] = Array.isArray(customRaw)
    ? customRaw.map((s: any) => ({
        id: s?.id ? String(s.id) : undefined,
        name: String(s?.name ?? ""),
        description: s?.description ? String(s.description) : undefined,
        cost: toNumber(s?.cost),
        markupPercent:
          s?.markupPercent != null ? toNumber(s.markupPercent) : undefined,
        sellValue: s?.sellValue != null ? toNumber(s.sellValue) : undefined,
      }))
    : [];
  
  // Parse highlights
  const highlights = toStringList(row?.highlights);
  const features = toFeatureList(row?.features);
  
  return {
    id: String(row?.id ?? ""),
    name: String(row?.name ?? ""),
    destination: String(row?.destination ?? ""),
    duration: row?.duration ?? null,
    baseCost: toNumber(row?.baseCost),
    markupPercent: toNumber(row?.markupPercent),
    startingPrice: toNumber(row?.startingPrice),
    packageKind: kind === "CUSTOMIZED" ? "CUSTOMIZED" : "READY",
    customServices,
    visaDetails: row?.visaDetails ?? null,
    paymentTerms: row?.paymentTerms ?? null,
    inclusions: row?.inclusions ?? null,
    exclusions: row?.exclusions ?? null,
    itinerary: row?.itinerary ?? null,
    hotelDetails: row?.hotelDetails ?? null,
    cancellationPolicy: row?.cancellationPolicy ?? null,
    packageCategory: row?.packageCategory ?? null,
    status: (row?.status ?? "DRAFT") as PackageStatus,
    validFrom: row?.validFrom ?? null,
    validTo: row?.validTo ?? null,
    publishToWebsite: Boolean(row?.publishToWebsite),
    isSoldOut: Boolean(row?.isSoldOut),
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    // CMS-like fields
    country: row?.country ?? null,
    image: row?.image ?? null,
    rating: row?.rating != null ? toNumber(row.rating) : null,
    location: row?.location ?? null,
    transport: row?.transport ?? null,
    snapshot: row?.snapshot ?? null,
    highlights,
    features,
    metaTitle: row?.metaTitle ?? null,
    metaDescription: row?.metaDescription ?? null,
    keywords: row?.keywords ?? null,
    displayOrder: row?.displayOrder != null ? toNumber(row.displayOrder) : null,
    isFeatured: Boolean(row?.isFeatured),
  };
};

const toEnquiryRecord = (row: any): PackageEnquiry => ({
  id: String(row?.id ?? ""),
  packageId: String(row?.packageId ?? ""),
  leadId: row?.leadId ?? null,
  packageName: row?.packageName ?? null,
  travelDate: row?.travelDate ?? null,
  travellersCount: toNumber(row?.travellersCount, 1),
  fullName: row?.fullName ?? null,
  phone: row?.phone ?? null,
  email: row?.email ?? null,
  source: row?.source ?? null,
  createdAt: row?.createdAt ?? null,
});

export const createPackagesService = (datasource: PackagesDatasource) => ({
  list: async (params?: PackagesQuery): Promise<PackageListResponse> => {
    const response = await datasource.list(params);
    const items = extractList<any>(response).map(toPackageRecord);
    return {
      items,
      pagination: extractPagination(response, items.length),
      summary: extractSummary(response, items),
    };
  },
  create: async (payload: unknown): Promise<PackageRecord | null> => {
    const response = await datasource.create(payload);
    const item = extractItem<any>(response);
    return item ? toPackageRecord(item) : null;
  },
  getById: async (id: string): Promise<PackageRecord | null> => {
    const response = await datasource.getById(id);
    const item = extractItem<any>(response);
    return item ? toPackageRecord(item) : null;
  },
  update: async (id: string, payload: unknown): Promise<PackageRecord | null> => {
    const response = await datasource.update(id, payload);
    const item = extractItem<any>(response);
    return item ? toPackageRecord(item) : null;
  },
  publish: async (
    id: string,
    payload?: { publishToWebsite?: boolean },
  ): Promise<PackageRecord | null> => {
    const response = await datasource.publish(id, payload);
    const item = extractItem<any>(response);
    return item ? toPackageRecord(item) : null;
  },
  delete: async (id: string): Promise<void> => {
    await datasource.delete(id);
  },
  restore: async (id: string): Promise<void> => {
    await datasource.restore(id);
  },
  hardDelete: async (id: string): Promise<void> => {
    await datasource.hardDelete(id);
  },
  listEnquiries: async (id: string): Promise<PackageEnquiry[]> => {
    const response = await datasource.listEnquiries(id);
    return extractList<any>(response).map(toEnquiryRecord);
  },
  createEnquiry: async (id: string, payload: unknown): Promise<PackageEnquiry | null> => {
    const response = await datasource.createEnquiry(id, payload);
    const item = extractItem<any>(response);
    return item ? toEnquiryRecord(item) : null;
  },
});

export type PackagesService = ReturnType<typeof createPackagesService>;
