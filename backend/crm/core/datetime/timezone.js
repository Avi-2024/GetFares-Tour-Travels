/**
 * IANA timezone helpers (Luxon). Single place for IST / UAE and wall-clock ↔ UTC.
 */
import { DateTime } from "luxon";

export const WALL_CLOCK_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** @param {unknown} tz */
export function normalizeIANATimezone(tz) {
  const raw = String(tz ?? "").trim();
  if (!raw) {
    return null;
  }
  if (raw === "Asia/Calcutta") {
    return "Asia/Kolkata";
  }
  const probe = DateTime.now().setZone(raw);
  return probe.isValid ? raw : null;
}

/**
 * Map CRM lead country label to canonical IANA (India / UAE focus).
 * @param {unknown} countryName
 * @returns {string}
 */
export function ianaFromLeadCountry(countryName) {
  const n = String(countryName ?? "")
    .trim()
    .toLowerCase();
  if (n === "india" || n === "ind") {
    return "Asia/Kolkata";
  }
  if (
    n === "uae" ||
    n === "united arab emirates" ||
    n === "ae" ||
    n === "dubai"
  ) {
    return "Asia/Dubai";
  }
  if (!n) {
    return "Asia/Kolkata";
  }
  return "Asia/Kolkata";
}

/**
 * @param {string|number|Date|null|undefined} isoOrMs
 * @returns {Date|null}
 */
export function toUtc(isoOrMs) {
  if (isoOrMs == null || isoOrMs === "") {
    return null;
  }
  if (isoOrMs instanceof Date) {
    return Number.isNaN(isoOrMs.getTime()) ? null : isoOrMs;
  }
  if (typeof isoOrMs === "number" && Number.isFinite(isoOrMs)) {
    const d = new Date(isoOrMs);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(isoOrMs);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string|number|Date|null|undefined} utc
 * @param {string} iana
 * @param {string} [pattern]
 */
export function formatInZone(utc, iana, pattern = "yyyy-MM-dd HH:mm:ss") {
  const zone = normalizeIANATimezone(iana);
  const instant = toUtc(utc);
  if (!zone || !instant) {
    return null;
  }
  const dt = DateTime.fromJSDate(instant, { zone: "utc" }).setZone(zone);
  return dt.isValid ? dt.toFormat(pattern) : null;
}

/**
 * @param {string|number|Date|null|undefined} utc
 * @param {string} iana
 * @returns {string|null}
 */
export function localWallClockFromUtc(utc, iana) {
  return formatInZone(utc, iana, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Interpret a naive wall clock in the given zone; return the UTC instant.
 * @param {string} wallClock `YYYY-MM-DD HH:mm:ss`
 * @param {string} iana
 * @returns {Date|null}
 */
export function utcInstantFromLocalWallClock(wallClock, iana) {
  const zone = normalizeIANATimezone(iana);
  const wall = String(wallClock ?? "").trim();
  if (!zone || !WALL_CLOCK_REGEX.test(wall)) {
    return null;
  }
  const dt = DateTime.fromFormat(wall, "yyyy-MM-dd HH:mm:ss", { zone });
  if (!dt.isValid) {
    return null;
  }
  return dt.toUTC().toJSDate();
}
