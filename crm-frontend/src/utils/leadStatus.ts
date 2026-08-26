export const SOP_STATUS_LABELS = [
  "NEW",
  "CONTACTED",
  "NEGOTIATION",
  "QUOTED",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "FOLLOW_UP_3",
  "FOLLOW_UP_4",
  "FINAL_REMINDER",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
] as const;

export type SopStatusLabel = (typeof SOP_STATUS_LABELS)[number];

/** Stored in UI state + dropdown `value` when user types a free-text status */
export const CUSTOM_STATUS_TOKEN_PREFIX = "CUSTOM_LABEL:";

export function encodeCustomStatusComboValue(label: string): string {
  const s = String(label ?? "").trim().slice(0, 191);
  if (!s) return "NEW";
  return `${CUSTOM_STATUS_TOKEN_PREFIX}${encodeURIComponent(s)}`;
}

export function decodeCustomStatusComboValue(value: string): string | null {
  const v = String(value ?? "");
  if (!v.startsWith(CUSTOM_STATUS_TOKEN_PREFIX)) return null;
  try {
    const d = decodeURIComponent(
      v.slice(CUSTOM_STATUS_TOKEN_PREFIX.length),
    ).trim();
    return d || null;
  } catch {
    return null;
  }
}

export function isEncodedCustomStatusValue(value: string): boolean {
  return String(value ?? "").startsWith(CUSTOM_STATUS_TOKEN_PREFIX);
}

export type CanonicalLeadStatus =
  | "OPEN"
  | "CONTACTED"
  | "WIP"
  | "QUOTED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST"
  | "NON_RESPONSIVE";

export type LeadStatusMain = {
  id: string;
  code: string;
  label: string;
  canonicalStatus: CanonicalLeadStatus;
  sortOrder: number;
  color?: string | null;
  isActive: boolean;
  isSystem: boolean;
  isTerminal: boolean;
  requiresSubStatus: boolean;
  requiresQuotation: boolean;
  createsBooking: boolean;
  isBookingControlled: boolean;
};

export type LeadStatusSub = {
  id: string;
  mainStatusId: string;
  mainStatusCode?: string | null;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  isTerminal: boolean;
};

export type LeadStatusWorkflow = {
  mainStatuses: LeadStatusMain[];
  subStatuses: LeadStatusSub[];
};

type StatusConversion = {
  canonical: CanonicalLeadStatus;
  subStatus?: string;
};

const DOC_TO_CANONICAL: Record<SopStatusLabel, StatusConversion> = {
  NEW: { canonical: "OPEN" },
  CONTACTED: { canonical: "CONTACTED" },
  NEGOTIATION: { canonical: "WIP" },
  QUOTED: { canonical: "QUOTED" },
  FOLLOW_UP_1: { canonical: "FOLLOW_UP", subStatus: "FOLLOW_UP_1" },
  FOLLOW_UP_2: { canonical: "FOLLOW_UP", subStatus: "FOLLOW_UP_2" },
  FOLLOW_UP_3: { canonical: "FOLLOW_UP", subStatus: "FOLLOW_UP_3" },
  FOLLOW_UP_4: { canonical: "FOLLOW_UP", subStatus: "FOLLOW_UP_4" },
  FINAL_REMINDER: { canonical: "FOLLOW_UP", subStatus: "FINAL_REMINDER" },
  CONVERTED: { canonical: "CONVERTED" },
  LOST: { canonical: "LOST" },
  NON_RESPONSIVE: { canonical: "NON_RESPONSIVE" },
};

export const STATUS_REQUIRING_QUALIFICATION = new Set<CanonicalLeadStatus>([
  "CONTACTED",
  "WIP",
  "FOLLOW_UP",
  "QUOTED",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
]);

export const normalizeStatusToken = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const deriveSopStatusLabel = (
  canonicalStatus?: string | null,
  subStatus?: string | null,
  providedStatusLabel?: string | null,
): SopStatusLabel => {
  const provided = normalizeStatusToken(providedStatusLabel);
  if (SOP_STATUS_LABELS.includes(provided as SopStatusLabel)) {
    return provided as SopStatusLabel;
  }

  const canonical = normalizeStatusToken(canonicalStatus);
  const sub = normalizeStatusToken(subStatus);

  if (canonical === "OPEN") return "NEW";
  if (canonical === "WIP") return "NEGOTIATION";
  if (canonical === "FOLLOW_UP") {
    if (sub === "FINAL_REMINDER") return "FINAL_REMINDER";
    if (/^FOLLOW_UP_[1-4]$/.test(sub)) return sub as SopStatusLabel;
    return "FOLLOW_UP_1";
  }
  if (canonical === "CONTACTED") return "CONTACTED";
  if (canonical === "QUOTED") return "QUOTED";
  if (canonical === "CONVERTED") return "CONVERTED";
  if (canonical === "LOST") return "LOST";
  if (canonical === "NON_RESPONSIVE") return "NON_RESPONSIVE";
  return "NEW";
};

export const sopLabelToCanonical = (label: SopStatusLabel) =>
  DOC_TO_CANONICAL[label];

export const toStatusLabelText = (label: SopStatusLabel) =>
  label.replace(/_/g, " ");

export const DEFAULT_LEAD_STATUS_WORKFLOW: LeadStatusWorkflow = {
  mainStatuses: [
    {
      id: "NEW",
      code: "NEW",
      label: "New",
      canonicalStatus: "OPEN",
      sortOrder: 10,
      color: "#2563eb",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "CONTACT_ATTEMPTED",
      code: "CONTACT_ATTEMPTED",
      label: "Contact Attempted",
      canonicalStatus: "CONTACTED",
      sortOrder: 20,
      color: "#f97316",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: true,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "CONTACT_ESTABLISHED",
      code: "CONTACT_ESTABLISHED",
      label: "Contact Established",
      canonicalStatus: "CONTACTED",
      sortOrder: 30,
      color: "#0f766e",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: true,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "QUOTATION_IN_PROGRESS",
      code: "QUOTATION_IN_PROGRESS",
      label: "Quotation in Progress",
      canonicalStatus: "WIP",
      sortOrder: 40,
      color: "#7c3aed",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "QUOTATION_SENT",
      code: "QUOTATION_SENT",
      label: "Quotation Sent",
      canonicalStatus: "QUOTED",
      sortOrder: 50,
      color: "#0891b2",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "FOLLOW_UP",
      code: "FOLLOW_UP",
      label: "Follow Up",
      canonicalStatus: "FOLLOW_UP",
      sortOrder: 60,
      color: "#d97706",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: true,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "BOOKING_CONFIRMATION_AWAITED",
      code: "BOOKING_CONFIRMATION_AWAITED",
      label: "Booking Confirmation Awaited",
      canonicalStatus: "FOLLOW_UP",
      sortOrder: 70,
      color: "#ca8a04",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
    {
      id: "PAYMENT_PARTIALLY_RECEIVED",
      code: "PAYMENT_PARTIALLY_RECEIVED",
      label: "Payment Partially Received",
      canonicalStatus: "FOLLOW_UP",
      sortOrder: 80,
      color: "#16a34a",
      isActive: true,
      isSystem: true,
      isTerminal: false,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: true,
    },
    {
      id: "BOOKING_CONFIRMED",
      code: "BOOKING_CONFIRMED",
      label: "Booking Confirmed",
      canonicalStatus: "CONVERTED",
      sortOrder: 90,
      color: "#059669",
      isActive: true,
      isSystem: true,
      isTerminal: true,
      requiresSubStatus: false,
      requiresQuotation: false,
      createsBooking: true,
      isBookingControlled: false,
    },
    {
      id: "CLOSED",
      code: "CLOSED",
      label: "Closed",
      canonicalStatus: "LOST",
      sortOrder: 100,
      color: "#dc2626",
      isActive: true,
      isSystem: true,
      isTerminal: true,
      requiresSubStatus: true,
      requiresQuotation: false,
      createsBooking: false,
      isBookingControlled: false,
    },
  ],
  subStatuses: [
    { id: "NO_RESPONSE_1", mainStatusId: "CONTACT_ATTEMPTED", mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_1", label: "1 - No response", sortOrder: 10, isActive: true, isSystem: true, isTerminal: false },
    { id: "NO_RESPONSE_2", mainStatusId: "CONTACT_ATTEMPTED", mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_2", label: "2 - No response", sortOrder: 20, isActive: true, isSystem: true, isTerminal: false },
    { id: "NO_RESPONSE_3", mainStatusId: "CONTACT_ATTEMPTED", mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_3", label: "3 - No response", sortOrder: 30, isActive: true, isSystem: true, isTerminal: false },
    { id: "NO_RESPONSE_4", mainStatusId: "CONTACT_ATTEMPTED", mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_4", label: "4 - No response", sortOrder: 40, isActive: true, isSystem: true, isTerminal: false },
    { id: "NO_RESPONSE_FINAL_REMINDER", mainStatusId: "CONTACT_ATTEMPTED", mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_FINAL_REMINDER", label: "5 - Final Reminder", sortOrder: 50, isActive: true, isSystem: true, isTerminal: false },
    { id: "CALL", mainStatusId: "CONTACT_ESTABLISHED", mainStatusCode: "CONTACT_ESTABLISHED", code: "CALL", label: "Call", sortOrder: 10, isActive: true, isSystem: true, isTerminal: false },
    { id: "WHATSAPP", mainStatusId: "CONTACT_ESTABLISHED", mainStatusCode: "CONTACT_ESTABLISHED", code: "WHATSAPP", label: "WhatsApp", sortOrder: 20, isActive: true, isSystem: true, isTerminal: false },
    { id: "EMAIL", mainStatusId: "CONTACT_ESTABLISHED", mainStatusCode: "CONTACT_ESTABLISHED", code: "EMAIL", label: "Email", sortOrder: 30, isActive: true, isSystem: true, isTerminal: false },
    { id: "FOLLOW_UP_1", mainStatusId: "FOLLOW_UP", mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_1", label: "Follow up 1", sortOrder: 10, isActive: true, isSystem: true, isTerminal: false },
    { id: "FOLLOW_UP_2", mainStatusId: "FOLLOW_UP", mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_2", label: "Follow up 2", sortOrder: 20, isActive: true, isSystem: true, isTerminal: false },
    { id: "FOLLOW_UP_3", mainStatusId: "FOLLOW_UP", mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_3", label: "Follow up 3", sortOrder: 30, isActive: true, isSystem: true, isTerminal: false },
    { id: "FOLLOW_UP_4", mainStatusId: "FOLLOW_UP", mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_4", label: "Follow up 4", sortOrder: 40, isActive: true, isSystem: true, isTerminal: false },
    { id: "FINAL_REMINDER", mainStatusId: "FOLLOW_UP", mainStatusCode: "FOLLOW_UP", code: "FINAL_REMINDER", label: "Final Reminder", sortOrder: 50, isActive: true, isSystem: true, isTerminal: false },
    { id: "PRICE_TOO_HIGH", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "PRICE_TOO_HIGH", label: "Price Too High", sortOrder: 10, isActive: true, isSystem: true, isTerminal: true },
    { id: "BOOKED_WITH_COMPETITOR", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "BOOKED_WITH_COMPETITOR", label: "Booked with Competitor", sortOrder: 20, isActive: true, isSystem: true, isTerminal: true },
    { id: "VISA_REJECTED", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "VISA_REJECTED", label: "Visa Rejected", sortOrder: 30, isActive: true, isSystem: true, isTerminal: true },
    { id: "TRAVEL_CANCELLED", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "TRAVEL_CANCELLED", label: "Travel Cancelled", sortOrder: 40, isActive: true, isSystem: true, isTerminal: true },
    { id: "DATES_CHANGED", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "DATES_CHANGED", label: "Dates Changed", sortOrder: 50, isActive: true, isSystem: true, isTerminal: true },
    { id: "NON_RESPONSIVE", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "NON_RESPONSIVE", label: "Non Responsive", sortOrder: 60, isActive: true, isSystem: true, isTerminal: true },
    { id: "BUDGET_ISSUE", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "BUDGET_ISSUE", label: "Budget Issue", sortOrder: 70, isActive: true, isSystem: true, isTerminal: true },
    { id: "DUPLICATE_LEAD", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "DUPLICATE_LEAD", label: "Duplicate Lead", sortOrder: 80, isActive: true, isSystem: true, isTerminal: true },
    { id: "INVALID_ENQUIRY", mainStatusId: "CLOSED", mainStatusCode: "CLOSED", code: "INVALID_ENQUIRY", label: "Invalid Enquiry", sortOrder: 90, isActive: true, isSystem: true, isTerminal: true },
  ],
};

export const normalizeWorkflow = (workflow?: Partial<LeadStatusWorkflow> | null): LeadStatusWorkflow => {
  const mainStatuses = Array.isArray(workflow?.mainStatuses) && workflow.mainStatuses.length
    ? workflow.mainStatuses
    : DEFAULT_LEAD_STATUS_WORKFLOW.mainStatuses;
  const subStatuses = Array.isArray(workflow?.subStatuses)
    ? workflow.subStatuses
    : DEFAULT_LEAD_STATUS_WORKFLOW.subStatuses;
  return {
    mainStatuses: mainStatuses
      .map((item) => ({
        ...item,
        code: normalizeStatusToken(item.code),
        canonicalStatus: normalizeStatusToken(item.canonicalStatus) as CanonicalLeadStatus,
        sortOrder: Number(item.sortOrder ?? 0),
        isActive: item.isActive !== false,
        isSystem: Boolean(item.isSystem),
        isTerminal: Boolean(item.isTerminal),
        requiresSubStatus: Boolean(item.requiresSubStatus),
        requiresQuotation: Boolean(item.requiresQuotation),
        createsBooking: Boolean(item.createsBooking),
        isBookingControlled: Boolean(item.isBookingControlled),
      }))
      .filter((item) => item.code && item.label)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    subStatuses: subStatuses
      .map((item) => ({
        ...item,
        code: normalizeStatusToken(item.code),
        mainStatusCode: normalizeStatusToken(item.mainStatusCode || item.mainStatusId),
        sortOrder: Number(item.sortOrder ?? 0),
        isActive: item.isActive !== false,
        isSystem: Boolean(item.isSystem),
        isTerminal: Boolean(item.isTerminal),
      }))
      .filter((item) => item.code && item.label)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
  };
};

export const findWorkflowMain = (
  workflow: LeadStatusWorkflow,
  mainStatus?: string | null,
) => {
  const code = normalizeStatusToken(mainStatus || "NEW");
  return normalizeWorkflow(workflow).mainStatuses.find((item) => item.code === code) ?? null;
};

export const getWorkflowSubStatuses = (
  workflow: LeadStatusWorkflow,
  mainStatus?: string | null,
) => {
  const normalized = normalizeWorkflow(workflow);
  const main = findWorkflowMain(normalized, mainStatus);
  if (!main) return [];
  return normalized.subStatuses.filter(
    (item) =>
      item.isActive &&
      (item.mainStatusCode === main.code || String(item.mainStatusId) === String(main.id)),
  );
};

export const deriveMainStatusFromLegacy = (
  canonicalStatus?: string | null,
  subStatus?: string | null,
): string => {
  const canonical = normalizeStatusToken(canonicalStatus);
  const sub = normalizeStatusToken(subStatus);
  if (canonical === "OPEN") return "NEW";
  if (canonical === "CONTACTED") return "CONTACT_ESTABLISHED";
  if (canonical === "WIP") return "QUOTATION_IN_PROGRESS";
  if (canonical === "QUOTED") return "QUOTATION_SENT";
  if (canonical === "FOLLOW_UP") return "FOLLOW_UP";
  if (canonical === "CONVERTED") return "BOOKING_CONFIRMED";
  if (canonical === "NON_RESPONSIVE" || sub === "NON_RESPONSIVE") return "CLOSED";
  if (canonical === "LOST") return "CLOSED";
  return "NEW";
};

export const deriveSubStatusFromLegacy = (
  canonicalStatus?: string | null,
  subStatus?: string | null,
): string => {
  const canonical = normalizeStatusToken(canonicalStatus);
  const sub = normalizeStatusToken(subStatus);
  if (canonical === "FOLLOW_UP" && sub) return sub;
  if (canonical === "NON_RESPONSIVE") return "NON_RESPONSIVE";
  return sub || "";
};

export const resolveWorkflowSelection = (
  lead: {
    mainStatus?: string | null;
    main_status?: string | null;
    status?: string | null;
    subStatus?: string | null;
    sub_status?: string | null;
  },
  workflow: LeadStatusWorkflow,
) => {
  const normalized = normalizeWorkflow(workflow);
  const mainCode =
    normalizeStatusToken(lead.mainStatus || lead.main_status) ||
    deriveMainStatusFromLegacy(lead.status, lead.subStatus || lead.sub_status);
  const main = findWorkflowMain(normalized, mainCode) ?? normalized.mainStatuses[0];
  const subCode = deriveSubStatusFromLegacy(
    lead.status,
    lead.subStatus || lead.sub_status,
  );
  const subOptions = getWorkflowSubStatuses(normalized, main?.code);
  const sub = subOptions.find((item) => item.code === normalizeStatusToken(subCode));
  return {
    mainStatus: main?.code || "NEW",
    subStatus: sub?.code || "",
  };
};

export const deriveCanonicalFromWorkflow = (
  mainStatus: string,
  subStatus: string | null | undefined,
  workflow: LeadStatusWorkflow,
): CanonicalLeadStatus => {
  const normalized = normalizeWorkflow(workflow);
  const main = findWorkflowMain(normalized, mainStatus);
  if (!main) return "OPEN";
  if (main.code === "CLOSED") {
    return normalizeStatusToken(subStatus) === "NON_RESPONSIVE" ? "NON_RESPONSIVE" : "LOST";
  }
  return main.canonicalStatus;
};

export const formatWorkflowStatus = (
  mainStatus: string | null | undefined,
  subStatus: string | null | undefined,
  workflow: LeadStatusWorkflow,
) => {
  const normalized = normalizeWorkflow(workflow);
  const main = findWorkflowMain(normalized, mainStatus);
  const sub = getWorkflowSubStatuses(normalized, main?.code).find(
    (item) => item.code === normalizeStatusToken(subStatus),
  );
  return [main?.label, sub?.label].filter(Boolean).join(" - ") || "New";
};

/** User-visible status: saved custom label wins; else formatted SOP stage. */
export function resolveLeadDisplayedStatus(opts: {
  customStatusLabel?: unknown;
  canonicalStatus?: string | null;
  subStatus?: string | null;
  providedStatusLabel?: string | null;
  mainStatus?: string | null;
  workflow?: LeadStatusWorkflow | null;
}): string {
  const raw = opts.customStatusLabel;
  const custom = typeof raw === "string" ? raw.trim() : "";
  if (custom) return custom;
  if (opts.workflow) {
    const mainStatus =
      normalizeStatusToken(opts.mainStatus) ||
      deriveMainStatusFromLegacy(opts.canonicalStatus, opts.subStatus);
    return formatWorkflowStatus(mainStatus, opts.subStatus, opts.workflow);
  }
  const sop = deriveSopStatusLabel(
    opts.canonicalStatus,
    opts.subStatus,
    opts.providedStatusLabel,
  );
  return toStatusLabelText(sop);
}
