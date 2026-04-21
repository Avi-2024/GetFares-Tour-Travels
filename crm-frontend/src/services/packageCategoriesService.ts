import type {
  PackageCategoriesDatasource,
  PackageCategoriesQuery,
} from "../datasource/packageCategoriesDatasource";

export type MainPackageRecord = {
  id: string;
  country: string;
  title: string;
  destination: string;
  amount: number;
  amountCurrency: string;
  isFeatured: boolean;
  description?: string | null;
  highlights?: string[];
  features?: any[];
  inclusions?: any[];
  displayOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SubPackageRecord = {
  id: string;
  mainPackageId: string;
  title: string;
  name?: string;
  startingPrice: number;
  startingPriceCurrency: string;
  duration?: string | null;
  durationDays?: number;
  durationNights?: number;
  location?: string | null;
  status?: string | null;
  publishToWebsite: boolean;
  websiteSlug?: string | null;
  isSoldOut: boolean;
  isDeleted: boolean;
  description?: string | null;
  snapshot?: string | null;
  inclusions?: string[];
  exclusions?: string[];
  paymentTerms?: string[];
  cancellationPolicy?: string[];
  tnc?: string[];
  impNotes?: string[];
  galleryImageUrls?: string[];
  hotelDetails?: string | null;
  transport?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  const data = (payload?.data as { data?: T })?.data ?? payload?.data ?? response;
  if (!data || typeof data !== "object") return null;
  return data as T;
};

export const createPackageCategoriesService = (
  datasource: PackageCategoriesDatasource,
) => ({
  listMain: async (params?: PackageCategoriesQuery): Promise<MainPackageRecord[]> => {
    const response = await datasource.listMain(params);
    return extractList<MainPackageRecord>(response);
  },
  getMainById: async (id: string) => {
    const response = await datasource.getMainById(id);
    return extractItem<MainPackageRecord>(response);
  },
  createMain: async (payload: unknown) => {
    const response = await datasource.createMain(payload);
    return extractItem<MainPackageRecord>(response);
  },
  updateMain: async (id: string, payload: unknown) => {
    const response = await datasource.updateMain(id, payload);
    return extractItem<MainPackageRecord>(response);
  },
  deleteMain: async (id: string) => datasource.deleteMain(id),

  listSub: async (
    mainPackageId: string,
    params?: PackageCategoriesQuery,
  ): Promise<SubPackageRecord[]> => {
    const response = await datasource.listSub(mainPackageId, params);
    return extractList<SubPackageRecord>(response);
  },
  getSubById: async (id: string) => {
    const response = await datasource.getSubById(id);
    return extractItem<SubPackageRecord>(response);
  },
  createSub: async (payload: unknown) => {
    const response = await datasource.createSub(payload);
    return extractItem<SubPackageRecord>(response);
  },
  updateSub: async (id: string, payload: unknown) => {
    const response = await datasource.updateSub(id, payload);
    return extractItem<SubPackageRecord>(response);
  },
  deleteSub: async (id: string) => datasource.deleteSub(id),
});

export type PackageCategoriesService = ReturnType<
  typeof createPackageCategoriesService
>;

