import type { HttpClient } from "../api/apiClient";

export type BookingsQuery = Record<
  string,
  string | number | boolean | undefined
>;

const mapPaymentMode = (value?: string) => {
  const mode = String(value || "")
    .trim()
    .toLowerCase();
  if (mode === "cash") return "CASH";
  if (mode === "card") return "CARD";
  if (mode === "cheque") return "BANK_TRANSFER";
  if (mode === "bank") return "BANK_TRANSFER";
  return "BANK_TRANSFER";
};

const toIsoDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export const createBookingsDatasource = (client: HttpClient) => ({
  list: (params?: BookingsQuery) => client.get("/api/bookings", { params }),
  stats: (params?: BookingsQuery) =>
    client.get("/api/bookings/stats", { params }),
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
  approve: (id: string) => client.post(`/api/bookings/${id}/approve`),
  listInvoices: (id: string) => client.get(`/api/bookings/${id}/invoices`),
  getDocuments: (id: string) => client.get(`/api/bookings/${id}/documents`),
  uploadDocument: (id: string, formData: FormData) =>
    client.post(`/api/bookings/${id}/documents`, formData),
  getPaymentStatus: (id: string) =>
    client.get(`/api/bookings/${id}`),
  recordPayment: (id: string, payload: unknown) => {
    const body = (payload as {
      amount?: number;
      method?: string;
      reference?: string;
      notes?: string;
      date?: string;
    }) || { amount: 0 };
    return client.post("/api/payments", {
      bookingId: id,
      amount: body.amount ?? 0,
      paymentMode: mapPaymentMode(body.method),
      paymentReference: body.reference || undefined,
      paidAt: toIsoDate(body.date),
      status: "PENDING",
      isVerified: false,
      notes: body.notes || undefined,
    });
  },
  getPayments: (id: string) =>
    client.get("/api/payments", { params: { bookingId: id } }),
  sendConfirmation: (id: string) =>
    client.post(`/api/bookings/${id}/status`, { status: "CONFIRMED" }),
  cancel: (id: string, reason: string) =>
    client.post(`/api/bookings/${id}/status`, {
      status: "CANCELLED",
      cancellationReason: reason,
    }),
});

export type BookingsDatasource = ReturnType<typeof createBookingsDatasource>;
