import type { HttpClient } from "../api/apiClient";

export type PackageCategoriesQuery = Record<
  string,
  string | number | boolean | undefined
>;

export const createPackageCategoriesDatasource = (client: HttpClient) => ({
  listMain: (params?: PackageCategoriesQuery) =>
    client.get("/api/packages/main", { params }),
  getMainById: (id: string) => client.get(`/api/packages/main/${id}`),
  createMain: (payload: unknown) => client.post("/api/packages/main", payload),
  updateMain: (id: string, payload: unknown) =>
    client.put(`/api/packages/main/${id}`, payload),
  deleteMain: (id: string) => client.delete(`/api/packages/main/${id}`),
  restoreMain: (id: string) => client.patch(`/api/packages/main/${id}/restore`),
  hardDeleteMain: (id: string) =>
    client.delete(`/api/packages/main/${id}/hard-delete`),

  listSub: (mainPackageId: string, params?: PackageCategoriesQuery) =>
    client.get(`/api/packages/main/${mainPackageId}/sub`, { params }),
  getSubById: (id: string) => client.get(`/api/packages/sub/${id}`),
  createSub: (payload: unknown) => client.post("/api/packages/sub", payload),
  updateSub: (id: string, payload: unknown) =>
    client.put(`/api/packages/sub/${id}`, payload),
  deleteSub: (id: string) => client.delete(`/api/packages/sub/${id}`),
  restoreSub: (id: string) => client.patch(`/api/packages/sub/${id}/restore`),
  hardDeleteSub: (id: string) =>
    client.delete(`/api/packages/sub/${id}/hard-delete`),
});

export type PackageCategoriesDatasource = ReturnType<
  typeof createPackageCategoriesDatasource
>;

