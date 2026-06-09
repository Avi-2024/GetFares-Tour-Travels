import type {
  BookingsDatasource,
  BookingsQuery,
} from "../datasource/bookingsDatasource";

export const createBookingsService = (datasource: BookingsDatasource) => ({
  list: (params?: BookingsQuery) => datasource.list(params),
  stats: (params?: BookingsQuery) => datasource.stats(params),
  create: (payload: unknown) => datasource.create(payload),
  getById: (id: string) => datasource.getById(id),
  update: (id: string, payload: unknown) => datasource.update(id, payload),
  changeStatus: (id: string, payload: unknown) =>
    datasource.changeStatus(id, payload),
  statusHistory: (id: string) => datasource.statusHistory(id),
  generateInvoice: (id: string) => datasource.generateInvoice(id),
  approve: (id: string) => datasource.approve(id),
  listInvoices: (id: string) => datasource.listInvoices(id),
  getDocuments: (id: string) => datasource.getDocuments(id),
  uploadDocument: (id: string, formData: FormData) =>
    datasource.uploadDocument(id, formData),
  getPaymentStatus: (id: string) => datasource.getPaymentStatus(id),
  recordPayment: (id: string, payload: unknown) =>
    datasource.recordPayment(id, payload),
  getPayments: (id: string) => datasource.getPayments(id),
  sendConfirmation: (id: string) => datasource.sendConfirmation(id),
  cancel: (id: string, reason: string) => datasource.cancel(id, reason),
});

export type BookingsService = ReturnType<typeof createBookingsService>;
