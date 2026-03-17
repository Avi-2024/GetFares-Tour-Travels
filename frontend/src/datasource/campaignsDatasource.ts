import type { HttpClient } from "../api/apiClient";

export type CampaignsQuery = Record<
  string,
  string | number | boolean | undefined
>;

export const createCampaignsDatasource = (client: HttpClient) => ({
  list: (params?: CampaignsQuery) => client.get("/api/campaigns", { params }),
  create: (payload: unknown) => client.post("/api/campaigns", payload),
  getById: (id: string) => client.get(`/api/campaigns/${id}`),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/campaigns/${id}`, payload),
  remove: (id: string) => client.delete(`/api/campaigns/${id}`),
  duplicate: (id: string) => client.post(`/api/campaigns/${id}/duplicate`),
  export: (params?: CampaignsQuery) =>
    client.get("/api/campaigns/export", {
      params,
      responseType: "blob",
    }),
});

export type CampaignsDatasource = ReturnType<typeof createCampaignsDatasource>;
