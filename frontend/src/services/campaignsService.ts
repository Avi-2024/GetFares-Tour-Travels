import type {
  CampaignsDatasource,
  CampaignsQuery,
} from "../datasource/campaignsDatasource";

export const createCampaignsService = (datasource: CampaignsDatasource) => ({
  list: (params?: CampaignsQuery) => datasource.list(params),
  create: (payload: unknown) => datasource.create(payload),
  getById: (id: string) => datasource.getById(id),
  update: (id: string, payload: unknown) => datasource.update(id, payload),
  remove: (id: string) => datasource.remove(id),
  duplicate: (id: string) => datasource.duplicate(id),
  export: (params?: CampaignsQuery) => datasource.export(params),
});

export type CampaignsService = ReturnType<typeof createCampaignsService>;
