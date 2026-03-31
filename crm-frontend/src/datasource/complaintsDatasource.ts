import type { HttpClient } from "../api/apiClient";

export type ComplaintsQuery = Record<
  string,
  string | number | boolean | undefined
>;

export const createComplaintsDatasource = (client: HttpClient) => ({
  list: (params?: ComplaintsQuery) => client.get("/api/complaints", { params }),
  create: (payload: unknown) => client.post("/api/complaints", payload),
  getById: (id: string) => client.get(`/api/complaints/${id}`),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/complaints/${id}`, payload),
  listActivities: (id: string) =>
    client.get(`/api/complaints/${id}/activities`),
  addActivity: (id: string, payload: unknown) =>
    client.post(`/api/complaints/${id}/activities`, payload),
  changeStatus: (id: string, status: string, reason?: string) =>
    client.post(`/api/complaints/${id}/status`, { status, reason }),
  getStatusHistory: (id: string) =>
    client.get(`/api/complaints/${id}/status-history`),
  assign: (id: string, userId: string) =>
    client.post(`/api/complaints/${id}/assign`, { userId }),
  escalate: (id: string, reason: string) =>
    client.post(`/api/complaints/${id}/escalate`, { reason }),
});

export type ComplaintsDatasource = ReturnType<
  typeof createComplaintsDatasource
>;
