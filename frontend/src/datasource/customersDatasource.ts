import type { HttpClient } from "../api/apiClient";

export type CustomersQuery = Record<string, string | number | boolean | undefined>;

export const createCustomersDatasource = (client: HttpClient) => ({
  list: (params?: CustomersQuery) =>
    client.get("/api/customers", { params }),
  create: (payload: unknown) => client.post("/api/customers", payload),
  getById: (id: string) => client.get(`/api/customers/${id}`),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/customers/${id}`, payload),
  remove: (id: string) => client.delete(`/api/customers/${id}`),
  linkLead: (customerId: string, leadId: string) =>
    client.post(`/api/customers/${customerId}/link-lead`, { leadId }),
  getLeads: (id: string) => client.get(`/api/customers/${id}/leads`),
  getBookings: (id: string) => client.get(`/api/customers/${id}/bookings`),
  updateSegment: (id: string, segment: string) =>
    client.patch(`/api/customers/${id}/segment`, { segment }),
  export: (params?: CustomersQuery) =>
    client.get("/api/customers/export", { params, responseType: "blob" }),
});

export type CustomersDatasource = ReturnType<typeof createCustomersDatasource>;
