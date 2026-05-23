import { LeadFieldsUtils } from "../leads/leadFields.utils.js";

const { normalizeFieldValue, normalizeFieldKey } = LeadFieldsUtils;

function applyYesNoBool(value) {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["yes", "true", "1", "y"].includes(s)) return true;
  if (["no", "false", "0", "n"].includes(s)) return false;
  return Boolean(s);
}

function applyParseBudget(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const digits = s.replace(/[^0-9.]/g, "");
  if (digits) {
    const n = Number(digits);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function applyNormalizeNationality(value) {
  const s = String(value ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[^\w\s,-]/g, "")
    .trim();
  return s || null;
}

function applyTruncate150(value) {
  const s = normalizeFieldValue(value);
  if (!s) return null;
  if (s.length <= 150) return s;
  return `${s.slice(0, 149)}…`;
}

function applyNormalizeLeadType(value) {
  const s = String(value ?? "")
    .trim()
    .toUpperCase();
  if (s.includes("VISA")) return "VISA";
  if (s.includes("HOLIDAY")) return "HOLIDAY";
  if (s === "BOTH") return "BOTH";
  return s || null;
}

function applyMetaFieldTransform(value, transform) {
  const name = String(transform || "none").trim().toLowerCase();
  switch (name) {
    case "yes_no_bool":
      return applyYesNoBool(value);
    case "parse_budget":
      return applyParseBudget(value);
    case "normalize_nationality":
      return applyNormalizeNationality(value);
    case "truncate_150":
      return applyTruncate150(value);
    case "normalize_lead_type":
      return applyNormalizeLeadType(value);
    case "none":
    default:
      return normalizeFieldValue(value);
  }
}

function normalizeMetaFieldKeyAliases(keys = []) {
  if (!Array.isArray(keys)) return [];
  return keys
    .map((item) => normalizeFieldKey(item))
    .filter(Boolean);
}

export {
  applyMetaFieldTransform,
  normalizeMetaFieldKeyAliases,
};
