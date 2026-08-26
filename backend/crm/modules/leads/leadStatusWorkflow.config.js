const CANONICAL_LEAD_STATUSES = Object.freeze([
  "OPEN",
  "CONTACTED",
  "WIP",
  "QUOTED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
]);

const DEFAULT_MAIN_STATUSES = Object.freeze([
  {
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
    code: "CONTACT_ESTABLISHED",
    label: "Contact Established",
    canonicalStatus: "CONTACTED",
    sortOrder: 30,
    color: "#16a34a",
    isActive: true,
    isSystem: true,
    isTerminal: false,
    requiresSubStatus: true,
    requiresQuotation: false,
    createsBooking: false,
    isBookingControlled: false,
  },
  {
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
    code: "QUOTATION_SENT",
    label: "Quotation Sent",
    canonicalStatus: "QUOTED",
    sortOrder: 50,
    color: "#0891b2",
    isActive: true,
    isSystem: true,
    isTerminal: false,
    requiresSubStatus: false,
    requiresQuotation: true,
    createsBooking: false,
    isBookingControlled: false,
  },
  {
    code: "FOLLOW_UP",
    label: "Follow Up",
    canonicalStatus: "FOLLOW_UP",
    sortOrder: 60,
    color: "#ca8a04",
    isActive: true,
    isSystem: true,
    isTerminal: false,
    requiresSubStatus: true,
    requiresQuotation: false,
    createsBooking: false,
    isBookingControlled: false,
  },
  {
    code: "BOOKING_CONFIRMATION_AWAITED",
    label: "Booking Confirmation Awaited",
    canonicalStatus: "CONVERTED",
    sortOrder: 70,
    color: "#0d9488",
    isActive: true,
    isSystem: true,
    isTerminal: false,
    requiresSubStatus: false,
    requiresQuotation: false,
    createsBooking: true,
    isBookingControlled: true,
  },
  {
    code: "PAYMENT_PARTIALLY_RECEIVED",
    label: "Payment Partially Received",
    canonicalStatus: "CONVERTED",
    sortOrder: 80,
    color: "#059669",
    isActive: true,
    isSystem: true,
    isTerminal: false,
    requiresSubStatus: false,
    requiresQuotation: false,
    createsBooking: false,
    isBookingControlled: true,
  },
  {
    code: "BOOKING_CONFIRMED",
    label: "Booking Confirmed",
    canonicalStatus: "CONVERTED",
    sortOrder: 90,
    color: "#15803d",
    isActive: true,
    isSystem: true,
    isTerminal: true,
    requiresSubStatus: false,
    requiresQuotation: false,
    createsBooking: false,
    isBookingControlled: true,
  },
  {
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
]);

const DEFAULT_SUB_STATUSES = Object.freeze([
  { mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_1", label: "1 - No response", sortOrder: 10, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_2", label: "2 - No response", sortOrder: 20, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_3", label: "3 - No response", sortOrder: 30, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_4", label: "4 - No response", sortOrder: 40, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ATTEMPTED", code: "NO_RESPONSE_FINAL_REMINDER", label: "5 - Final Reminder", sortOrder: 50, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ESTABLISHED", code: "CALL", label: "Call", sortOrder: 10, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ESTABLISHED", code: "WHATSAPP", label: "WhatsApp", sortOrder: 20, isSystem: true, isTerminal: false },
  { mainStatusCode: "CONTACT_ESTABLISHED", code: "EMAIL", label: "Email", sortOrder: 30, isSystem: true, isTerminal: false },
  { mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_1", label: "Follow up 1", sortOrder: 10, isSystem: true, isTerminal: false },
  { mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_2", label: "Follow up 2", sortOrder: 20, isSystem: true, isTerminal: false },
  { mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_3", label: "Follow up 3", sortOrder: 30, isSystem: true, isTerminal: false },
  { mainStatusCode: "FOLLOW_UP", code: "FOLLOW_UP_4", label: "Follow up 4", sortOrder: 40, isSystem: true, isTerminal: false },
  { mainStatusCode: "FOLLOW_UP", code: "FINAL_REMINDER", label: "Final Reminder", sortOrder: 50, isSystem: true, isTerminal: false },
  { mainStatusCode: "CLOSED", code: "PRICE_TOO_HIGH", label: "Price Too High", sortOrder: 10, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "BOOKED_WITH_COMPETITOR", label: "Booked with Competitor", sortOrder: 20, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "VISA_REJECTED", label: "Visa Rejected", sortOrder: 30, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "TRAVEL_CANCELLED", label: "Travel Cancelled", sortOrder: 40, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "DATES_CHANGED", label: "Dates Changed", sortOrder: 50, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "NON_RESPONSIVE", label: "Non Responsive", sortOrder: 60, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "BUDGET_ISSUE", label: "Budget Issue", sortOrder: 70, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "DUPLICATE_LEAD", label: "Duplicate Lead", sortOrder: 80, isSystem: true, isTerminal: true },
  { mainStatusCode: "CLOSED", code: "INVALID_ENQUIRY", label: "Invalid Enquiry", sortOrder: 90, isSystem: true, isTerminal: true },
]);

function normalizeStatusCode(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return Boolean(value);
}

function toApiMainStatus(row) {
  return {
    id: row.id ?? row.code,
    code: normalizeStatusCode(row.code),
    label: String(row.label ?? row.code ?? "").trim(),
    canonicalStatus: normalizeStatusCode(row.canonical_status ?? row.canonicalStatus, "OPEN"),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    color: row.color ?? "#2563eb",
    isActive: toBool(row.is_active ?? row.isActive ?? true),
    isSystem: toBool(row.is_system ?? row.isSystem ?? false),
    isTerminal: toBool(row.is_terminal ?? row.isTerminal ?? false),
    requiresSubStatus: toBool(row.requires_sub_status ?? row.requiresSubStatus ?? false),
    requiresQuotation: toBool(row.requires_quotation ?? row.requiresQuotation ?? false),
    createsBooking: toBool(row.creates_booking ?? row.createsBooking ?? false),
    isBookingControlled: toBool(row.is_booking_controlled ?? row.isBookingControlled ?? false),
  };
}

function toApiSubStatus(row) {
  return {
    id: row.id ?? row.code,
    mainStatusId: row.main_status_id ?? row.mainStatusId ?? null,
    mainStatusCode: normalizeStatusCode(row.main_status_code ?? row.mainStatusCode),
    code: normalizeStatusCode(row.code),
    label: String(row.label ?? row.code ?? "").trim(),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: toBool(row.is_active ?? row.isActive ?? true),
    isSystem: toBool(row.is_system ?? row.isSystem ?? false),
    isTerminal: toBool(row.is_terminal ?? row.isTerminal ?? false),
  };
}

function defaultLeadStatusWorkflow() {
  const mainStatuses = DEFAULT_MAIN_STATUSES.map((row) =>
    toApiMainStatus({ ...row, canonicalStatus: row.canonicalStatus }),
  );
  const mainIdByCode = new Map(mainStatuses.map((row) => [row.code, row.id]));
  const subStatuses = DEFAULT_SUB_STATUSES.map((row) =>
    toApiSubStatus({
      ...row,
      mainStatusId: mainIdByCode.get(row.mainStatusCode) || row.mainStatusCode,
    }),
  );
  return { mainStatuses, subStatuses };
}

function buildWorkflowIndex(workflow = defaultLeadStatusWorkflow()) {
  const mainByCode = new Map();
  const subByMainAndCode = new Map();
  const mainStatuses = Array.isArray(workflow.mainStatuses)
    ? workflow.mainStatuses.map(toApiMainStatus)
    : [];
  const subStatuses = Array.isArray(workflow.subStatuses)
    ? workflow.subStatuses.map(toApiSubStatus)
    : [];

  mainStatuses.forEach((main) => {
    mainByCode.set(main.code, main);
  });
  subStatuses.forEach((sub) => {
    const mainCode =
      sub.mainStatusCode ||
      mainStatuses.find((main) => String(main.id) === String(sub.mainStatusId))?.code ||
      "";
    if (!mainCode) return;
    subByMainAndCode.set(`${mainCode}:${sub.code}`, { ...sub, mainStatusCode: mainCode });
  });

  return { mainStatuses, subStatuses, mainByCode, subByMainAndCode };
}

function deriveMainStatusFromLegacy(canonicalStatus, subStatus) {
  const status = normalizeStatusCode(canonicalStatus, "OPEN");
  const sub = normalizeStatusCode(subStatus);
  if (status === "OPEN") return "NEW";
  if (status === "WIP") return "QUOTATION_IN_PROGRESS";
  if (status === "QUOTED") return "QUOTATION_SENT";
  if (status === "FOLLOW_UP") return "FOLLOW_UP";
  if (status === "CONTACTED") {
    if (sub.startsWith("NO_RESPONSE")) return "CONTACT_ATTEMPTED";
    return "CONTACT_ESTABLISHED";
  }
  if (status === "CONVERTED") {
    if (sub === "PAYMENT_PARTIALLY_RECEIVED") return "PAYMENT_PARTIALLY_RECEIVED";
    if (sub === "BOOKING_CONFIRMATION_AWAITED") return "BOOKING_CONFIRMATION_AWAITED";
    return "BOOKING_CONFIRMED";
  }
  if (status === "LOST" || status === "NON_RESPONSIVE") return "CLOSED";
  return "NEW";
}

function deriveSubStatusFromLegacy(canonicalStatus, subStatus) {
  const status = normalizeStatusCode(canonicalStatus, "OPEN");
  const sub = normalizeStatusCode(subStatus);
  if (sub) return sub;
  if (status === "CONTACTED") return null;
  if (status === "FOLLOW_UP") return "FOLLOW_UP_1";
  if (status === "NON_RESPONSIVE") return "NON_RESPONSIVE";
  return null;
}

function deriveCanonicalStatusFromWorkflow(mainStatus, subStatus, workflow) {
  const index = buildWorkflowIndex(workflow);
  const mainCode = normalizeStatusCode(mainStatus, "NEW");
  const subCode = normalizeStatusCode(subStatus);
  const main = index.mainByCode.get(mainCode);
  if (!main) return "OPEN";
  if (mainCode === "CLOSED" && subCode === "NON_RESPONSIVE") {
    return "NON_RESPONSIVE";
  }
  return CANONICAL_LEAD_STATUSES.includes(main.canonicalStatus)
    ? main.canonicalStatus
    : "OPEN";
}

export {
  CANONICAL_LEAD_STATUSES,
  DEFAULT_MAIN_STATUSES,
  DEFAULT_SUB_STATUSES,
  buildWorkflowIndex,
  defaultLeadStatusWorkflow,
  deriveCanonicalStatusFromWorkflow,
  deriveMainStatusFromLegacy,
  deriveSubStatusFromLegacy,
  normalizeStatusCode,
  toApiMainStatus,
  toApiSubStatus,
};
