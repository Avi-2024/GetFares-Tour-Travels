import type {
  CustomersDatasource,
  CustomersQuery,
} from "../datasource/customersDatasource";

export const createCustomersService = (datasource: CustomersDatasource) => ({
  list: (params?: CustomersQuery) => datasource.list(params),
  create: (payload: unknown) => datasource.create(payload),
  getById: (id: string) => datasource.getById(id),
  update: (id: string, payload: unknown) => datasource.update(id, payload),
  remove: (id: string) => datasource.remove(id),
  linkLead: (customerId: string, leadId: string) =>
    datasource.linkLead(customerId, leadId),
  getLeads: (id: string) => datasource.getLeads(id),
  getBookings: (id: string) => datasource.getBookings(id),
  updateSegment: (id: string, segment: string) =>
    datasource.updateSegment(id, segment),
  export: (params?: CustomersQuery) => datasource.export(params),
});

export type CustomersService = ReturnType<typeof createCustomersService>;
