import type {
  LeadApiRecord,
  LeadsDatasource,
  LeadsListResponse,
  LeadsQuery,
} from "../datasource/leadsDatasource";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost";
export type LeadPriority = "High" | "Medium" | "Low";

export type LeadListItem = {
  id: number | string;
  leadId: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  packageName: string;
  status: LeadStatus;
  priority: LeadPriority;
  sla: string;
  consultant: string;
};

const extractList = (response: LeadsListResponse) => {
  const data =
    (response as { data?: { data?: LeadApiRecord[]; items?: LeadApiRecord[] } })
      ?.data?.data ??
    (response as { data?: { data?: LeadApiRecord[]; items?: LeadApiRecord[] } })
      ?.data?.items ??
    (response as { data?: LeadApiRecord[] })?.data ??
    response;

  return Array.isArray(data) ? data : [];
};

const normalizePriority = (priority?: string): LeadPriority => {
  const normalized = String(priority ?? "").trim().toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
};

const toListItem = (lead: LeadApiRecord, index: number): LeadListItem => {
  const statusMap: Record<string, LeadStatus> = {
    OPEN: "New",
    CONTACTED: "Contacted",
    QUALIFIED: "Qualified",
    LOST: "Lost",
  };

  const normalizedStatus =
    statusMap[String(lead.status ?? "").toUpperCase()] ?? "New";

  return {
    id: lead.id ?? index,
    leadId: lead.leadId ?? lead.code ?? `#LD-${String(index + 1).padStart(3, "0")}`,
    name: lead.name ?? lead.fullName ?? lead.customerName ?? "Unknown",
    email: lead.email ?? "N/A",
    phone: lead.phone ?? lead.mobile ?? "N/A",
    destination: lead.destination ?? lead.country ?? "N/A",
    packageName: lead.packageName ?? lead.package ?? "N/A",
    status: normalizedStatus,
    priority: normalizePriority(lead.priority),
    sla: lead.sla ?? lead.slaStatus ?? "—",
    consultant: lead.consultant ?? lead.owner ?? "Unassigned",
  };
};

export const createLeadsService = (datasource: LeadsDatasource) => ({
  listLeads: async (params?: LeadsQuery): Promise<LeadListItem[]> => {
    const response = await datasource.list(params);
    const items = extractList(response);
    return items.map((lead, index) => toListItem(lead, index));
  },
  createLead: (payload: unknown) => datasource.create(payload),
  getLeadById: (id: string) => datasource.getById(id),
  updateLead: (id: string, payload: unknown) => datasource.update(id, payload),
  assignLead: (id: string, payload: unknown) => datasource.assign(id, payload),
  addFollowup: (id: string, payload: unknown) => datasource.addFollowup(id, payload),
  getFollowups: (id: string) => datasource.getFollowups(id),
  getTimeline: (id: string) => datasource.getTimeline(id),
  markAsLost: (id: string, reason: string, notes?: string) =>
    datasource.markAsLost(id, reason, notes),
  checkDuplicate: (email?: string, phone?: string) =>
    datasource.checkDuplicate(email, phone),
  getCampaigns: () => datasource.getCampaigns(),
  getDestinations: () => datasource.getDestinations(),
  distributeLeads: () => datasource.distribute(),
  reassignInactiveLeads: () => datasource.reassignInactive(),
  processSlaBreaches: () => datasource.processSlaBreaches(),
  getSlaStatus: (id: string) => datasource.getSlaStatus(id),
  submitPublicLead: (payload: unknown) => datasource.publicCapture(payload),
});

export type LeadsService = ReturnType<typeof createLeadsService>;
