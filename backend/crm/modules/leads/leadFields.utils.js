const DEFAULT_MAX_KEY_LENGTH = 120;

function normalizeFieldKey(input, { maxLength = DEFAULT_MAX_KEY_LENGTH } = {}) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;

  // Convert common separators to underscores.
  const underscored = raw
    .replace(/&/g, " and ")
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!underscored) return null;
  if (underscored.length <= maxLength) return underscored;

  // Keep deterministic truncation.
  return underscored.slice(0, maxLength).replace(/_+$/g, "") || underscored.slice(0, maxLength);
}

function normalizeFieldValue(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const first = value.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
    return normalizeFieldValue(first);
  }
  const s = String(value).trim();
  return s ? s : null;
}

function flattenMetaFieldData(fieldData = []) {
  if (!Array.isArray(fieldData)) {
    return { fields: {}, labels: {} };
  }

  const fields = {};
  const labels = {};

  for (const entry of fieldData) {
    const label = String(entry?.name ?? "").trim();
    const key = normalizeFieldKey(label);
    if (!key) continue;

    const value = normalizeFieldValue(entry?.values ?? entry?.value);
    if (value === null) continue;

    // First-write wins for stability.
    if (fields[key] === undefined) {
      fields[key] = value;
      labels[key] = label || key;
    }
  }

  return { fields, labels };
}

const FIXED_FIELD_ALIASES = Object.freeze({
  fullName: ["full_name", "fullname", "name", "your_name"],
  firstName: ["first_name", "firstname", "first"],
  lastName: ["last_name", "lastname", "last", "surname"],
  email: ["email", "email_address", "emailaddress"],
  phone: [
    "phone_number",
    "phone",
    "mobile_phone",
    "mobile",
    "whatsapp_number",
    "whatsapp",
  ],
  city: ["city", "town", "location"],
});

function pickFirst(fields, keys) {
  for (const key of keys) {
    const normalized = normalizeFieldKey(key);
    if (!normalized) continue;
    const value = fields[normalized];
    if (value) return value;
  }
  return null;
}

function deriveFullName({ fullName, firstName, lastName, email, phone, hint } = {}) {
  if (fullName) return fullName;
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (email) return String(email).split("@")[0];
  if (phone) return phone;
  if (hint) return `Meta Lead ${String(hint).slice(-6)}`;
  return `Lead ${Date.now()}`;
}

function splitFixedAndDynamicFields(
  { fields = {}, labels = {} } = {},
  {
    fixedKeys = [
      "full_name",
      "email",
      "phone",
      "phone_number",
      "city",
      "campaign_name",
      "ad_name",
      "platform",
    ],
  } = {},
) {
  const fixedKeySet = new Set(fixedKeys.map((k) => normalizeFieldKey(k)).filter(Boolean));
  const dynamic = {};
  const dynamicLabels = {};

  for (const [key, value] of Object.entries(fields)) {
    if (fixedKeySet.has(key)) continue;
    dynamic[key] = value;
    if (labels[key]) dynamicLabels[key] = labels[key];
  }

  return { dynamic, dynamicLabels };
}

export const LeadFieldsUtils = {
  normalizeFieldKey,
  normalizeFieldValue,
  flattenMetaFieldData,
  pickFirst,
  deriveFullName,
  splitFixedAndDynamicFields,
  FIXED_FIELD_ALIASES,
};

