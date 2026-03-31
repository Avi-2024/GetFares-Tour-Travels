import type { HttpClient } from "../api/apiClient";

export type PackagesQuery = Record<string, string | number | boolean | undefined>;

export const createPackagesDatasource = (client: HttpClient) => ({
  list: (params?: PackagesQuery) => client.get("/api/packages", { params }),
  create: (payload: unknown) => client.post("/api/packages", payload),
  getById: (id: string) => client.get(`/api/packages/${id}`),
  update: (id: string, payload: unknown) => client.patch(`/api/packages/${id}`, payload),
  publish: (id: string, payload?: { publishToWebsite?: boolean }) =>
    client.post(`/api/packages/${id}/publish`, payload),
  listEnquiries: (id: string) => client.get(`/api/packages/${id}/enquiries`),
  createEnquiry: (id: string, payload: unknown) =>
    client.post(`/api/packages/${id}/enquiries`, payload),
});

export type PackagesDatasource = ReturnType<typeof createPackagesDatasource>;
