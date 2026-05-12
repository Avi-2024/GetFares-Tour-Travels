import type {
  LeadActivityCreatePayload,
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
  resolveLeadDisplayedStatus,
  type CanonicalLeadStatus,
  type SopStatusLabel,
} from "../utils/leadStatus";

export type LeadPriority = "High" | "Medium" | "Low";

export type LeadListItem = {
  id: number | string;
  leadId: string;
  createdAt: string | null;
  clientCreatedAt?: string | null;
  clientTimezone?: string | null;
  name: string;
  email: string;
  phone: string;
  leadCountry: string;
  destination: string;
  adultsCount: number;
  childrenCount: number;
  childAges: number[];
  packageName: string;
  leadType?: string | null;
  lead_type?: string | null;
  budget?: number | null;
  salary?: number | null;
  status: CanonicalLeadStatus;
  statusLabel: SopStatusLabel;
  /** Pipeline SOP plus custom_status_label when set (badges, export). */
  statusDisplay: string;
  subStatus: string | null;
  priority: LeadPriority;
  sla: string;
  slaBreached: boolean;
  consultant: string;
  assignedBy: string | null;
  source: string | null;
};

export type LeadsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LeadStatsSummary = {
  totalLeads: number;
  newToday: number;
  followupActive: number;
  slaBreached: number;
};

const extractStringList = (response: unknown) => {
  const payload = (response as { data?: unknown })?.data ?? response;
  if (Array.isArray(payload)) {
    return payload.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const items = (payload as { items?: unknown })?.items;
  if (Array.isArray(items)) {
    return items.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
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

const normalizePagination = (value: unknown): LeadsPagination | null => {
  if (!value || typeof value !== "object") return null;
  const payload = value as {
    page?: number | string;
    limit?: number | string;
    total?: number | string;
    totalPages?: number | string;
  };

  const page = Number(payload.page);
  const limit = Number(payload.limit);
  const total = Number(payload.total);
  const totalPages = Number(payload.totalPages);

  if (
    !Number.isFinite(page) ||
    !Number.isFinite(limit) ||
    !Number.isFinite(total)
  ) {
    return null;
  }

  return {
    page: Math.max(1, Math.trunc(page)),
    limit: Math.max(1, Math.trunc(limit)),
    total: Math.max(0, Math.trunc(total)),
    totalPages:
      Number.isFinite(totalPages) && totalPages > 0 ?
        Math.trunc(totalPages)
      : Math.max(1, Math.ceil(total / Math.max(1, Math.trunc(limit)))),
  };
};

const extractListPayload = (response: LeadsListResponse) => {
  const root = response as {
    data?:
      | LeadApiRecord[]
      | {
          data?: LeadApiRecord[] | { data?: LeadApiRecord[]; items?: LeadApiRecord[] };
          items?: LeadApiRecord[];
          pagination?: unknown;
        };
    pagination?: unknown;
  };

  const level1 = root?.data;
  const level2 =
    level1 && typeof level1 === "object" && !Array.isArray(level1) ?
      level1.data
    : undefined;

  const items =
    Array.isArray(level2) ? level2
    : Array.isArray(
        level2 && typeof level2 === "object" ?
          (level2 as { data?: LeadApiRecord[]; items?: LeadApiRecord[] }).data
        : undefined,
      ) ?
      (level2 as { data?: LeadApiRecord[]; items?: LeadApiRecord[] }).data || []
    : Array.isArray(
        level2 && typeof level2 === "object" ?
          (level2 as { data?: LeadApiRecord[]; items?: LeadApiRecord[] }).items
        : undefined,
      ) ?
      (level2 as { data?: LeadApiRecord[]; items?: LeadApiRecord[] }).items || []
    : Array.isArray(
        level1 && typeof level1 === "object" && !Array.isArray(level1) ?
          (level1 as { items?: LeadApiRecord[] }).items
        : undefined,
      ) ?
      (level1 as { items?: LeadApiRecord[] }).items || []
    : Array.isArray(level1) ? level1
    : Array.isArray(response) ? response
    : [];

  const pagination =
    normalizePagination(
      level1 && typeof level1 === "object" && !Array.isArray(level1) ?
        (level1 as { pagination?: unknown }).pagination
      : undefined,
    ) ??
    normalizePagination(
      level2 && typeof level2 === "object" ?
        (level2 as { pagination?: unknown }).pagination
      : undefined,
    ) ??
    normalizePagination(root?.pagination);

  return { items, pagination };
};

function extractCustomStatusPresetItems(response: unknown): string[] {
  const payload = (response as { data?: unknown })?.data ?? response;
  const wrapper = payload as { items?: unknown };
  const root = payload;
  const items = wrapper?.items ?? (root as string[]);
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

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

const extractFollowups = (response: LeadFollowupsResponse) => {
  const rows = extractArray(response);
  return Array.isArray(rows) ? (rows as LeadFollowupRecord[]) : [];
};

const extractStats = (response: unknown): LeadStatsSummary => {
  const payload = (response as { data?: unknown })?.data ?? response;
  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    totalLeads: normalizeCount(record.totalLeads, 0),
    newToday: normalizeCount(record.newToday, 0),
    followupActive: normalizeCount(record.followupActive, 0),
    slaBreached: normalizeCount(record.slaBreached, 0),
  };
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
  const customRaw =
    (lead as LeadApiRecord & { customStatusLabel?: string | null })
      .customStatusLabel ??
    (lead as LeadApiRecord & { custom_status_label?: string | null })
      .custom_status_label ??
    null;
  const statusDisplay = resolveLeadDisplayedStatus({
    customStatusLabel: customRaw,
    canonicalStatus: lead.status,
    subStatus: lead.subStatus,
    providedStatusLabel: lead.statusLabel,
  });
  const leadIdFromBackend = toPlainText(
    (lead as LeadApiRecord & { leadCode?: string | null; lead_code?: string | null })
      .leadCode ??
      (lead as LeadApiRecord & { leadCode?: string | null; lead_code?: string | null })
        .lead_code ??
      lead.leadId ??
      lead.id ??
      lead.code ??
      "",
    "",
  );

  return {
    id: lead.id ?? index,
    leadId: leadIdFromBackend || "N/A",
    createdAt: lead.createdAt ?? lead.created_at ?? null,
    clientCreatedAt: lead.clientCreatedAt ?? lead.client_created_at ?? null,
    clientTimezone: lead.clientTimezone ?? lead.client_timezone ?? null,
    name: lead.name ?? lead.fullName ?? lead.customerName ?? "Unknown",
    email: lead.email ?? "N/A",
    phone: lead.phone ?? lead.mobile ?? "N/A",
    leadCountry: toPlainText(lead.leadCountry ?? lead.country ?? "N/A", "N/A"),
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
    leadType: (lead as LeadApiRecord & { leadType?: string | null }).leadType ?? null,
    lead_type: (lead as LeadApiRecord & { lead_type?: string | null }).lead_type ?? null,
    budget:
      typeof (lead as any)?.budget === "number"
        ? (lead as any).budget
        : (lead as any)?.budget != null
          ? Number((lead as any).budget)
          : null,
    salary:
      typeof (lead as any)?.salary === "number"
        ? (lead as any).salary
        : (lead as any)?.salary != null
          ? Number((lead as any).salary)
          : null,
    status,
    statusLabel,
    statusDisplay,
    subStatus: lead.subStatus ?? null,
    priority: normalizePriority(lead),
    sla: lead.sla ?? lead.slaStatus ?? "N/A",
    slaBreached: Boolean(lead.slaBreached),
    consultant: lead.assignedUser?.fullName ?? "Unassigned",
    assignedBy: lead.assignedByUser?.fullName ?? null,
    source: lead.source ?? lead.leadSource ?? null,
  };
};

export const createLeadsService = (datasource: LeadsDatasource) => ({
  listLeads: async (params?: LeadsQuery): Promise<LeadListItem[]> => {
    const response = await datasource.list(params);
    const { items } = extractListPayload(response);
    return items.map((lead, index) => toListItem(lead, index));
  },
  listLeadsPage: async (
    params?: LeadsQuery,
  ): Promise<{ items: LeadListItem[]; pagination: LeadsPagination | null }> => {
    const response = await datasource.list(params);
    const { items, pagination } = extractListPayload(response);
    return {
      items: items.map((lead, index) => toListItem(lead, index)),
      pagination,
    };
  },
  getLeadStats: async (params?: LeadsQuery): Promise<LeadStatsSummary> => {
    const response = await datasource.getStats(params);
    return extractStats(response);
  },
  listLeadsRaw: async (params?: LeadsQuery): Promise<LeadApiRecord[]> => {
    const nextParams = {
      ...(params || {}),
      limit: Math.min(Number((params as any)?.limit || 25), 50)
    };
    const response = await datasource.list(nextParams);
    return extractListPayload(response).items;
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
    const matches = extractListPayload(response).items;
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
  getLeadDestinations: async (params?: LeadsQuery) => {
    const response = await datasource.getLeadDestinations(params);
    return extractStringList(response);
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
  createLeadActivity: (payload: LeadActivityCreatePayload) =>
    datasource.createLeadActivity(payload),
  listLeadActivities: (leadId: string) => datasource.listLeadActivities(leadId),
  disableCalls: (
    id: string,
    disabled: boolean,
    extra?: { activityCreatedAt?: string; activityTimezone?: string },
  ) => datasource.disableCalls(id, disabled, extra),
  submitPublicLead: (payload: unknown) => datasource.publicCapture(payload),
  listCustomStatusPresets: async (): Promise<string[]> => {
    const response = await datasource.listCustomStatusPresets();
    return extractCustomStatusPresetItems(response);
  },
  addCustomStatusPreset: async (label: string): Promise<string[]> => {
    const response = await datasource.addCustomStatusPreset(label.trim());
    return extractCustomStatusPresetItems(response);
  },
});

export type LeadsService = ReturnType<typeof createLeadsService>;
