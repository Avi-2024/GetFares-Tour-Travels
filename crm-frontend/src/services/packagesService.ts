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

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  list: async (params?: PackagesQuery): Promise<PackageRecord[]> => {
    const response = await datasource.list(params);
    return extractList<any>(response).map(toPackageRecord);
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
