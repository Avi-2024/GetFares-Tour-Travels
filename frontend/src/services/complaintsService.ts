import type { ComplaintsDatasource, ComplaintsQuery } from "../datasource/complaintsDatasource";

export const createComplaintsService = (datasource: ComplaintsDatasource) => ({
  list: (params?: ComplaintsQuery) => datasource.list(params),
  create: (payload: unknown) => datasource.create(payload),
  getById: (id: string) => datasource.getById(id),
  update: (id: string, payload: unknown) => datasource.update(id, payload),
  listActivities: (id: string) => datasource.listActivities(id),
  addActivity: (id: string, payload: unknown) => datasource.addActivity(id, payload),
  changeStatus: (id: string, status: string, reason?: string) =>
    datasource.changeStatus(id, status, reason),
  getStatusHistory: (id: string) => datasource.getStatusHistory(id),
  assign: (id: string, userId: string) => datasource.assign(id, userId),
  escalate: (id: string, reason: string) => datasource.escalate(id, reason),
});

export type ComplaintsService = ReturnType<typeof createComplaintsService>;
