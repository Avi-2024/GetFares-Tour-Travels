export type VisaWorkflowStage =
  | "DOCUMENT_COLLECTION"
  | "APPLICATION_SUBMITTED"
  | "BIOMETRICS_SCHEDULED"
  | "UNDER_PROCESS"
  | "APPROVED"
  | "REJECTED"
  | "DELIVERED";

export const VISA_WORKFLOW_STAGES: Array<{
  value: VisaWorkflowStage;
  label: string;
  description: string;
}> = [
  {
    value: "DOCUMENT_COLLECTION",
    label: "Document Collection",
    description: "Collect passport and required supporting documents.",
  },
  {
    value: "APPLICATION_SUBMITTED",
    label: "Application Submitted",
    description: "Application filed and acknowledgement captured.",
  },
  {
    value: "BIOMETRICS_SCHEDULED",
    label: "Biometrics Scheduled",
    description: "Appointment booked and visit date confirmed.",
  },
  {
    value: "UNDER_PROCESS",
    label: "Under Process",
    description: "Embassy or provider is processing the application.",
  },
  {
    value: "APPROVED",
    label: "Approved",
    description: "Visa approved and validity captured.",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    description: "Application rejected with reason recorded.",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    description: "Approved visa shared or handed over to customer.",
  },
];

export const DOCUMENT_TYPE_OPTIONS = [
  "PASSPORT",
  "EMIRATES_ID",
  "BANK_STATEMENT",
  "PHOTO",
  "SALARY_SLIP",
  "NOC_LETTER",
  "FLIGHT_ITINERARY",
  "HOTEL_VOUCHER",
  "TRAVEL_INSURANCE",
  "INVITATION_LETTER",
  "VISA_COPY",
  "OTHER",
] as const;

const COUNTRY_CHECKLISTS: Record<string, string[]> = {
  UAE: [
    "Passport copy with minimum 6 months validity",
    "Recent passport-size photo",
    "Emirates ID or residence proof (if applicable)",
    "Flight itinerary and hotel confirmation",
    "Bank statement or sponsor proof",
  ],
  SCHENGEN: [
    "Passport copy with minimum 6 months validity and blank pages",
    "Bank statements and financial proof",
    "Employment proof / leave approval / business proof",
    "Travel insurance copy",
    "Flight itinerary and hotel vouchers",
  ],
  UK: [
    "Passport copy and old visa history",
    "Bank statements and income proof",
    "Employment or business documents",
    "Travel plan with hotel details",
    "Supporting cover letter if required",
  ],
  USA: [
    "Passport copy",
    "DS-160 confirmation and appointment confirmation",
    "Photo as per embassy specification",
    "Financial proof and employment proof",
    "Travel plan and supporting documents",
  ],
};

export const humanizeVisaStage = (value?: string) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const normalizeVisaStage = (value?: string): VisaWorkflowStage => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "APPLICATION_SUBMITTED":
    case "BIOMETRICS_SCHEDULED":
    case "UNDER_PROCESS":
    case "APPROVED":
    case "REJECTED":
    case "DELIVERED":
      return normalized;
    case "DOCUMENT_PENDING":
    case "DRAFT":
    default:
      return "DOCUMENT_COLLECTION";
  }
};

export const getCountryVisaChecklist = (country?: string) => {
  const normalized = String(country || "").trim().toUpperCase();
  if (!normalized) {
    return [
      "Passport copy with required validity",
      "Recent photo",
      "Financial proof or sponsor proof",
      "Travel plan with flight and hotel details",
      "Visa-specific supporting documents",
    ];
  }

  if (COUNTRY_CHECKLISTS[normalized]) {
    return COUNTRY_CHECKLISTS[normalized];
  }

  if (normalized.includes("SCHENGEN")) {
    return COUNTRY_CHECKLISTS.SCHENGEN;
  }

  return [
    "Passport copy with required validity",
    "Recent photo",
    "Bank statement or financial proof",
    "Flight itinerary and hotel details",
    "Any embassy-specific supporting document",
  ];
};
