/** Whitelist: only these `leads` columns may be written from Meta mapping. */
const META_LEAD_MAPPABLE_COLUMNS = Object.freeze([
  { column: "full_name", payloadKey: "fullName", label: "Full name" },
  { column: "email", payloadKey: "email", label: "Email" },
  { column: "phone", payloadKey: "phone", label: "Phone" },
  { column: "city", payloadKey: "city", label: "City" },
  { column: "nationality", payloadKey: "nationality", label: "Nationality" },
  { column: "lead_country", payloadKey: "leadCountry", label: "Lead country" },
  {
    column: "client_currency",
    payloadKey: "clientCurrency",
    label: "Client currency",
  },
  { column: "lead_type", payloadKey: "leadType", label: "Lead type (HOLIDAY/VISA)" },
  { column: "travel_to", payloadKey: "travelTo", label: "Destination / travel to" },
  { column: "travel_purpose", payloadKey: "travelPurpose", label: "Travel purpose" },
  { column: "budget", payloadKey: "budget", label: "Budget" },
  { column: "visa_required", payloadKey: "visaRequired", label: "Visa required" },
  { column: "source", payloadKey: "source", label: "Lead source" },
  { column: "platform", payloadKey: "platform", label: "Platform (fb/ig)" },
  { column: "campaign_name", payloadKey: "campaignName", label: "Campaign name" },
  { column: "ad_name", payloadKey: "adName", label: "Ad name" },
  { column: "travel_date", payloadKey: "travelDate", label: "Travel start date" },
  { column: "travel_end_date", payloadKey: "travelEndDate", label: "Travel end date" },
]);

const META_LEAD_SCOPE_TYPES = Object.freeze([
  "ad",
  "form",
  "campaign",
  "page",
  "default",
]);

/** Lower = wins when multiple scopes match (ad beats form). */
const META_LEAD_SCOPE_RANK = Object.freeze({
  ad: 1,
  form: 2,
  campaign: 3,
  page: 4,
  default: 5,
});

/** UI hints: profile defaults vs map from form question. */
const META_LEAD_PROFILE_DEFAULT_FIELDS = Object.freeze([
  "lead_type",
  "lead_country",
  "client_currency",
  "source",
]);

const META_LEAD_FORM_QUESTION_FIELDS = Object.freeze([
  "nationality",
  "travel_to",
  "budget",
  "city",
  "travel_purpose",
  "visa_required",
  "travel_date",
  "travel_end_date",
  "full_name",
  "email",
  "phone",
  "platform",
]);

const META_LEAD_TRANSFORMS = Object.freeze([
  "none",
  "yes_no_bool",
  "parse_budget",
  "normalize_nationality",
  "truncate_150",
  "normalize_lead_type",
]);

const META_SOURCE_LABELS = Object.freeze(["Meta India Page", "Meta UAE Page"]);

const MAPPABLE_COLUMN_SET = new Set(
  META_LEAD_MAPPABLE_COLUMNS.map((item) => item.column),
);

const COLUMN_TO_PAYLOAD = Object.freeze(
  Object.fromEntries(
    META_LEAD_MAPPABLE_COLUMNS.map((item) => [item.column, item.payloadKey]),
  ),
);

function isAllowedTargetColumn(column) {
  return MAPPABLE_COLUMN_SET.has(String(column || "").trim());
}

function payloadKeyForColumn(column) {
  return COLUMN_TO_PAYLOAD[String(column || "").trim()] || null;
}

function normalizeMetaSourceLabel(value) {
  const normalized = String(value || "").trim();
  return META_SOURCE_LABELS.includes(normalized) ? normalized : null;
}

function isAllowedMetaSourceLabel(value) {
  return normalizeMetaSourceLabel(value) !== null;
}

export {
  META_LEAD_MAPPABLE_COLUMNS,
  META_LEAD_PROFILE_DEFAULT_FIELDS,
  META_LEAD_FORM_QUESTION_FIELDS,
  META_LEAD_SCOPE_TYPES,
  META_LEAD_SCOPE_RANK,
  META_LEAD_TRANSFORMS,
  META_SOURCE_LABELS,
  isAllowedTargetColumn,
  isAllowedMetaSourceLabel,
  normalizeMetaSourceLabel,
  payloadKeyForColumn,
};
