import type { HttpClient } from "../api/apiClient";

export type BookingsQuery = Record<
  string,
  string | number | boolean | undefined
>;

export const createBookingsDatasource = (client: HttpClient) => ({
  list: (params?: BookingsQuery) => client.get("/api/bookings", { params }),
  create: (payload: unknown) => client.post("/api/bookings", payload),
  getById: (id: string) => client.get(`/api/bookings/${id}`),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/bookings/${id}`, payload),
  changeStatus: (id: string, payload: unknown) =>
    client.post(`/api/bookings/${id}/status`, payload),
  statusHistory: (id: string) =>
    client.get(`/api/bookings/${id}/status-history`),
  generateInvoice: (id: string) =>
    client.post(`/api/bookings/${id}/invoices/generate`),
  listInvoices: (id: string) => client.get(`/api/bookings/${id}/invoices`),
  getDocuments: (id: string) => client.get(`/api/bookings/${id}/documents`),
  uploadDocument: (id: string, formData: FormData) =>
    client.post(`/api/bookings/${id}/documents`, formData),
  getPaymentStatus: (id: string) =>
    client.get(`/api/bookings/${id}/payment-status`),
  recordPayment: (id: string, payload: unknown) =>
    client.post(`/api/bookings/${id}/payments`, payload),
  getPayments: (id: string) => client.get(`/api/bookings/${id}/payments`),
  sendConfirmation: (id: string) =>
    client.post(`/api/bookings/${id}/send-confirmation`),
  cancel: (id: string, reason: string) =>
    client.post(`/api/bookings/${id}/status`, {
      status: "CANCELLED",
      reason,
    }),
});

export type BookingsDatasource = ReturnType<typeof createBookingsDatasource>;
