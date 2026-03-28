import type {
  LeadApiRecord,
  LeadDestinationRecord,
  LeadFollowupRecord,
  LeadFollowupsResponse,
  LeadsDatasource,
  LeadsListResponse,
  LeadsQuery,
} from "../datasource/leadsDatasource";
import {
  deriveSopStatusLabel,
  normalizeStatusToken,
  type CanonicalLeadStatus,
  type SopStatusLabel,
} from "../utils/leadStatus";

export type LeadPriority = "High" | "Medium" | "Low";

export type LeadListItem = {
  id: number | string;
  leadId: string;
  createdAt: string | null;
  name: string;
  email: string;
  phone: string;
  destination: string;
  adultsCount: number;
  childrenCount: number;
  childAges: number[];
  packageName: string;
  status: CanonicalLeadStatus;
  statusLabel: SopStatusLabel;
  subStatus: string | null;
  priority: LeadPriority;
  sla: string;
  slaBreached: boolean;
  consultant: string;
};

const toPlainText = (value: unknown, fallback = "N/A"): string => {
  if (typeof value === "string") {
    const text = value.trim();
    return text || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => toPlainText(item, ""))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [
      record.fullName,
      record.name,
      record.title,
      record.label,
      record.country,
      record.id,
    ]
      .map((item) => toPlainText(item, ""))
      .find(Boolean);

    if (preferred) return preferred;

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
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

const extractFollowups = (response: LeadFollowupsResponse) => {
  const data =
    (response as {
      data?: { data?: LeadFollowupRecord[]; items?: LeadFollowupRecord[] };
    })?.data?.data ??
    (response as {
      data?: { data?: LeadFollowupRecord[]; items?: LeadFollowupRecord[] };
    })?.data?.items ??
    (response as { data?: LeadFollowupRecord[] })?.data ??
    response;

  return Array.isArray(data) ? data : [];
};

const extractArray = (response: unknown) => {
  const payload = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(payload)) return payload;

  const firstLevelData = (payload as { data?: unknown; items?: unknown })?.data;
  if (Array.isArray(firstLevelData)) return firstLevelData;

  const firstLevelItems = (payload as { data?: unknown; items?: unknown })?.items;
  if (Array.isArray(firstLevelItems)) return firstLevelItems;

  const secondLevelData = (
    firstLevelData as { data?: unknown; items?: unknown }
  )?.data;
  if (Array.isArray(secondLevelData)) return secondLevelData;

  const secondLevelItems = (
    firstLevelData as { data?: unknown; items?: unknown }
  )?.items;
  if (Array.isArray(secondLevelItems)) return secondLevelItems;

  return [];
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

const normalizeDestination = (
  destination: LeadDestinationRecord | undefined,
  fallbackName?: string | null,
  country?: string | null,
) => {
  if (typeof destination === "string" && destination.trim()) {
    return destination.trim();
  }
  if (destination && typeof destination === "object") {
    if (destination.name && String(destination.name).trim()) {
      return String(destination.name).trim();
    }
    if (destination.country && String(destination.country).trim()) {
      return String(destination.country).trim();
    }
  }
  if (fallbackName && String(fallbackName).trim()) {
    return String(fallbackName).trim();
  }
  if (country && String(country).trim()) {
    return String(country).trim();
  }
  return "N/A";
};

const normalizeCount = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeChildAges = (lead: LeadApiRecord) => {
  const raw = (
    lead.childAges ??
    (lead as LeadApiRecord & { child_ages?: unknown }).child_ages
  ) as unknown;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((age) => (typeof age === "number" ? age : Number(age)))
    .filter((age) => Number.isFinite(age) && age >= 0 && age <= 18);
};

const normalizeCanonicalStatus = (value: unknown): CanonicalLeadStatus => {
  const normalized = normalizeStatusToken(value);
  if (normalized === "CONTACTED") return "CONTACTED";
  if (normalized === "WIP") return "WIP";
  if (normalized === "QUOTED") return "QUOTED";
  if (normalized === "FOLLOW_UP") return "FOLLOW_UP";
  if (normalized === "CONVERTED") return "CONVERTED";
  if (normalized === "LOST") return "LOST";
  if (normalized === "NON_RESPONSIVE") return "NON_RESPONSIVE";
  return "OPEN";
};

const toListItem = (lead: LeadApiRecord, index: number): LeadListItem => {
  const status = normalizeCanonicalStatus(lead.status);
  const statusLabel = deriveSopStatusLabel(lead.status, lead.subStatus, lead.statusLabel);

  return {
    id: lead.id ?? index,
    leadId:
      lead.leadId ?? lead.code ?? `#LD-${String(index + 1).padStart(3, "0")}`,
    createdAt: lead.createdAt ?? lead.created_at ?? null,
    name: lead.name ?? lead.fullName ?? lead.customerName ?? "Unknown",
    email: lead.email ?? "N/A",
    phone: lead.phone ?? lead.mobile ?? "N/A",
    destination: normalizeDestination(
      lead.destination,
      lead.destinationName,
      lead.country,
    ),
    adultsCount: normalizeCount(
      lead.adultsCount ??
        (lead as LeadApiRecord & { adults_count?: number | null }).adults_count,
      1,
    ),
    childrenCount: normalizeCount(
      lead.childrenCount ??
        (lead as LeadApiRecord & { children_count?: number | null })
          .children_count,
      0,
    ),
    childAges: normalizeChildAges(lead),
    packageName: lead.packageName ?? lead.package ?? "N/A",
    status,
    statusLabel,
    subStatus: lead.subStatus ?? null,
    priority: normalizePriority(lead),
    sla: lead.sla ?? lead.slaStatus ?? "N/A",
    slaBreached: Boolean(lead.slaBreached),
    consultant: lead.assignedUser?.fullName ?? "Unassigned",
  };
};

export const createLeadsService = (datasource: LeadsDatasource) => ({
  listLeads: async (params?: LeadsQuery): Promise<LeadListItem[]> => {
    const response = await datasource.list(params);
    const items = extractList(response);
    return items.map((lead, index) => toListItem(lead, index));
  },
  listLeadsRaw: async (params?: LeadsQuery): Promise<LeadApiRecord[]> => {
    const response = await datasource.list(params);
    return extractList(response);
  },
  createLead: (payload: unknown) => datasource.create(payload),
  getLeadById: (id: string) => datasource.getById(id),
  updateLead: (id: string, payload: unknown) => datasource.update(id, payload),
  assignLead: (id: string, payload: unknown) => datasource.assign(id, payload),
  addFollowup: (id: string, payload: unknown) => datasource.addFollowup(id, payload),
  getFollowups: async (id: string): Promise<LeadFollowupRecord[]> => {
    const response = await datasource.getFollowups(id);
    return extractFollowups(response);
  },
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
    const response = await datasource.getDestinations();
    return extractArray(response);
  },
  distributeLeads: (payload?: { limit?: number; reason?: string }) =>
    datasource.distribute(payload),
  reassignInactiveLeads: (payload?: {
    inactiveMinutes?: number;
    limit?: number;
    reason?: string;
  }) => datasource.reassignInactive(payload),
  listOverdueFollowups: (params?: { limit?: number }) =>
    datasource.listOverdueFollowups(params),
  processOverdueFollowups: (payload?: { limit?: number }) =>
    datasource.processOverdueFollowups(payload),
  processSlaBreaches: (payload?: { limit?: number }) =>
    datasource.processSlaBreaches(payload),
  processNonResponsive: (payload?: { staleDays?: number; limit?: number }) =>
    datasource.processNonResponsive(payload),
  processCadenceAutomation: (payload?: { staleDays?: number; limit?: number }) =>
    datasource.processCadenceAutomation(payload),
  disableCalls: (id: string, disabled: boolean) =>
    datasource.disableCalls(id, disabled),
  submitPublicLead: (payload: unknown) => datasource.publicCapture(payload),
});

export type LeadsService = ReturnType<typeof createLeadsService>;
