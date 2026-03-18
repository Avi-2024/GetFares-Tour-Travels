import type {
  LeadApiRecord,
  LeadsDatasource,
  LeadsListResponse,
  LeadsQuery,
} from "../datasource/leadsDatasource";
import { DESTINATIONS } from "../data/staticLists";

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

const extractArray = (response: unknown) => {
  const data = (response as { data?: unknown })?.data ?? response;
  return Array.isArray(data) ? data : [];
};

const normalizePriority = (lead: LeadApiRecord): LeadPriority => {
  if (lead.priorityLevel !== undefined && lead.priorityLevel !== null) {
    const numeric =
      typeof lead.priorityLevel === "number"
        ? lead.priorityLevel
        : Number(lead.priorityLevel);
    if (Number.isFinite(numeric)) {
      if (numeric >= 3) return "High";
      if (numeric >= 2) return "Medium";
      return "Low";
    }
  }

  const temperature = String(lead.temperature ?? "")
    .trim()
    .toUpperCase();
  if (temperature === "HOT") return "High";
  if (temperature === "COLD") return "Low";
  if (temperature === "WARM") return "Medium";

  const normalized = String(lead.priority ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
};

const toListItem = (lead: LeadApiRecord, index: number): LeadListItem => {
  const statusMap: Record<string, LeadStatus> = {
    OPEN: "New",
    CONTACTED: "Contacted",
    WIP: "Contacted",
    FOLLOW_UP: "Contacted",
    QUALIFIED: "Qualified",
    QUOTED: "Qualified",
    CONVERTED: "Qualified",
    LOST: "Lost",
    NON_RESPONSIVE: "Lost",
  };

  const normalizedStatus =
    statusMap[String(lead.status ?? "").toUpperCase()] ?? "New";

  return {
    id: lead.id ?? index,
    leadId:
      lead.leadId ?? lead.code ?? `#LD-${String(index + 1).padStart(3, "0")}`,
    name: lead.name ?? lead.fullName ?? lead.customerName ?? "Unknown",
    email: lead.email ?? "N/A",
    phone: lead.phone ?? lead.mobile ?? "N/A",
    destination: lead.destination ?? lead.country ?? "N/A",
    packageName: lead.packageName ?? lead.package ?? "N/A",
    status: normalizedStatus,
    priority: normalizePriority(lead),
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
  addFollowup: (id: string, payload: unknown) =>
    datasource.addFollowup(id, payload),
  getFollowups: (id: string) => datasource.getFollowups(id),
  getTimeline: (id: string) => datasource.getTimeline(id),
  markAsLost: (id: string, reason: string, notes?: string) =>
    datasource.markAsLost(id, reason, notes),
  checkDuplicate: async (email?: string, phone?: string) => {
    const response = await datasource.checkDuplicate(email, phone);
    const matches = extractList(response);
    return {
      data: {
        isDuplicate: matches.length > 0,
        message: matches.length ? "Similar lead already exists" : "",
        matches,
      },
    };
  },
  getCampaigns: () => datasource.getCampaigns(),
  getDestinations: async () => {
    try {
      const response = await datasource.getDestinations();
      const list = extractArray(response);
      return list.length ? list : DESTINATIONS;
    } catch {
      return DESTINATIONS;
    }
  },
  distributeLeads: () => datasource.distribute(),
  reassignInactiveLeads: () => datasource.reassignInactive(),
  processSlaBreaches: () => datasource.processSlaBreaches(),
  getSlaStatus: (id: string) => datasource.getSlaStatus(id),
  submitPublicLead: (payload: unknown) => datasource.publicCapture(payload),
});

export type LeadsService = ReturnType<typeof createLeadsService>;
