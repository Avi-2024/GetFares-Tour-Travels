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

export type CanonicalLeadStatus =
  | "OPEN"
  | "CONTACTED"
  | "WIP"
  | "QUOTED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST"
  | "NON_RESPONSIVE";

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

