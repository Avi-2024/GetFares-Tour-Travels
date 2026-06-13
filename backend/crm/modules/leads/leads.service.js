import { AppError } from "../../core/errors/index.js";
import { isSuperAdminRole } from "../../core/constants/index.js";
import {
  ianaFromLeadCountry,
  localWallClockFromUtc,
  normalizeIANATimezone,
  toUtc,
  utcInstantFromLocalWallClock,
  WALL_CLOCK_REGEX,
} from "../../core/datetime/timezone.js";
import { isWebhookInboundLead } from "../../core/utils/phone-validation.js";

const LEAD_TEMPERATURE = Object.freeze({
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
});

const POSITIVE_RESPONSE_STATUSES = new Set([
  "CONTACTED",
  "WIP",
  "QUOTED",
  "FOLLOW_UP",
  "CONVERTED",
]);
const CLOSED_STATUSES = new Set(["CONVERTED", "LOST", "NON_RESPONSIVE"]);
const NON_RESPONSIVE_STATUS = "NON_RESPONSIVE";
const WORKFLOW_COMPLIANCE_STATUSES = new Set([
  "CONTACTED",
  "WIP",
  "QUOTED",
  "FOLLOW_UP",
]);
const FOLLOWUP_COMPLIANCE_RULES = Object.freeze({
  requiredCalls: 6,
  requiredWhatsapp: 7,
  requiredFinalReminders: 1,
});
/** Notify assigned agent in a ~1-minute band ending ~5 minutes before due time. */
const FOLLOWUP_REMINDER_LOOKAHEAD_MS = 5 * 60 * 1000;
const DOC_STATUS_TO_CANONICAL = Object.freeze({
  NEW: "OPEN",
  OPEN: "OPEN",
  CANCELLED: "LOST",
  CONTACTED: "CONTACTED",
  NEGOTIATION: "WIP",
  WIP: "WIP",
  QUOTED: "QUOTED",
  FOLLOW_UP: "FOLLOW_UP",
  FOLLOW_UP_1: "FOLLOW_UP",
  FOLLOW_UP_2: "FOLLOW_UP",
  FOLLOW_UP_3: "FOLLOW_UP",
  FINAL_REMINDER: "FOLLOW_UP",
  HOT: "OPEN",
  WARM: "OPEN",
  COLD: "OPEN",
  CONVERTED: "CONVERTED",
  LOST: "LOST",
  NON_RESPONSIVE: "NON_RESPONSIVE",
});
const STATUS_REQUIRING_QUALIFICATION = new Set([
  "CONTACTED",
  "WIP",
  "FOLLOW_UP",
  "QUOTED",
  "CONVERTED",
  "LOST",
  "NON_RESPONSIVE",
]);
const CADENCE_TEMPLATE = Object.freeze([
  { code: "FU1_CALL", dayOffset: 0, hour: 18, minute: 0, type: "CALL" },
  {
    code: "FU1_WHATSAPP",
    dayOffset: 0,
    hour: 18,
    minute: 10,
    type: "WHATSAPP",
  },
  { code: "FU2_CALL", dayOffset: 1, hour: 10, minute: 0, type: "CALL" },
  { code: "FU3_CALL", dayOffset: 1, hour: 18, minute: 0, type: "CALL" },
  {
    code: "FU3_WHATSAPP",
    dayOffset: 1,
    hour: 18,
    minute: 10,
    type: "WHATSAPP",
  },
  { code: "FU4_CALL", dayOffset: 2, hour: 10, minute: 0, type: "CALL" },
  {
    code: "FINAL_REMINDER_AUTO",
    dayOffset: 2,
    hour: 10,
    minute: 10,
    type: "FINAL_REMINDER",
  },
]);

const AUTOMATION_DEFAULTS = Object.freeze({
  highBudgetThreshold: 150000,
  distributionLimit: 25,
  inactiveMinutes: 15,
  overdueFollowupLimit: 100,
  slaCheckLimit: 100,
});
const ASSIGNMENT_ROLES = Object.freeze({
  AGENT: "agent",
  MANAGER: "manager",
});
const DEFAULT_SYSTEM_DATE_TIME_PREFERENCES = Object.freeze({
  timezone: "Asia/Kolkata",
  locale: "en-IN",
});
const SYSTEM_DATE_TIME_PREFERENCES_CACHE_TTL_MS = 5 * 60 * 1000;

/** ISO / MySQL datetime → `YYYY-MM-DD HH:mm:ss` for followup_local_at (display, no conversion). */
function followupInstantToWallClock(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  const sec = String(m[4] != null ? m[4] : "00").padStart(2, "0");
  return `${m[1]} ${m[2]}:${m[3]}:${sec}`;
}

/**
 * Store follow-up instant as UTC in followup_date; keep wall clock + IANA on the row.
 * @param {Record<string, unknown>} payload
 * @param {{ fallbackTimezone?: string }} [opts]
 */
function normalizeFollowupStoragePayload(payload, opts = {}) {
  const fallback =
    normalizeIANATimezone(opts.fallbackTimezone) ||
    DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone;
  const tzRaw =
    normalizeIANATimezone(payload.clientTimezone) || fallback;

  const wallRaw = String(payload.followupLocalAt ?? "").trim();
  const fdRaw = payload.followupDate;

  const wallFromPayload =
    wallRaw && WALL_CLOCK_REGEX.test(wallRaw) ?
      wallRaw
    : fdRaw && typeof fdRaw === "string" && WALL_CLOCK_REGEX.test(String(fdRaw).trim()) ?
      String(fdRaw).trim()
    : null;

  if (wallFromPayload && tzRaw) {
    const utc = utcInstantFromLocalWallClock(wallFromPayload, tzRaw);
    if (utc) {
      return {
        ...payload,
        followupDate: utc.toISOString(),
        followupLocalAt: wallFromPayload,
        clientTimezone: tzRaw,
      };
    }
  }

  const parsedIso =
    fdRaw != null &&
    fdRaw !== "" &&
    !(typeof fdRaw === "string" && WALL_CLOCK_REGEX.test(String(fdRaw).trim())) ?
      toUtc(fdRaw instanceof Date ? fdRaw.getTime() : fdRaw)
    : null;

  if (parsedIso && !Number.isNaN(parsedIso.getTime())) {
    return {
      ...payload,
      followupDate: parsedIso.toISOString(),
      followupLocalAt:
        wallRaw && WALL_CLOCK_REGEX.test(wallRaw) ?
          wallRaw
        : localWallClockFromUtc(parsedIso, tzRaw) ||
          (payload.followupLocalAt ?? null),
      clientTimezone: tzRaw,
    };
  }

  return {
    ...payload,
    clientTimezone: tzRaw || payload.clientTimezone,
  };
}

function normalizeActivityWallClock(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  return WALL_CLOCK_REGEX.test(raw) ? raw : null;
}

function normalizeActivityTimezone(value) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function resolveActivityStamp(payload = {}) {
  const createdAt = normalizeActivityWallClock(
    payload.activityCreatedAt ??
      payload.created_at ??
      payload.createdAt ??
      payload.clientCreatedAt ??
      null,
  );
  const timezone = normalizeActivityTimezone(
    payload.activityTimezone ??
      payload.timezone ??
      payload.clientTimezone ??
      payload.client_timezone ??
      null,
  );
  if (!createdAt || !timezone) {
    return null;
  }
  const tzNorm = normalizeIANATimezone(timezone);
  return { createdAt, timezone: tzNorm || timezone };
}

// In-memory cache for agents by country
class AgentCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  getCacheKey(country, agentType) {
    const countryKey = country ? String(country).toLowerCase() : 'all';
    const typeKey = agentType ? String(agentType).toUpperCase() : 'all';
    return `${countryKey}:${typeKey}`;
  }

  get(country, agentType) {
    const key = this.getCacheKey(country, agentType);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(country, agentType, data) {
    const key = this.getCacheKey(country, agentType);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidate(country = null) {
    if (country) {
      const pattern = `${String(country).toLowerCase()}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Round-robin state management per country
class RoundRobinState {
  constructor() {
    this.lastAssigned = new Map();
  }

  getKey(country, agentType) {
    const countryKey = country ? String(country).toLowerCase() : 'all';
    const typeKey = agentType ? String(agentType).toUpperCase() : 'all';
    return `${countryKey}:${typeKey}`;
  }

  getLastAssigned(country, agentType) {
    const key = this.getKey(country, agentType);
    return this.lastAssigned.get(key) || null;
  }

  setLastAssigned(country, agentType, agentId) {
    const key = this.getKey(country, agentType);
    this.lastAssigned.set(key, agentId);
  }
}

function createLeadsService({ repository, logger, events }) {
  // Initialize cache and round-robin state
  const agentCache = new AgentCache(5); // 5 minutes TTL
  const roundRobinState = new RoundRobinState();
  let dateTimePreferencesCache = DEFAULT_SYSTEM_DATE_TIME_PREFERENCES;
  let dateTimePreferencesCacheAt = 0;

  function isValidTimeZone(value) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  function normalizeLocale(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
    }

    try {
      const [resolved] = Intl.DateTimeFormat.supportedLocalesOf([raw]);
      return resolved || DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
    } catch {
      return DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
    }
  }

  function normalizeSystemDateTimePreferences(value = {}) {
    const timezoneRaw = String(value.timezone || "").trim();
    return {
      timezone:
        timezoneRaw && isValidTimeZone(timezoneRaw) ?
          timezoneRaw
        : DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone,
      locale: normalizeLocale(value.locale),
    };
  }

  async function resolveSystemDateTimePreferences(forceRefresh = false) {
    const now = Date.now();
    if (
      !forceRefresh &&
      dateTimePreferencesCacheAt &&
      now - dateTimePreferencesCacheAt < SYSTEM_DATE_TIME_PREFERENCES_CACHE_TTL_MS
    ) {
      return dateTimePreferencesCache;
    }

    try {
      const stored = await repository.findSystemDateTimePreferences?.();
      const normalized = normalizeSystemDateTimePreferences(stored || {});
      dateTimePreferencesCache = normalized;
      dateTimePreferencesCacheAt = now;
      return normalized;
    } catch (error) {
      logger?.warn?.(
        { err: error, module: "leads" },
        "Failed to load system date/time preferences. Using defaults.",
      );
      return dateTimePreferencesCache;
    }
  }

  function normalizeCategory(value) {
    if (!value) return null;
    return String(value).trim().toLowerCase();
  }

  function normalizeCountryAlias(value) {
    const raw = normalizeCategory(value);
    if (!raw) return null;
    if (
      raw === "uae" ||
      raw === "u.a.e" ||
      raw === "u.a.e." ||
      raw === "united arab emirates"
    ) {
      return "uae";
    }
    if (raw === "india" || raw === "ind") {
      return "india";
    }
    return raw;
  }

  function countryAliases(value) {
    const normalized = normalizeCountryAlias(value);
    if (!normalized) {
      return new Set();
    }
    if (normalized === "uae") {
      return new Set(["uae", "united arab emirates"]);
    }
    if (normalized === "india") {
      return new Set(["india", "ind"]);
    }
    return new Set([normalized]);
  }

  function countriesMatch(left, right) {
    const leftSet = countryAliases(left);
    const rightSet = countryAliases(right);
    if (!leftSet.size || !rightSet.size) {
      return false;
    }
    for (const token of leftSet) {
      if (rightSet.has(token)) {
        return true;
      }
    }
    return false;
  }

  function normalizeAgentType(value) {
    if (!value) return null;
    const normalized = String(value).trim().toUpperCase();
    if (normalized.includes("VISA")) return "VISA";
    if (normalized.includes("HOLIDAY")) return "HOLIDAY";
    if (normalized === "BOTH") return "BOTH";
    return normalized;
  }

  function normalizeRoleToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function isManagerRole(value) {
    const role = normalizeRoleToken(value);
    return role === "manager" || role === "department_head" || role === "team_lead";
  }

  function isAgentRole(value) {
    const role = normalizeRoleToken(value);
    return (
      role === "agent" ||
      role === "sales_consultant" ||
      role === "visa_executive" ||
      role === "holiday_consultant"
    );
  }

  function isAssignableLeadOwnerRole(value) {
    return isAgentRole(value) || isManagerRole(value);
  }

  function isFullAccessRole(value) {
    const role = normalizeRoleToken(value);
    return isSuperAdminRole(role) || role === "admin" || role === "accounts";
  }

  async function getUserCountrySet(userId) {
    if (!userId) return new Set();
    const names = await repository.findUserCountryNames(userId);
    return new Set(
      names
        .map((name) => normalizeCategory(name))
        .filter(Boolean),
    );
  }

  async function canUserAccessLead(lead, context = {}) {
    const userId = context.user?.id || null;
    const userRole = normalizeRoleToken(context.user?.role);
    if (!userId) {
      return true;
    }

    if (isFullAccessRole(userRole)) {
      return true;
    }

    if (isAgentRole(userRole)) {
      return lead.assignedTo === userId;
    }

    if (isManagerRole(userRole)) {
      const [managedAgentIds, managerCountries] = await Promise.all([
        repository.findManagedAgentIds(userId),
        getUserCountrySet(userId),
      ]);
      const managedAgentSet = new Set(managedAgentIds);
      const leadCountry = normalizeCategory(lead.leadCountry ?? lead.country ?? null);
      const isCountryAllowed =
        !leadCountry || managerCountries.size === 0 || managerCountries.has(leadCountry);

      if (!isCountryAllowed) {
        return false;
      }

      if (lead.assignedTo === userId) {
        return true;
      }

      if (lead.assignedTo && managedAgentSet.has(lead.assignedTo)) {
        return true;
      }

      if (!lead.assignedTo) {
        return true;
      }

      return false;
    }

    return false;
  }

  function getFollowupPolicy(lead = {}) {
    const callsDisabled = Boolean(lead.callsDisabled);
    const requiredCalls = callsDisabled ? 0 : FOLLOWUP_COMPLIANCE_RULES.requiredCalls;
    const requiredWhatsapp = FOLLOWUP_COMPLIANCE_RULES.requiredWhatsapp;
    const requiredFinalReminders =
      FOLLOWUP_COMPLIANCE_RULES.requiredFinalReminders;
    const totalRequired = requiredCalls + requiredWhatsapp + requiredFinalReminders;

    return {
      callsDisabled,
      requiredCalls,
      requiredWhatsapp,
      requiredFinalReminders,
      totalRequired,
    };
  }
  function toPositiveInt(value, fallback, max = 500) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, max);
  }

  function normalizeEmail(email) {
    return repository.normalizeEmail(email);
  }

  function normalizePhone(phone) {
    return repository.normalizePhone(phone);
  }

  async function applyVisibilityScope(mappedFilters = {}, context = {}) {
    const nextFilters = { ...mappedFilters };
    const userId = context.user?.id || null;
    const userRole = normalizeRoleToken(context.user?.role);
    const isAgent = isAgentRole(userRole);
    const isManager = isManagerRole(userRole);

    if (isAgent && userId) {
      nextFilters.assignedTo = userId;
      const agentCountrySet = await getUserCountrySet(userId);
      if (agentCountrySet.size > 0) {
        nextFilters.allowedCountries = [...agentCountrySet];
      }
    }

    if (isManager && userId) {
      const [managerCountrySet, managedAgentIds] = await Promise.all([
        getUserCountrySet(userId),
        repository.findManagedAgentIds(userId),
      ]);
      const visibleAssigneeIds = [userId, ...managedAgentIds].filter(Boolean);
      if (visibleAssigneeIds.length > 0) {
        nextFilters.visibleAssigneeIds = [...new Set(visibleAssigneeIds)];
        nextFilters.includeUnassigned = true;
      }
      if (managerCountrySet.size > 0) {
        nextFilters.allowedCountries = [...managerCountrySet];
      }
    }

    return nextFilters;
  }

  function normalizeLeadType(value) {
    if (!value) {
      return "HOLIDAY";
    }

    const normalized = String(value).trim().toUpperCase();
    if (normalized.includes("VISA")) return "VISA";
    if (normalized.includes("HOLIDAY")) return "HOLIDAY";
    if (normalized === "BOTH") return "BOTH";
    return "HOLIDAY";
  }

  function normalizeLeadStatus(value) {
    if (!value) {
      return "OPEN";
    }
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return DOC_STATUS_TO_CANONICAL[normalized] || "OPEN";
  }

  function normalizeSlaFilter(value) {
    if (!value) {
      return undefined;
    }
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "WITHIN_SLA" || normalized === "WITHIN") {
      return "WITHIN_SLA";
    }
    if (normalized === "OVERDUE") {
      return "OVERDUE";
    }
    if (normalized === "PENDING") {
      return "PENDING";
    }
    return undefined;
  }

  function normalizeSortBy(value) {
    if (!value) {
      return "NEWEST_FIRST";
    }
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "CREATED_AT_DESC" || normalized === "CREATED_DESC") {
      return "CREATED_AT_DESC";
    }
    if (normalized === "CREATED_AT_ASC" || normalized === "CREATED_ASC") {
      return "CREATED_AT_ASC";
    }
    if (normalized === "OLDEST_FIRST" || normalized === "OLDEST") {
      return "OLDEST_FIRST";
    }
    if (
      normalized === "NAME_A_Z" ||
      normalized === "NAME" ||
      normalized === "NAME_ASC"
    ) {
      return "NAME_A_Z";
    }
    if (normalized === "STATUS" || normalized === "STATUS_ASC") {
      return "STATUS";
    }
    if (normalized === "COUNTRY_ASC" || normalized === "COUNTRY") {
      return "COUNTRY_ASC";
    }
    return "NEWEST_FIRST";
  }

  function normalizeQuickFilter(value) {
    if (!value) {
      return undefined;
    }
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "ACTIVE") return "ACTIVE";
    if (normalized === "FOLLOW_UP") return "FOLLOW_UP";
    if (normalized === "CLOSED") return "CLOSED";
    if (normalized === "LATE_RESPONSE") return "LATE_RESPONSE";
    if (normalized === "LOST") return "LOST";
    return undefined;
  }

  function deriveDocStatus(canonicalStatus, subStatus) {
    const status = String(canonicalStatus || "OPEN").toUpperCase();
    if (status === "OPEN") return "NEW";
    if (status === "WIP") return "NEGOTIATION";
    if (status === "FOLLOW_UP") {
      if (
        subStatus &&
        /^FOLLOW_UP_[1-4]$/.test(String(subStatus).toUpperCase())
      ) {
        return String(subStatus).toUpperCase();
      }
      if (String(subStatus || "").toUpperCase() === "FINAL_REMINDER") {
        return "FINAL_REMINDER";
      }
      return "FOLLOW_UP_1";
    }
    return status;
  }

  function normalizeHotelCategory(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = String(value).trim().toUpperCase().replace(/\s+/g, "_");
    if (["3_STAR", "4_STAR", "5_STAR", "ANY"].includes(normalized)) {
      return normalized;
    }
    return null;
  }

  function mapTemperatureToPriority(temperature) {
    if (temperature === LEAD_TEMPERATURE.HOT) {
      return 3;
    }
    if (temperature === LEAD_TEMPERATURE.WARM) {
      return 2;
    }
    return 1;
  }

  function getDaysUntilTravel(travelDate) {
    if (!travelDate) {
      return null;
    }

    const target = new Date(travelDate);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfTravel = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );

    return Math.floor((startOfTravel - startOfToday) / (24 * 60 * 60 * 1000));
  }

  function determineLeadTemperature(input = {}) {
    const daysUntilTravel = getDaysUntilTravel(input.travelDate);
    const budget = Number(input.budget || 0);
    const hasHighBudget =
      Number.isFinite(budget) &&
      budget >= AUTOMATION_DEFAULTS.highBudgetThreshold;
    const respondedPositively =
      input.respondedPositively === true ||
      POSITIVE_RESPONSE_STATUSES.has(input.status || "OPEN");

    if (
      daysUntilTravel !== null &&
      daysUntilTravel >= 0 &&
      daysUntilTravel < 30
    ) {
      return LEAD_TEMPERATURE.HOT;
    }

    if (hasHighBudget && respondedPositively) {
      return LEAD_TEMPERATURE.HOT;
    }

    if (
      daysUntilTravel !== null &&
      daysUntilTravel >= 30 &&
      daysUntilTravel <= 90
    ) {
      return LEAD_TEMPERATURE.WARM;
    }

    if (respondedPositively) {
      return LEAD_TEMPERATURE.WARM;
    }

    return LEAD_TEMPERATURE.COLD;
  }

  function withTemperature(lead, override = {}) {
    if (!lead) {
      return lead;
    }

    const derivedTemperature = determineLeadTemperature({
      travelDate: lead.travelDate,
      budget: lead.budget,
      status: lead.status,
      respondedPositively: override.respondedPositively,
    });

    return {
      ...lead,
      temperature: lead.temperature || derivedTemperature,
      statusLabel: deriveDocStatus(lead.status, lead.subStatus),
    };
  }

  function getMissingQualificationFields(input = {}) {
    const missing = [];
    if (!input.leadCountry && !input.country) {
      missing.push("leadCountry");
    }
    if (input.travelDate && input.travelEndDate) {
      const start = new Date(input.travelDate);
      const end = new Date(input.travelEndDate);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end.getTime() < start.getTime()
      ) {
        missing.push("travelDateRange(travelEndDate>=travelDate)");
      }
    }
    if (input.adultsCount === undefined || input.childrenCount === undefined) {
      missing.push("paxSplit(adultsCount,childrenCount)");
    }

    const leadType = normalizeLeadType(input.leadType ?? input.type ?? "HOLIDAY");
    if (leadType === "VISA") {
      if (input.salary === undefined || input.salary === null || input.salary === "") {
        missing.push("salary");
      }
    }

    return missing;
  }

  function assertQualificationCaptured(input = {}) {
    const missing = getMissingQualificationFields(input);
    if (!missing.length) {
      return;
    }

    throw new AppError(
      400,
      `Lead qualification is incomplete. Missing required fields: ${missing.join(", ")}`,
      "LEAD_QUALIFICATION_REQUIRED",
      { missing },
    );
  }

  function assertFollowupCompliance(stats, rules = {}) {
    if (isFollowupComplianceSatisfied(stats, rules)) {
      return;
    }

    const requiredCalls =
      Number.isFinite(rules.requiredCalls) ?
        rules.requiredCalls
      : FOLLOWUP_COMPLIANCE_RULES.requiredCalls;
    const requiredWhatsapp =
      Number.isFinite(rules.requiredWhatsapp) ?
        rules.requiredWhatsapp
      : FOLLOWUP_COMPLIANCE_RULES.requiredWhatsapp;
    const requiredFinalReminders =
      Number.isFinite(rules.requiredFinalReminders) ?
        rules.requiredFinalReminders
      : FOLLOWUP_COMPLIANCE_RULES.requiredFinalReminders;

    throw new AppError(
      409,
      `Follow-up compliance not met. Required: ${requiredCalls} calls, ${requiredWhatsapp} WhatsApp, ${requiredFinalReminders} final reminder.`,
      "LEAD_FOLLOWUP_COMPLIANCE_REQUIRED",
      stats,
    );
  }

  function isFollowupComplianceSatisfied(stats, rules = {}) {
    const requiredCalls =
      Number.isFinite(rules.requiredCalls) ?
        rules.requiredCalls
      : FOLLOWUP_COMPLIANCE_RULES.requiredCalls;
    const requiredWhatsapp =
      Number.isFinite(rules.requiredWhatsapp) ?
        rules.requiredWhatsapp
      : FOLLOWUP_COMPLIANCE_RULES.requiredWhatsapp;
    const requiredFinalReminders =
      Number.isFinite(rules.requiredFinalReminders) ?
        rules.requiredFinalReminders
      : FOLLOWUP_COMPLIANCE_RULES.requiredFinalReminders;

    if (
      stats.calls >= requiredCalls &&
      stats.whatsapp >= requiredWhatsapp &&
      stats.finalReminders >= requiredFinalReminders
    ) {
      return true;
    }
    return false;
  }

  function addDays(dateValue, days) {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date;
  }

  function toDateOnly(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function formatFollowupDateTime(
    value,
    preferences = DEFAULT_SYSTEM_DATE_TIME_PREFERENCES,
    timeZoneOverride,
  ) {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const normalizedPreferences =
      normalizeSystemDateTimePreferences(preferences);
    const tz =
      String(timeZoneOverride || "").trim() || normalizedPreferences.timezone;

    try {
      return new Intl.DateTimeFormat(normalizedPreferences.locale, {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }

  function buildFollowupOverdueMessage(
    item = {},
    preferences = DEFAULT_SYSTEM_DATE_TIME_PREFERENCES,
  ) {
    const followupType = String(item.followupType || "").trim().toUpperCase();
    const leadId = item.leadId ? String(item.leadId) : null;
    const leadRef = leadId ? `Lead ${leadId}` : "A lead";
    const followupLabel = formatFollowupDateTime(
      item.followupDate,
      preferences,
      item.clientTimezone,
    );
    const timeSuffix =
      followupLabel ? ` Scheduled time was ${followupLabel}.` : "";
    const normalizedNote = String(item.notes || "").trim();
    const noteSuffix =
      normalizedNote && !normalizedNote.startsWith("AUTO_CADENCE:") ?
        ` Note: ${normalizedNote}`
      : "";

    if (followupType === "CALL") {
      return `${leadRef}: call follow-up is due now.${timeSuffix}${noteSuffix}`;
    }
    if (followupType === "WHATSAPP") {
      return `${leadRef}: WhatsApp follow-up is due now.${timeSuffix}${noteSuffix}`;
    }
    if (followupType === "EMAIL") {
      return `${leadRef}: email follow-up is due now.${timeSuffix}${noteSuffix}`;
    }
    if (followupType === "FINAL_REMINDER") {
      return `${leadRef}: final reminder is due now.${timeSuffix}${noteSuffix}`;
    }
    return `${leadRef}: follow-up is due now.${timeSuffix}${noteSuffix}`;
  }

  function deriveWorkflowFollowupType({
    requestedFollowupType = null,
    scheduledFollowup = null,
    compliance = {},
    policy = {},
    subStatus = null,
  } = {}) {
    const normalizedRequestedType = String(requestedFollowupType || "")
      .trim()
      .toUpperCase();
    const normalizedSubStatus = String(subStatus || "").trim().toUpperCase();
    if (normalizedSubStatus === "FINAL_REMINDER") {
      return "FINAL_REMINDER";
    }

    if (normalizedRequestedType === "CALL") {
      return policy.callsDisabled ? "WHATSAPP" : "CALL";
    }

    if (normalizedRequestedType === "WHATSAPP") {
      return "WHATSAPP";
    }

    if (normalizedRequestedType === "FINAL_REMINDER") {
      return "FINAL_REMINDER";
    }

    const scheduledType = String(scheduledFollowup?.followupType || "")
      .trim()
      .toUpperCase();
    if (scheduledType) {
      if (policy.callsDisabled && scheduledType === "CALL") {
        return "WHATSAPP";
      }
      return scheduledType;
    }

    if (!policy.callsDisabled && (compliance.calls || 0) < (policy.requiredCalls || 0)) {
      return "CALL";
    }

    if ((compliance.whatsapp || 0) < (policy.requiredWhatsapp || 0)) {
      return "WHATSAPP";
    }

    if ((compliance.finalReminders || 0) < (policy.requiredFinalReminders || 0)) {
      return "FINAL_REMINDER";
    }

    return policy.callsDisabled ? "WHATSAPP" : "CALL";
  }

  function normalizeWorkflowHistoryFollowupType(value, policy = {}) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "FINAL_REMINDER") {
      return "FINAL_REMINDER";
    }

    if (normalized === "CALL") {
      return policy.callsDisabled ? "WHATSAPP" : "CALL";
    }

    if (normalized === "WHATSAPP") {
      return "WHATSAPP";
    }

    if (normalized === "EMAIL") {
      return "EMAIL";
    }

    return null;
  }

  function buildFollowupReminderMessage(
    item = {},
    lead = {},
    preferences = DEFAULT_SYSTEM_DATE_TIME_PREFERENCES,
    lookaheadMinutes = 5,
  ) {
    const followupType = String(item.followupType || "").trim().toUpperCase();
    const followupLabel = formatFollowupDateTime(
      item.followupDate,
      preferences,
      item.clientTimezone,
    );
    const leadLabel =
      lead.fullName ? `Lead ${lead.fullName}` : item.leadId ? `Lead ${item.leadId}` : "A lead";

    let actionLabel = "follow-up";
    if (followupType === "CALL") actionLabel = "call";
    if (followupType === "WHATSAPP") actionLabel = "WhatsApp follow-up";
    if (followupType === "EMAIL") actionLabel = "email follow-up";
    if (followupType === "FINAL_REMINDER") actionLabel = "final reminder";

    let message = `${leadLabel}: ${actionLabel} is scheduled`;
    if (followupLabel) {
      message += ` at ${followupLabel}`;
    }
    message += `. Due in about ${Math.max(1, lookaheadMinutes)} minute(s) — please be ready.`;

    const note = String(item.notes || "").trim();
    if (note) {
      if (!note.startsWith("AUTO_CADENCE:")) {
        message += `\nNote: ${note}`;
      }
    }

    return message;
  }

  function toCadenceDate(baseDate, slot) {
    const date = addDays(baseDate, slot.dayOffset);
    date.setHours(slot.hour, slot.minute, 0, 0);
    return date;
  }

  function isAfterResponseDeadline(responseAt, responseDeadline) {
    if (!responseAt || !responseDeadline) {
      return false;
    }

    const responseTime = new Date(responseAt).getTime();
    const deadlineTime = new Date(responseDeadline).getTime();

    if (
      Number.isNaN(responseTime) ||
      Number.isNaN(deadlineTime)
    ) {
      return false;
    }

    return responseTime > deadlineTime;
  }

  function buildCadenceSlots(lead) {
    const anchor = lead.createdAt ? new Date(lead.createdAt) : new Date();
    const callsDisabled = Boolean(lead.callsDisabled);
    return CADENCE_TEMPLATE.map((slot) => ({
      ...slot,
      type: callsDisabled && slot.type === "CALL" ? "WHATSAPP" : slot.type,
      followupDate: toCadenceDate(anchor, slot),
    }));
  }

  function buildCreateRecord(payload, options = {}) {
    const customerId = options.customerId || null;
    const useCustomerLinking = Boolean(options.useCustomerLinking);
    const now = new Date();
    const responseDeadline =
      payload.responseDeadline ?
        new Date(payload.responseDeadline).toISOString()
      : new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const assignedTo = payload.assignedTo || null;
    const temperature = determineLeadTemperature(payload);
    const leadCountry = payload.leadCountry ?? payload.country ?? null;
    const normalizedLeadType = normalizeLeadType(payload.leadType ?? payload.type);

	    const mapped = {
	      full_name: payload.fullName || null,
	      phone: normalizePhone(payload.phone),
	      phone_normalized: normalizePhone(payload.phone),
	      email: normalizeEmail(payload.email),
      city: payload.city || null,
      pan_number: payload.panNumber || null,
      address_line: payload.addressLine || null,
      client_currency: payload.clientCurrency || null,
      destination_id: payload.destinationId || null,
      travel_from: payload.travelFrom || null,
      travel_to: payload.travelTo || payload.destinationName || payload.destination || null,
      nationality: payload.nationality || null,
      lead_country: leadCountry,
      country_id: payload.countryId || null,
      travel_date: payload.travelDate || null,
      travel_end_date: payload.travelEndDate || null,
      budget: payload.budget ?? null,
      salary:
        payload.salary ??
        (normalizedLeadType === "VISA" ? (payload.budget ?? null) : null),
      adults_count: payload.adultsCount ?? 1,
      children_count: payload.childrenCount ?? 0,
      visa_required: payload.visaRequired ?? false,
      lead_type: normalizedLeadType,
      preferred_hotel_category: normalizeHotelCategory(
        payload.preferredHotelCategory,
      ),
      travel_purpose: payload.travelPurpose || null,
      sub_status: payload.subStatus || null,
      temperature,
      source: payload.source || "Manual",
      platform: payload.platform || null,
      campaign_name: payload.campaignName || null,
      ad_name: payload.adName || null,
      campaign_id: payload.campaignId || null,
      utm_source: payload.utmSource || null,
      utm_medium: payload.utmMedium || null,
      utm_campaign: payload.utmCampaign || null,
      meta_lead_id: payload.metaLeadId || null,
      meta_page_id: payload.metaPageId || null,
      meta_form_id: payload.metaFormId || null,
      meta_ad_id: payload.metaAdId || null,
      meta_adset_id: payload.metaAdsetId || null,
      meta_campaign_id: payload.metaCampaignId || null,
      priority_level:
        payload.priorityLevel ?? mapTemperatureToPriority(temperature),
      is_vip: payload.isVip ?? false,
      status: normalizeLeadStatus(payload.status),
      assigned_to: assignedTo,
      assigned_at: assignedTo ? now.toISOString() : null,
      response_deadline: responseDeadline,
      qualification_completed: payload.qualificationCompleted ?? false,
      closed_reason: payload.closedReason || null,
      next_followup_date: payload.nextFollowupDate || null,
      followup_attempts: 0,
      final_reminder_at: null,
      non_responsive_marked_at: null,
      calls_disabled: payload.callsDisabled ?? false,
      child_ages: Array.isArray(payload.childAges)
        ? JSON.stringify(payload.childAges)
        : null,
      client_created_at: payload.clientCreatedAt || null,
      client_timezone: payload.clientTimezone || null,
      dynamic_fields:
        payload.dynamicFields && typeof payload.dynamicFields === "object" ?
          JSON.stringify(payload.dynamicFields)
        : null,
      dynamic_field_labels:
        payload.dynamicFieldLabels && typeof payload.dynamicFieldLabels === "object" ?
          JSON.stringify(payload.dynamicFieldLabels)
        : null,
    };

    if (useCustomerLinking) {
      mapped.customer_id = customerId;
    }

    return mapped;
  }

  function buildUpdateRecord(existing, payload, options = {}) {
    const useCustomerLinking = Boolean(options.useCustomerLinking);
    const now = new Date().toISOString();
    const mapped = {};

    if (payload.fullName !== undefined) {
      mapped.full_name = payload.fullName;
    }
	    if (payload.phone !== undefined) {
	      mapped.phone = normalizePhone(payload.phone);
	      mapped.phone_normalized = normalizePhone(payload.phone);
	    }
    if (payload.email !== undefined) {
      mapped.email = normalizeEmail(payload.email);
    }
    if (payload.city !== undefined) {
      mapped.city = payload.city || null;
    }
    if (payload.panNumber !== undefined) {
      mapped.pan_number = payload.panNumber;
    }
    if (payload.addressLine !== undefined) {
      mapped.address_line = payload.addressLine;
    }
    if (payload.clientCurrency !== undefined) {
      mapped.client_currency = payload.clientCurrency;
    }

    if (payload.destinationId !== undefined) {
      mapped.destination_id = payload.destinationId;
    }
    if (payload.travelFrom !== undefined) {
      mapped.travel_from = payload.travelFrom || null;
    }
    if (
      payload.travelTo !== undefined ||
      payload.destinationName !== undefined ||
      payload.destination !== undefined
    ) {
      mapped.travel_to =
        payload.travelTo ?? payload.destinationName ?? payload.destination ?? null;
    }
    if (payload.leadCountry !== undefined || payload.country !== undefined) {
      mapped.lead_country = payload.leadCountry ?? payload.country ?? null;
    }
    if (payload.countryId !== undefined) {
      mapped.country_id = payload.countryId || null;
    }
    if (payload.nationality !== undefined) {
      mapped.nationality = payload.nationality;
    }
    if (payload.travelDate !== undefined) {
      mapped.travel_date = payload.travelDate;
    }
    if (payload.travelEndDate !== undefined) {
      mapped.travel_end_date = payload.travelEndDate;
    }
    if (payload.budget !== undefined) {
      mapped.budget = payload.budget;
    }
    if (payload.salary !== undefined) {
      mapped.salary = payload.salary;
    }
    if (payload.source !== undefined) {
      mapped.source = payload.source;
    }
    if (payload.platform !== undefined) {
      mapped.platform = payload.platform || null;
    }
    if (payload.campaignName !== undefined) {
      mapped.campaign_name = payload.campaignName || null;
    }
    if (payload.adName !== undefined) {
      mapped.ad_name = payload.adName || null;
    }
    if (payload.campaignId !== undefined) {
      mapped.campaign_id = payload.campaignId;
    }
    if (payload.utmSource !== undefined) {
      mapped.utm_source = payload.utmSource;
    }
    if (payload.utmMedium !== undefined) {
      mapped.utm_medium = payload.utmMedium;
    }
    if (payload.utmCampaign !== undefined) {
      mapped.utm_campaign = payload.utmCampaign;
    }
    if (payload.metaLeadId !== undefined) {
      mapped.meta_lead_id = payload.metaLeadId || null;
    }
    if (payload.metaPageId !== undefined) {
      mapped.meta_page_id = payload.metaPageId || null;
    }
    if (payload.metaFormId !== undefined) {
      mapped.meta_form_id = payload.metaFormId || null;
    }
    if (payload.metaAdId !== undefined) {
      mapped.meta_ad_id = payload.metaAdId || null;
    }
    if (payload.metaAdsetId !== undefined) {
      mapped.meta_adset_id = payload.metaAdsetId || null;
    }
    if (payload.metaCampaignId !== undefined) {
      mapped.meta_campaign_id = payload.metaCampaignId || null;
    }
    if (payload.dynamicFields !== undefined) {
      mapped.dynamic_fields =
        payload.dynamicFields && typeof payload.dynamicFields === "object" ?
          JSON.stringify(payload.dynamicFields)
        : null;
    }
    if (payload.dynamicFieldLabels !== undefined) {
      mapped.dynamic_field_labels =
        payload.dynamicFieldLabels && typeof payload.dynamicFieldLabels === "object" ?
          JSON.stringify(payload.dynamicFieldLabels)
        : null;
    }
    if (payload.adultsCount !== undefined) {
      mapped.adults_count = payload.adultsCount;
    }
    if (payload.childrenCount !== undefined) {
      mapped.children_count = payload.childrenCount;
    }
    if (payload.childAges !== undefined) {
      mapped.child_ages = Array.isArray(payload.childAges)
        ? JSON.stringify(payload.childAges)
        : null;
    }
    if (payload.visaRequired !== undefined) {
      mapped.visa_required = payload.visaRequired;
    }
    if (payload.leadType !== undefined || payload.type !== undefined) {
      mapped.lead_type = normalizeLeadType(payload.leadType ?? payload.type);
    }
    if (payload.preferredHotelCategory !== undefined) {
      mapped.preferred_hotel_category = normalizeHotelCategory(
        payload.preferredHotelCategory,
      );
    }
    if (payload.travelPurpose !== undefined) {
      mapped.travel_purpose = payload.travelPurpose;
    }
    if (payload.subStatus !== undefined) {
      mapped.sub_status = payload.subStatus;
    }
    if (payload.priorityLevel !== undefined) {
      mapped.priority_level = payload.priorityLevel;
    }
    if (payload.temperature !== undefined) {
      const nextTemperature = String(payload.temperature || "").trim().toUpperCase();
      if (Object.values(LEAD_TEMPERATURE).includes(nextTemperature)) {
        mapped.temperature = nextTemperature;
        if (payload.priorityLevel === undefined) {
          mapped.priority_level = mapTemperatureToPriority(nextTemperature);
        }
      }
    }
    if (payload.isVip !== undefined) {
      mapped.is_vip = payload.isVip;
    }
    if (payload.status !== undefined) {
      mapped.status = normalizeLeadStatus(payload.status);
      const requestedDocStatus = String(payload.status)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (["HOT", "WARM", "COLD"].includes(requestedDocStatus)) {
        mapped.temperature = requestedDocStatus;
        mapped.priority_level = mapTemperatureToPriority(requestedDocStatus);
      }
      if (/^FOLLOW_UP_[1-4]$/.test(requestedDocStatus)) {
        mapped.sub_status = requestedDocStatus;
      } else if (requestedDocStatus === "FINAL_REMINDER") {
        mapped.sub_status = "FINAL_REMINDER";
      } else if (mapped.status === "CONTACTED" && !payload.subStatus) {
        mapped.sub_status = "CONTACTED";
      }
    }
    if (payload.assignedTo !== undefined) {
      mapped.assigned_to = payload.assignedTo;
      mapped.assigned_at = payload.assignedTo ? now : null;
    }
    if (payload.qualificationCompleted !== undefined) {
      mapped.qualification_completed = payload.qualificationCompleted;
    }
    if (payload.closedReason !== undefined) {
      mapped.closed_reason = payload.closedReason;
    }
    if (payload.customStatusLabel !== undefined) {
      const rawCs = payload.customStatusLabel;
      mapped.custom_status_label =
        rawCs === null || String(rawCs ?? "").trim() === "" ?
          null
        : String(rawCs).trim().slice(0, 191) || null;
    }
    if (
      options.persistStatusTransitionCustom &&
      payload.statusTransitionCustom !== undefined
    ) {
      const raw = payload.statusTransitionCustom;
      if (raw === null || raw === "") {
        mapped.status_transition_custom = null;
      } else {
        const v = String(raw).trim();
        mapped.status_transition_custom = v || null;
      }
    }
    if (payload.nextFollowupDate !== undefined) {
      mapped.next_followup_date = payload.nextFollowupDate;
    }
    if (payload.callsDisabled !== undefined) {
      mapped.calls_disabled = payload.callsDisabled;
    }

    if (mapped.status && POSITIVE_RESPONSE_STATUSES.has(mapped.status) && !existing.responseAt) {
      const responseStamp = resolveActivityStamp(payload)?.createdAt || now;
      mapped.response_at = responseStamp;
      if (existing.responseDeadline) {
        mapped.sla_breached = isAfterResponseDeadline(
          responseStamp,
          existing.responseDeadline,
        );
      }
    }

    if (payload.priorityLevel === undefined && payload.temperature === undefined) {
      const mergedLead = {
        travelDate: payload.travelDate ?? existing.travelDate,
        budget: payload.budget ?? existing.budget,
        status: normalizeLeadStatus(payload.status ?? existing.status),
        respondedPositively: payload.respondedPositively,
      };
      const nextTemperature = determineLeadTemperature(mergedLead);
      mapped.priority_level = mapTemperatureToPriority(nextTemperature);
      mapped.temperature = nextTemperature;
    }

    if (Object.keys(mapped).length) {
      mapped.updated_at = now;
    }

    return mapped;
  }

  async function resolveDestinationId(payload = {}) {
    if (payload.destinationId) {
      return payload.destinationId;
    }

    if (payload.skipDestinationMasterCreate === true) {
      return null;
    }

    const destinationName =
      payload.destinationName || payload.destination || null;
    if (!destinationName) {
      return null;
    }

    const destination =
      await repository.ensureDestinationByName(destinationName);
    return destination?.id || null;
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "leads", requestId: context.requestId, id },
      "Getting lead by id",
    );
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    }

    const mapped = withTemperature(item);
    const allowed = await canUserAccessLead(mapped, context);
    if (!allowed) {
      throw new AppError(
        403,
        "You do not have access to this lead",
        "LEAD_ACCESS_FORBIDDEN",
      );
    }

    return mapped;
  }

  async function selectAssigneeForLead(lead, options = {}) {
    const roleName = options.roleName ?
      String(options.roleName).trim().toLowerCase()
    : null;
    const roundRobinOnly =
      options.roundRobinOnly === true ||
      roleName === ASSIGNMENT_ROLES.AGENT ||
      roleName === ASSIGNMENT_ROLES.MANAGER;
    
    const leadCountry = normalizeCountryAlias(
      lead.leadCountry ?? lead.country ?? null,
    );
    const leadType = normalizeAgentType(lead.leadType ?? lead.type ?? null);
    const requiredLeadType = leadType === "BOTH" ? null : leadType;

    // Try to get from cache first (country-specific)
    let candidates = null;
    if (roleName === ASSIGNMENT_ROLES.AGENT && leadCountry) {
      candidates = agentCache.get(leadCountry, requiredLeadType);
      if (candidates) {
        logger.debug(
          { leadCountry, leadType: requiredLeadType },
          'Agent cache hit for country'
        );
      }
    }

    // Cache miss - query database
    if (!candidates) {
      candidates = await repository.findActiveAssignableUsers(roleName);
      
      // NEW: 2-Tier Priority Matching
      if (roleName === ASSIGNMENT_ROLES.AGENT && requiredLeadType) {
        const perfectMatch = [];
        const typeOnlyMatch = [];
        const typeAnyCountryMatch = [];
        
        for (const candidate of candidates) {
          const agentCountry = normalizeCountryAlias(candidate.country);
          const agentType = normalizeAgentType(candidate.agentType);
          
          // Check if agent type matches
          const typeMatches = agentType === requiredLeadType || agentType === "BOTH";
          
          if (!typeMatches) {
            continue; // Skip if type doesn't match
          }
          
          // Priority 1: Country + Type match
          if (leadCountry && agentCountry && countriesMatch(agentCountry, leadCountry)) {
            perfectMatch.push(candidate);
          }
          // Priority 2: Type match + Agent has no country restriction
          else if (!agentCountry) {
            typeOnlyMatch.push(candidate);
          }
          // Priority 3: Type match regardless of country
          typeAnyCountryMatch.push(candidate);
        }
        
        // Select best pool
        let selectedPool = [];
        let tier = 'NONE';
        
        if (perfectMatch.length > 0) {
          selectedPool = perfectMatch;
          tier = 'PERFECT';
        } else if (typeOnlyMatch.length > 0) {
          selectedPool = typeOnlyMatch;
          tier = 'TYPE_ONLY';
        } else if (!leadCountry && typeAnyCountryMatch.length > 0) {
          selectedPool = typeAnyCountryMatch;
          tier = 'TYPE_ANY_COUNTRY';
        }
        
        logger.debug(
          { 
            leadCountry, 
            leadType: requiredLeadType,
            tier,
            perfectCount: perfectMatch.length,
            typeOnlyCount: typeOnlyMatch.length,
            typeAnyCountryCount: typeAnyCountryMatch.length,
            selectedCount: selectedPool.length
          },
          'Agent pool selected by 2-tier priority'
        );
        
        // Cache the selected pool
        if (selectedPool.length && leadCountry) {
          agentCache.set(leadCountry, requiredLeadType, selectedPool);
        }
        
        candidates = selectedPool;
      }
    }

    if (options.excludeUserId && candidates.length > 1) {
      const filtered = candidates.filter(
        (candidate) => candidate.id !== options.excludeUserId,
      );
      if (filtered.length) {
        candidates = filtered;
      }
    }

    if (!candidates.length) {
      return null;
    }

    if (options.managerId && roleName === ASSIGNMENT_ROLES.AGENT) {
      const managedOnly = candidates.filter(
        (candidate) => candidate.managerId === options.managerId,
      );
      if (!managedOnly.length) {
        return null;
      }
      candidates = managedOnly;
    }

    let pool = candidates;

    if (lead.destinationId) {
      const destination = await repository.findDestinationById(
        lead.destinationId,
      );
      const destinationTokens = new Set([
        String(lead.destinationId).toLowerCase(),
      ]);

      if (destination?.name) {
        destinationTokens.add(String(destination.name).trim().toLowerCase());
      }

      const matchedByExpertise = candidates.filter((candidate) => {
        const expertiseSet = new Set(
          (candidate.expertiseDestinations || []).map((item) =>
            String(item).trim().toLowerCase(),
          ),
        );

        for (const token of destinationTokens) {
          if (expertiseSet.has(token)) {
            return true;
          }
        }

        return false;
      });

      if (matchedByExpertise.length) {
        pool = matchedByExpertise;
      }
    }

    const poolIds = pool.map((candidate) => candidate.id);

    if (!roundRobinOnly) {
      const openLoadByUser =
        await repository.getOpenLeadLoadByUserIds(poolIds);
      const isHighValueLead =
        Boolean(lead.isVip) ||
        Number(lead.budget || 0) >= AUTOMATION_DEFAULTS.highBudgetThreshold;

      if (isHighValueLead) {
        const sortedByHighValueRule = [...pool].sort((left, right) => {
          const leftLoad = openLoadByUser[left.id] || 0;
          const rightLoad = openLoadByUser[right.id] || 0;

          if (leftLoad !== rightLoad) {
            return leftLoad - rightLoad;
          }

          if (left.incentivePercent !== right.incentivePercent) {
            return right.incentivePercent - left.incentivePercent;
          }

          return String(left.id).localeCompare(String(right.id));
        });

        return sortedByHighValueRule[0];
      }
    }

    // Country-based round-robin selection
    const roundRobinPool = [...pool].sort((left, right) =>
      String(left.id).localeCompare(String(right.id)),
    );
    
    // Get last assigned from in-memory state (per country and type)
    const lastAssignedUserId = roundRobinState.getLastAssigned(
      leadCountry || 'all',
      requiredLeadType
    );

    let selectedAgent;
    if (!lastAssignedUserId) {
      // First assignment for this country
      selectedAgent = roundRobinPool[0];
    } else {
      // Find next agent in rotation
      const lastIndex = roundRobinPool.findIndex(
        (candidate) => candidate.id === lastAssignedUserId,
      );
      
      if (lastIndex === -1 || lastIndex === roundRobinPool.length - 1) {
        // Wrap around to first agent
        selectedAgent = roundRobinPool[0];
      } else {
        // Next agent in rotation
        selectedAgent = roundRobinPool[lastIndex + 1];
      }
    }

    // Update round-robin state
    if (selectedAgent) {
      roundRobinState.setLastAssigned(
        leadCountry || 'all',
        requiredLeadType,
        selectedAgent.id
      );
      logger.debug(
        { 
          leadCountry: leadCountry || 'all', 
          leadType: requiredLeadType,
          selectedAgentId: selectedAgent.id,
          agentName: selectedAgent.fullName,
          agentCountry: selectedAgent.country
        },
        'Round-robin assignment completed'
      );
    }

    return selectedAgent;
  }

  async function assignLead(leadId, payload = {}, context = {}) {
    const skipAccessCheck = payload.skipAccessCheck === true;
    let existing;
    if (skipAccessCheck) {
      const rawLead = await repository.findById(leadId);
      if (!rawLead) {
        throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
      }
      existing = withTemperature(rawLead);
    } else {
      existing = await getById(leadId, context);
    }

    if (CLOSED_STATUSES.has(existing.status)) {
      return existing;
    }

    if (existing.assignedTo && !payload.force) {
      return existing;
    }

    const requestedRoleName = payload.roleName ?
      String(payload.roleName).trim().toLowerCase()
    : ASSIGNMENT_ROLES.AGENT;
    const roleName =
      requestedRoleName === ASSIGNMENT_ROLES.MANAGER ?
        ASSIGNMENT_ROLES.AGENT
      : requestedRoleName;
    const requestRole = normalizeRoleToken(context.user?.role);

    if (
      context.user?.id &&
      isManagerRole(requestRole) &&
      !isSuperAdminRole(requestRole)
    ) {
      throw new AppError(
        403,
        "Managers have view-only access for lead assignment.",
        "MANAGER_ASSIGNMENT_FORBIDDEN",
      );
    }
    const managerId =
      roleName === ASSIGNMENT_ROLES.AGENT && isManagerRole(requestRole)
        ? context.user?.id || null
        : null;

    const leadCountry = normalizeCountryAlias(
      existing.leadCountry ?? existing.country ?? null,
    );

    async function resolveAssigneeCountrySet(user) {
      if (!user?.id) {
        return new Set();
      }
      const [assigneeCountries, assigneePrimaryCountry] = await Promise.all([
        repository.findUserCountryNames(user.id),
        Promise.resolve(normalizeCountryAlias(user.country)),
      ]);
      const countrySet = new Set(
        assigneeCountries
          .map((country) => normalizeCountryAlias(country))
          .filter(Boolean),
      );
      if (assigneePrimaryCountry) {
        countrySet.add(assigneePrimaryCountry);
      }
      return countrySet;
    }

    function assigneeCountryMatches(countrySet) {
      if (!leadCountry || countrySet.size === 0) {
        return true;
      }
      return [...countrySet].some((country) => countriesMatch(country, leadCountry));
    }

    let assignee = null;
    if (payload.assignedTo) {
      assignee = await repository.findAssignableUserById(payload.assignedTo);
      if (!assignee) {
        throw new AppError(404, "Assignee not found", "ASSIGNEE_NOT_FOUND");
      }
      if (!isAssignableLeadOwnerRole(assignee.role)) {
        throw new AppError(
          400,
          "Leads can only be assigned to lead agents or managers.",
          "ASSIGNEE_ROLE_NOT_ALLOWED",
        );
      }
      if (
        managerId &&
        !isSuperAdminRole(requestRole) &&
        assignee.managerId !== managerId
      ) {
        throw new AppError(
          403,
          "Manager can assign only to own team members",
          "ASSIGNEE_OUTSIDE_MANAGER_TEAM",
        );
      }
    } else {
      assignee = await selectAssigneeForLead(existing, {
        excludeUserId: payload.excludeUserId,
        roleName,
        managerId,
      });
      if (assignee) {
        const normalizedAssigneeCountries = await resolveAssigneeCountrySet(assignee);
        if (!assigneeCountryMatches(normalizedAssigneeCountries)) {
          assignee = null;
        }
      }
    }

    if (!assignee) {
      const reason = roleName === ASSIGNMENT_ROLES.MANAGER
        ? "NO_ASSIGNABLE_MANAGER"
        : managerId
          ? "NO_ASSIGNABLE_AGENT_FOR_MANAGER_TEAM_OR_COUNTRY"
          : "NO_ASSIGNABLE_AGENT";
      events.emitEscalated({
        leadId: existing.id,
        reason,
        role: roleName,
        fullName: existing.fullName || existing.name || null,
        message:
          reason === "NO_ASSIGNABLE_AGENT" ?
            "No agent available to assign this lead — managers please review."
          : undefined,
        roles: ["manager", "department_head", "team_lead"],
      });

      if (roleName !== ASSIGNMENT_ROLES.MANAGER) {
        await queueLeadIfNeeded(existing, reason);
      }

      return existing;
    }

    if (existing.assignedTo && existing.assignedTo === assignee.id) {
      return existing;
    }

    const nowIso = new Date().toISOString();
    const updatePayload = {
      assigned_to: assignee.id,
      assigned_at: nowIso,
    };

    if (!existing.responseAt) {
      updatePayload.response_deadline = new Date(
        Date.now() + 15 * 60 * 1000,
      ).toISOString();
    }

    const updated = await repository.update(existing.id, updatePayload);

    const previousAssigneeId = existing.assignedTo || null;
    const isReassign = Boolean(
      previousAssigneeId && previousAssigneeId !== assignee.id,
    );

    const assignmentActivityStamp = resolveActivityStamp(payload);
    if (assignmentActivityStamp) {
      await repository.createActivity({
        leadId: existing.id,
        userId: context.user?.id || null,
        activityType: isReassign ? "LEAD_REASSIGNED" : "LEAD_ASSIGNED",
        notes: payload.reason || null,
        createdAt: assignmentActivityStamp.createdAt,
        timezone: assignmentActivityStamp.timezone,
      });
    }

    await repository.createAssignmentHistory({
      leadId: existing.id,
      previousAssigneeId,
      newAssigneeId: assignee.id,
      assignedBy: context.user?.id || null,
      mode: payload.mode || "AUTO",
      reason: payload.reason || null,
    });

    const assignTz =
      normalizeIANATimezone(
        payload.activityTimezone ||
          payload.clientTimezone ||
          existing.clientTimezone ||
          null,
      ) ||
      ianaFromLeadCountry(existing.leadCountry || existing.country) ||
      DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone;
    const assignmentWallClock = localWallClockFromUtc(new Date(nowIso), assignTz);
    if (assignmentWallClock) {
      const assignedByResolvedName = context.user?.id
        ? await repository.findUserDisplayNameById?.(context.user.id)
        : null;
      const assignedByName = String(
        assignedByResolvedName ??
          context.user?.fullName ??
          context.user?.name ??
          context.user?.email ??
          context.user?.id ??
          "System",
      ).trim();
      const newAssigneeName = String(
        assignee.fullName ?? assignee.email ?? assignee.id ?? "Unknown",
      ).trim();
      const previousAssigneeName = String(
        existing.assignedUser?.fullName ??
          existing.assignedUser?.email ??
          previousAssigneeId ??
          "Unassigned",
      ).trim();
      const assignmentNote = isReassign
        ? `Reassigned by ${assignedByName} from ${previousAssigneeName} to ${newAssigneeName}`
        : `Assigned by ${assignedByName} to ${newAssigneeName}`;

      await repository.createFollowup(
        normalizeFollowupStoragePayload(
          {
            leadId: existing.id,
            userId: context.user?.id || assignee.id || null,
            followupType: "EMAIL",
            followupDate: nowIso,
            followupLocalAt: assignmentWallClock,
            clientTimezone: assignTz,
            statusSnapshot: "ASSIGNMENT",
            notes: assignmentNote,
            isCompleted: true,
            isScheduleOnly: false,
            countsTowardCompliance: false,
          },
          { fallbackTimezone: assignTz },
        ),
      );
    }

    const lead = withTemperature(updated);
    events.emitUpdated(lead);

    if (isReassign) {
      events.emitReassigned({
        leadId: lead.id,
        previousAssigneeId,
        assigneeId: assignee.id,
        mode: payload.mode || "AUTO",
        reason: payload.reason || null,
        role: roleName,
        leadName: lead.fullName || null,
        fullName: lead.fullName || null,
        phone: lead.phone || null,
        email: lead.email || null,
        city: lead.city || null,
        travelTo: lead.travelTo || null,
        destinationName: lead.destinationName || null,
        leadCode: lead.leadCode || null,
      });
    } else {
      events.emitAssigned({
        leadId: lead.id,
        assigneeId: assignee.id,
        mode: payload.mode || "AUTO",
        reason: payload.reason || null,
        role: roleName,
        leadName: lead.fullName || null,
        fullName: lead.fullName || null,
        phone: lead.phone || null,
        email: lead.email || null,
        city: lead.city || null,
        travelTo: lead.travelTo || null,
        destinationName: lead.destinationName || null,
        leadCode: lead.leadCode || null,
      });
    }

    return lead;
  }

  async function queueLeadIfNeeded(lead, reason = "NO_ACTIVE_AGENT") {
    if (!lead?.id) {
      return null;
    }
    return repository.enqueueLead({
      leadId: lead.id,
      reason,
    });
  }

  async function create(payload, context = {}) {
    const normalizedStatus = normalizeLeadStatus(payload.status);
    payload.status = normalizedStatus;

    // Meta / webhook captures: always create (legacy), no CRM 9-digit phone rule.
    if (isWebhookInboundLead(payload, context)) {
      payload.allowDuplicate = true;
    }

    if (context.user?.id) {
      const wall = String(payload.clientCreatedAt || "").trim();
      const tz = String(payload.clientTimezone || "").trim();
      if (!wall || !tz) {
        throw new AppError(
          400,
          "clientCreatedAt and clientTimezone are required",
          "WALL_CLOCK_REQUIRED",
        );
      }
      if (!payload.leadCountry && !payload.country) {
        throw new AppError(
          400,
          "leadCountry is required",
          "LEAD_COUNTRY_REQUIRED",
        );
      }
      if (!payload.nationality) {
        throw new AppError(
          400,
          "nationality is required",
          "LEAD_NATIONALITY_REQUIRED",
        );
      }
    }
    if (payload.qualificationCompleted === true) {
      payload.qualificationCompleted =
        getMissingQualificationFields(payload).length === 0;
    }

    const resolvedDestinationId = await resolveDestinationId(payload);
    if (resolvedDestinationId) {
      payload.destinationId = resolvedDestinationId;
    }

    const useCustomerLinking = await repository.hasLeadCustomerColumn();
    const duplicate = await repository.findDuplicateCandidate({
      email: payload.email,
      phone: payload.phone,
    });

    // For authenticated CRM users, allow creating repeat leads by default
    // (new lead lifecycle / lead code for the same customer contact).
    // Public capture keeps strict duplicate protection unless explicitly allowed.
    const allowDuplicate =
      payload.allowDuplicate === true ||
      (payload.allowDuplicate !== false && Boolean(context.user?.id));
    if (duplicate && !allowDuplicate) {
      const duplicateStatus = String(duplicate.status || "").toUpperCase();
      const duplicateIsClosed = CLOSED_STATUSES.has(duplicateStatus);
      if (!duplicateIsClosed) {
        throw new AppError(409, "Duplicate lead detected", "LEAD_DUPLICATE", {
          existingLeadId: duplicate.id,
        });
      }
    }

    const customer = await repository.findOrCreateCustomer({
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      panNumber: payload.panNumber,
      addressLine: payload.addressLine,
      clientCurrency: payload.clientCurrency,
    });

    const created = await repository.create(
      buildCreateRecord(payload, {
        customerId: customer?.id,
        useCustomerLinking,
      }),
    );

    let createdWithLeadCode = created;
    if (
      created?.id &&
      !created?.leadCode &&
      typeof repository.ensureLeadCode === "function"
    ) {
      createdWithLeadCode = await repository.ensureLeadCode(created.id);
    }

    if (created?.id && payload.dynamicFields) {
      try {
        await repository.upsertLeadDynamicFields?.(created.id, {
          fields: payload.dynamicFields,
          labels: payload.dynamicFieldLabels || {},
        });
      } catch (error) {
        logger?.warn?.(
          { err: error, module: "leads", leadId: created.id },
          "Failed to persist dynamic lead fields; fixed fields saved",
        );
      }
    }

    if (payload.notes) {
      const createActivityStamp = resolveActivityStamp({
        activityCreatedAt: payload.clientCreatedAt,
        activityTimezone: payload.clientTimezone,
      });
      if (createActivityStamp) {
      await repository.createActivity({
        leadId: created.id,
        userId: context.user?.id,
        activityType: "LEAD_CREATED",
        notes: payload.notes,
        createdAt: createActivityStamp.createdAt,
        timezone: createActivityStamp.timezone,
      });
      }
    }

    let lead = withTemperature(createdWithLeadCode || created, {
      respondedPositively: payload.respondedPositively,
    });
    events.emitCreated(lead);

    if (!lead.assignedTo && !CLOSED_STATUSES.has(lead.status)) {
      if (payload.autoAssign === false) {
        await queueLeadIfNeeded(lead, "AUTO_ASSIGN_DISABLED");
        return lead;
      }

      lead = await assignLead(
        lead.id,
        {
          force: true,
          mode: "AUTO_CREATE",
          reason: "AUTO_ASSIGN_ON_CREATE",
          skipAccessCheck: true,
          activityCreatedAt: payload.clientCreatedAt,
          activityTimezone: payload.clientTimezone,
        },
        context,
      );
      if (!lead.assignedTo) {
        await queueLeadIfNeeded(lead, "NO_ACTIVE_AGENT");
      }
    }

    return lead;
  }

  return Object.freeze({
    buildCreateRecord,
    buildUpdateRecord,
    determineLeadTemperature,

    async list(filters = {}, context = {}) {
      logger.debug(
        { module: "leads", requestId: context.requestId, filters },
        "Listing leads",
      );
      const page = toPositiveInt(filters.page, 1, 1000000);
      const limit = toPositiveInt(filters.limit, 25, 50);
      const mappedFilters = {
        ...filters,
        page,
        limit,
        search: filters.search ? String(filters.search).trim() : undefined,
        quickFilter: normalizeQuickFilter(filters.quickFilter),
        status:
          filters.status ? normalizeLeadStatus(filters.status) : undefined,
        email: filters.email ? String(filters.email).trim() : undefined,
        phone: filters.phone ? String(filters.phone).trim() : undefined,
        leadId: filters.leadId ? String(filters.leadId).trim() : undefined,
        destination:
          filters.destination ? String(filters.destination).trim() : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        sla: normalizeSlaFilter(filters.sla),
        sortBy: normalizeSortBy(filters.sortBy),
      };

      const scopedFilters = await applyVisibilityScope(mappedFilters, context);
      const result = await repository.findAll(scopedFilters);
      const rows = Array.isArray(result?.items) ? result.items : [];
      const total = Number.isFinite(Number(result?.total)) ?
        Math.max(0, Number(result.total))
      : rows.length;
      const normalizedRows = rows.map((lead) => withTemperature(lead));
      const safeLimit = Number.isFinite(Number(result?.limit)) ?
        Math.max(1, Number(result.limit))
      : limit;
      const safePage = Number.isFinite(Number(result?.page)) ?
        Math.max(1, Number(result.page))
      : page;

      return {
        data: normalizedRows,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      };
    },

    async listStats(filters = {}, context = {}) {
      logger.debug(
        { module: "leads", requestId: context.requestId, filters },
        "Listing lead stats",
      );
      const mappedFilters = {
        ...filters,
        search: filters.search ? String(filters.search).trim() : undefined,
        quickFilter: normalizeQuickFilter(filters.quickFilter),
        status:
          filters.status ? normalizeLeadStatus(filters.status) : undefined,
        email: filters.email ? String(filters.email).trim() : undefined,
        phone: filters.phone ? String(filters.phone).trim() : undefined,
        leadId: filters.leadId ? String(filters.leadId).trim() : undefined,
        destination:
          filters.destination ? String(filters.destination).trim() : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        sla: normalizeSlaFilter(filters.sla),
      };

      const scopedFilters = await applyVisibilityScope(mappedFilters, context);
      return repository.findStats(scopedFilters);
    },

    async listDestinations(filters = {}, context = {}) {
      const mappedFilters = {
        search: filters.search ? String(filters.search).trim() : undefined,
        country: filters.country ? String(filters.country).trim() : undefined,
        limit: toPositiveInt(filters.limit, 200, 500),
      };

      const userId = context.user?.id || null;
      const userRole = normalizeRoleToken(context.user?.role);
      const isAgent = isAgentRole(userRole);
      const isManager = isManagerRole(userRole);

      if (isAgent && userId) {
        mappedFilters.assignedTo = userId;
        const agentCountrySet = await getUserCountrySet(userId);
        if (agentCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...agentCountrySet];
        }
      }

      if (isManager && userId) {
        const [managerCountrySet, managedAgentIds] = await Promise.all([
          getUserCountrySet(userId),
          repository.findManagedAgentIds(userId),
        ]);
        const visibleAssigneeIds = [userId, ...managedAgentIds].filter(Boolean);
        if (visibleAssigneeIds.length > 0) {
          mappedFilters.visibleAssigneeIds = [...new Set(visibleAssigneeIds)];
          mappedFilters.includeUnassigned = true;
        }
        if (managerCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...managerCountrySet];
        }
      }

      const items = await repository.findDistinctDestinations(mappedFilters);
      return { items };
    },

    async listLeadSources(filters = {}, context = {}) {
      const mappedFilters = {
        search: filters.search ? String(filters.search).trim() : undefined,
        country: filters.country ? String(filters.country).trim() : undefined,
        limit: toPositiveInt(filters.limit, 200, 200),
      };

      const userId = context.user?.id || null;
      const userRole = normalizeRoleToken(context.user?.role);
      const isAgent = isAgentRole(userRole);
      const isManager = isManagerRole(userRole);

      if (isAgent && userId) {
        mappedFilters.assignedTo = userId;
        const agentCountrySet = await getUserCountrySet(userId);
        if (agentCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...agentCountrySet];
        }
      }

      if (isManager && userId) {
        const [managerCountrySet, managedAgentIds] = await Promise.all([
          getUserCountrySet(userId),
          repository.findManagedAgentIds(userId),
        ]);
        const visibleAssigneeIds = [userId, ...managedAgentIds].filter(Boolean);
        if (visibleAssigneeIds.length > 0) {
          mappedFilters.visibleAssigneeIds = [...new Set(visibleAssigneeIds)];
          mappedFilters.includeUnassigned = true;
        }
        if (managerCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...managerCountrySet];
        }
      }

      const items = await repository.findDistinctLeadSources(mappedFilters);
      return { items };
    },

    async listPlatforms(filters = {}, context = {}) {
      const mappedFilters = {
        search: filters.search ? String(filters.search).trim() : undefined,
        country: filters.country ? String(filters.country).trim() : undefined,
        limit: toPositiveInt(filters.limit, 100, 200),
      };

      const userId = context.user?.id || null;
      const userRole = normalizeRoleToken(context.user?.role);
      const isAgent = isAgentRole(userRole);
      const isManager = isManagerRole(userRole);

      if (isAgent && userId) {
        mappedFilters.assignedTo = userId;
        const agentCountrySet = await getUserCountrySet(userId);
        if (agentCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...agentCountrySet];
        }
      }

      if (isManager && userId) {
        const [managerCountrySet, managedAgentIds] = await Promise.all([
          getUserCountrySet(userId),
          repository.findManagedAgentIds(userId),
        ]);
        const visibleAssigneeIds = [userId, ...managedAgentIds].filter(Boolean);
        if (visibleAssigneeIds.length > 0) {
          mappedFilters.visibleAssigneeIds = [...new Set(visibleAssigneeIds)];
          mappedFilters.includeUnassigned = true;
        }
        if (managerCountrySet.size > 0) {
          mappedFilters.allowedCountries = [...managerCountrySet];
        }
      }

      const items = await repository.findDistinctPlatforms(mappedFilters);
      return { items };
    },

    getById,
    async listCustomStatusPresets() {
      return repository.listCustomStatusPresets();
    },
    async addCustomStatusPreset(label, context = {}) {
      const trimmed = String(label ?? "").trim().slice(0, 191);
      if (!trimmed) {
        throw new AppError(400, "label is required", "INVALID_PRESET_LABEL");
      }
      await repository.ensureCustomStatusPreset(trimmed, context.user?.id || null);
      return repository.listCustomStatusPresets();
    },

    getById,
    create,
    assignLead,

    async createOrGetDuplicate(payload, context = {}) {
      try {
        const lead = await create(payload, context);
        return { lead, duplicate: false };
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === "LEAD_DUPLICATE" &&
          error.details?.existingLeadId
        ) {
          const lead = await getById(error.details.existingLeadId, context);
          return { lead, duplicate: true };
        }
        throw error;
      }
    },

    async distributePending(payload = {}, context = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.distributionLimit,
      );
      const pendingLeads = await repository.findUnassignedLeads({
        status: "OPEN",
        limit,
      });

      const summary = {
        processed: pendingLeads.length,
        assigned: 0,
        unassigned: 0,
        errors: [],
      };

      for (const lead of pendingLeads) {
        try {
          const result = await assignLead(
            lead.id,
            {
              force: true,
              mode: "AUTO_DISTRIBUTION",
              reason: payload.reason || "BULK_DISTRIBUTION",
            },
            context,
          );

          if (result.assignedTo) {
            summary.assigned += 1;
          } else {
            summary.unassigned += 1;
          }
        } catch (error) {
          summary.errors.push({
            leadId: lead.id,
            message: error.message,
          });
        }
      }

      events.emitDistributionRun(summary);
      return summary;
    },

    async processQueuedLeads(payload = {}, context = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.distributionLimit,
      );
      const queuedLeads = await repository.listQueuedLeads({ limit });

      if (!queuedLeads.length) {
        return { processed: 0, assigned: 0, skipped: 0 };
      }

      const summary = {
        processed: 0,
        assigned: 0,
        skipped: 0,
      };

      for (const entry of queuedLeads) {
        const leadId = entry.lead_id ?? entry.leadId ?? null;
        if (!leadId) {
          await repository.markQueuedLeadProcessed(entry.id);
          summary.processed += 1;
          continue;
        }

        const lead = await repository.findById(leadId);
        if (!lead) {
          await repository.markQueuedLeadProcessed(entry.id);
          summary.processed += 1;
          continue;
        }

        if (lead.assignedTo) {
          await repository.markQueuedLeadProcessed(entry.id);
          summary.processed += 1;
          continue;
        }

        const assigned = await assignLead(
          leadId,
          {
            force: true,
            mode: "QUEUE_ASSIGN",
            reason: payload.reason || "QUEUE_ASSIGN",
            roleName: ASSIGNMENT_ROLES.AGENT,
          },
          context,
        );

        if (assigned.assignedTo) {
          await repository.markQueuedLeadProcessed(entry.id);
          summary.processed += 1;
          summary.assigned += 1;
        } else {
          summary.skipped += 1;
        }
      }

      return summary;
    },

    async reassignInactive(payload = {}, context = {}) {
      const inactiveMinutes = toPositiveInt(
        payload.inactiveMinutes,
        AUTOMATION_DEFAULTS.inactiveMinutes,
        1440,
      );
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.distributionLimit,
      );

      const staleLeads = await repository.findOverdueAssignedLeads({
        inactiveMinutes,
        limit,
      });

      const summary = {
        processed: staleLeads.length,
        reassigned: 0,
        unchanged: 0,
        errors: [],
      };

      for (const lead of staleLeads) {
        try {
          const previousAssigneeId = lead.assignedTo;
          const updated = await assignLead(
            lead.id,
            {
              force: true,
              excludeUserId: previousAssigneeId,
              mode: "AUTO_REASSIGN",
              reason: payload.reason || "INACTIVE_ASSIGNEE_TIMEOUT",
            },
            context,
          );

          if (updated.assignedTo && updated.assignedTo !== previousAssigneeId) {
            summary.reassigned += 1;
          } else {
            summary.unchanged += 1;
          }
        } catch (error) {
          summary.errors.push({
            leadId: lead.id,
            message: error.message,
          });
        }
      }

      return summary;
    },

    async createFollowup(leadId, payload, context = {}) {
      const lead = await getById(leadId, context);
      const policy = getFollowupPolicy(lead);
      const requestedType = payload.followupType ?
        String(payload.followupType).trim().toUpperCase()
      : null;

      if (policy.callsDisabled && requestedType === "CALL") {
        throw new AppError(
          409,
          "Calls are disabled for this lead. Use WhatsApp instead.",
          "LEAD_CALLS_DISABLED",
        );
      }

      let normalizedType = requestedType;
      if (!normalizedType) {
        normalizedType = policy.callsDisabled ? "WHATSAPP" : "CALL";
      }

      if (policy.callsDisabled && normalizedType === "CALL") {
        normalizedType = "WHATSAPP";
      }

      const complianceStats = await repository.getFollowupComplianceStats(lead.id);
      if (normalizedType === "CALL" && complianceStats.calls >= FOLLOWUP_COMPLIANCE_RULES.requiredCalls) {
        throw new AppError(
          409,
          "You have reached the call limit.",
          "FOLLOWUP_LIMIT_REACHED",
          { followupType: "CALL", ...complianceStats },
        );
      }
      if (
        normalizedType === "WHATSAPP" &&
        complianceStats.whatsapp >= FOLLOWUP_COMPLIANCE_RULES.requiredWhatsapp
      ) {
        throw new AppError(
          409,
          "You have reached the WhatsApp limit.",
          "FOLLOWUP_LIMIT_REACHED",
          { followupType: "WHATSAPP", ...complianceStats },
        );
      }
      if (
        normalizedType === "FINAL_REMINDER" &&
        complianceStats.finalReminders >= FOLLOWUP_COMPLIANCE_RULES.requiredFinalReminders
      ) {
        throw new AppError(
          409,
          "You have reached the final reminder limit.",
          "FOLLOWUP_LIMIT_REACHED",
          { followupType: "FINAL_REMINDER", ...complianceStats },
        );
      }

      const wall = String(payload.followupLocalAt || "").trim();
      const tz = String(payload.clientTimezone || "").trim();
      if (!wall || !tz) {
        throw new AppError(
          400,
          "followupLocalAt and clientTimezone are required",
          "WALL_CLOCK_REQUIRED",
        );
      }

      const scheduleActivityStamp = resolveActivityStamp(payload);
      const prefs = await resolveSystemDateTimePreferences();
      const tzNorm = normalizeIANATimezone(tz) || prefs.timezone;
      const followup = await repository.createFollowup(
        normalizeFollowupStoragePayload(
          {
            leadId: lead.id,
            userId: payload.userId || context.user?.id || lead.assignedTo || null,
            followupType: normalizedType,
            followupDate: wall,
            cadenceCode: payload.cadenceCode || null,
            notes: payload.notes,
            createdAt: scheduleActivityStamp?.createdAt || null,
            clientTimezone: tzNorm,
            followupLocalAt: wall,
            isScheduleOnly: true,
            countsTowardCompliance: false,
          },
          { fallbackTimezone: prefs.timezone },
        ),
      );
      const dateTimePreferences = await resolveSystemDateTimePreferences();
      const typeLabel = String(followup.followupType || normalizedType || "FOLLOW_UP")
        .trim()
        .toUpperCase()
        .replace(/_/g, " ");
      const followupLabel =
        formatFollowupDateTime(
          followup.followupDate,
          dateTimePreferences,
          followup.clientTimezone,
        ) || String(followup.followupDate || "").trim();
      const note = String(payload.notes || "").trim();

      if (scheduleActivityStamp) {
        await repository.createActivity({
          leadId: lead.id,
          userId: context.user?.id || followup.userId || null,
          activityType: "FOLLOWUP_SCHEDULED",
          notes: [
            `Scheduled ${typeLabel} follow-up${followupLabel ? ` for ${followupLabel}` : ""}.`,
            note && !note.startsWith("AUTO_CADENCE:") ? `Note: ${note}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          createdAt: scheduleActivityStamp.createdAt,
          timezone: scheduleActivityStamp.timezone,
        });
      }

      const updatePayload = {};
      if (/^\d{4}-\d{2}-\d{2}/.test(wall)) {
        updatePayload.next_followup_date = wall.slice(0, 10);
      }

      if (Object.keys(updatePayload).length) {
        await repository.update(lead.id, updatePayload);
      }

      return followup;
    },

    async disableCalls(leadId, payload = {}, context = {}) {
      const lead = await getById(leadId, context);
      const disabled = payload.disabled ?? true;

      if (lead.callsDisabled === disabled) {
        return lead;
      }

      const nowIso = new Date().toISOString();
      const updated = await repository.update(lead.id, {
        calls_disabled: disabled,
        updated_at: nowIso,
      });

      const callsActivityStamp = resolveActivityStamp(payload);
      if (callsActivityStamp) {
        await repository.createActivity({
          leadId: lead.id,
          userId: context.user?.id || null,
          activityType: disabled ? "CALLS_DISABLED" : "CALLS_ENABLED",
          notes: payload.notes || null,
          createdAt: callsActivityStamp.createdAt,
          timezone: callsActivityStamp.timezone,
        });
      }

      const mapped = withTemperature(updated);
      events.emitUpdated(mapped);
      return mapped;
    },

    async listFollowups(leadId, context = {}) {
      const lead = await getById(leadId, context);
      const pk = String(lead?.id ?? "").trim();
      if (!pk) {
        return [];
      }
      return repository.listFollowupsByLeadId(pk);
    },

    async createLeadActivity(payload, context = {}) {
      const leadId = String(payload.lead_id || "").trim();
      if (!leadId) {
        throw new AppError(400, "lead_id is required", "LEAD_ID_REQUIRED");
      }
      await getById(leadId, context);
      return repository.createActivity({
        leadId,
        userId: context.user?.id || null,
        activityType: payload.activity_type || "USER_NOTE",
        notes: payload.notes || null,
        createdAt: payload.created_at,
        timezone: payload.timezone,
      });
    },

    async listLeadActivities(leadId, context = {}) {
      const pk = String(leadId ?? "").trim();
      await getById(pk, context);
      return repository.listActivitiesByLeadId(pk);
    },

    async processUpcomingFollowupReminders(payload = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      const lookaheadMs = toPositiveInt(
        payload.lookaheadMs,
        FOLLOWUP_REMINDER_LOOKAHEAD_MS,
        15 * 60 * 1000,
      );
      const referenceDate = payload.referenceDate
        ? new Date(payload.referenceDate)
        : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        throw new AppError(
          400,
          "referenceDate is invalid",
          "LEAD_INVALID_REFERENCE_DATE",
        );
      }

      const dateTimePreferences = await resolveSystemDateTimePreferences();
      const dueSoon = (
        await repository.findUpcomingReminderFollowups({
          limit,
          lookaheadMs,
          referenceDate: referenceDate.toISOString(),
        })
      ).filter(
        (item) => {
          const type = String(item.followupType || "").trim().toUpperCase();
          return type === "CALL" || type === "WHATSAPP";
        },
      );
      const lookaheadMinutes = Math.max(
        1,
        Math.round(lookaheadMs / (60 * 1000)),
      );

      const summary = {
        processed: dueSoon.length,
        triggered: 0,
        skipped: 0,
        followups: [],
      };

      for (const item of dueSoon) {
        const alertDate = item.followupDate ?
          toDateOnly(item.followupDate)
        : toDateOnly(referenceDate);
        const existing = await repository.findFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_REMINDER_2_MIN",
          alertDate,
        });

        if (existing) {
          summary.skipped += 1;
          continue;
        }

        const lead = item.leadId ? await repository.findById(item.leadId) : null;
        const recipientUserId = lead?.assignedTo || item.userId || null;
        if (!recipientUserId) {
          summary.skipped += 1;
          continue;
        }

        await repository.createFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_REMINDER_2_MIN",
          alertDate,
          metadata: {
            leadId: item.leadId,
            followupType: item.followupType,
            followupDate: item.followupDate,
            reminderOffsetMs: lookaheadMs,
            referenceDate: referenceDate.toISOString(),
          },
        });

        events.emitFollowupDueSoon({
          ...item,
          assignedTo: recipientUserId,
          message: buildFollowupReminderMessage(
            item,
            lead || {},
            dateTimePreferences,
            lookaheadMinutes,
          ),
          followupLabel: formatFollowupDateTime(
            item.followupDate,
            dateTimePreferences,
          ),
          referenceDate: referenceDate.toISOString(),
        });

        summary.triggered += 1;
        summary.followups.push(item);
      }

      return summary;
    },

    async listOverdueFollowups(filters = {}) {
      const limit = toPositiveInt(
        filters.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      return repository.findOverdueFollowups({ limit });
    },

    async getSystemDateTimePreferences() {
      return resolveSystemDateTimePreferences();
    },

    async processOverdueFollowups(payload = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      const referenceDate = payload.referenceDate
        ? new Date(payload.referenceDate)
        : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        throw new AppError(
          400,
          "referenceDate is invalid",
          "LEAD_INVALID_REFERENCE_DATE",
        );
      }
      const overdue = await repository.findOverdueFollowups({ limit });
      const dateTimePreferences = await resolveSystemDateTimePreferences();
      const fallbackAlertDate = toDateOnly(referenceDate);
      const summary = {
        processed: overdue.length,
        triggered: 0,
        skipped: 0,
        followups: [],
      };

      for (const item of overdue) {
        let alertDate = fallbackAlertDate;
        if (item.followupDate) {
          try {
            alertDate = toDateOnly(item.followupDate);
          } catch (_error) {
            alertDate = fallbackAlertDate;
          }
        }

        const existing = await repository.findFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_OVERDUE",
          alertDate,
        });
        if (existing) {
          summary.skipped += 1;
          continue;
        }

        const existingReminder = await repository.findFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_REMINDER_2_MIN",
          alertDate,
        });
        if (existingReminder) {
          summary.skipped += 1;
          continue;
        }

        await repository.createFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_OVERDUE",
          alertDate,
          metadata: {
            leadId: item.leadId,
            followupType: item.followupType,
            followupDate: item.followupDate,
            cadenceCode: item.cadenceCode,
            referenceDate: referenceDate.toISOString(),
          },
        });
        const followupLabel = formatFollowupDateTime(
          item.followupDate,
          dateTimePreferences,
          item.clientTimezone,
        );
        events.emitFollowupOverdue({
          ...item,
          followupLabel,
          dateTimePreferences,
          message: buildFollowupOverdueMessage(item, dateTimePreferences),
          referenceDate: referenceDate.toISOString(),
        });
        summary.triggered += 1;
        summary.followups.push(item);
      }

      return summary;
    },

    async processNonResponsive(payload = {}, context = {}) {
      const staleDays = toPositiveInt(payload.staleDays, 4, 30);
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      const candidates = await repository.findNonResponsiveCandidates({
        staleDays,
        limit,
      });

      const summary = {
        processed: candidates.length,
        marked: 0,
        skipped: 0,
        leadIds: [],
      };

      for (const lead of candidates) {
        const policy = getFollowupPolicy(lead);
        const compliance = await repository.getFollowupComplianceStats(lead.id);
        if (policy.totalRequired && compliance.total < policy.totalRequired) {
          summary.skipped += 1;
          continue;
        }
        try {
          assertFollowupCompliance(compliance, policy);
        } catch (_error) {
          summary.skipped += 1;
          continue;
        }

        const nowIso = new Date().toISOString();
        await repository.update(lead.id, {
          status: NON_RESPONSIVE_STATUS,
          sub_status: "AUTO_NON_RESPONSIVE",
          non_responsive_marked_at: nowIso,
          updated_at: nowIso,
        });

        const nonResponsiveActivityStamp = resolveActivityStamp(payload);
        if (nonResponsiveActivityStamp) {
          await repository.createActivity({
            leadId: lead.id,
            userId: context.user?.id || null,
            activityType: "LEAD_NON_RESPONSIVE",
            notes: `Auto-marked NON_RESPONSIVE after ${staleDays} day(s) and follow-up compliance`,
            createdAt: nonResponsiveActivityStamp.createdAt,
            timezone: nonResponsiveActivityStamp.timezone,
          });
        }

        events.emitEscalated({
          leadId: lead.id,
          reason: "AUTO_NON_RESPONSIVE",
          fullName: lead.fullName || lead.name || null,
          roles: ["manager", "department_head", "team_lead"],
        });

        summary.marked += 1;
        summary.leadIds.push(lead.id);
      }

      return summary;
    },

    async processCadenceAutomation(payload = {}, context = {}) {
      const staleDays = toPositiveInt(payload.staleDays, 4, 30);
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      const candidates = await repository.findCadenceCandidates({
        staleDays,
        limit,
      });

      const now = new Date();
      const summary = {
        processed: candidates.length,
        scheduled: 0,
        closedAsNonResponsive: 0,
      };

      for (const lead of candidates) {
        const existingFollowups = await repository.listFollowupsByLeadId(
          lead.id,
        );
        const existingCodes = new Set(
          existingFollowups.map((item) => item.cadenceCode).filter(Boolean),
        );
        const dueSlots = buildCadenceSlots(lead).filter(
          (slot) => slot.followupDate.getTime() <= now.getTime(),
        );

        for (const slot of dueSlots) {
          if (existingCodes.has(slot.code)) {
            continue;
          }

          const cadenceTz =
            normalizeIANATimezone(lead.clientTimezone) ||
            ianaFromLeadCountry(lead.leadCountry || lead.country) ||
            DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone;
          const cadenceLocal = localWallClockFromUtc(
            slot.followupDate,
            cadenceTz,
          );
          if (!cadenceLocal) {
            continue;
          }
          await repository.createFollowup(
            normalizeFollowupStoragePayload(
              {
                leadId: lead.id,
                userId: lead.assignedTo || context.user?.id || null,
                followupType: slot.type,
                followupDate: slot.followupDate.toISOString(),
                followupLocalAt: cadenceLocal,
                clientTimezone: cadenceTz,
                cadenceCode: slot.code,
                notes: `AUTO_CADENCE:${slot.code}`,
                isCompleted: false,
                isScheduleOnly: true,
                countsTowardCompliance: false,
              },
              { fallbackTimezone: cadenceTz },
            ),
          );
          existingCodes.add(slot.code);
          summary.scheduled += 1;
        }

        const ageDays = Math.floor(
          (now.getTime() - new Date(lead.createdAt || now).getTime()) /
            (24 * 60 * 60 * 1000),
        );
        if (ageDays < staleDays) {
          continue;
        }
        if (lead.responseAt || CLOSED_STATUSES.has(lead.status)) {
          continue;
        }

        const policy = getFollowupPolicy(lead);
        const compliance = await repository.getFollowupComplianceStats(lead.id);
        try {
          assertFollowupCompliance(compliance, policy);
        } catch (_error) {
          continue;
        }

        const nowIso = new Date().toISOString();
        await repository.update(lead.id, {
          status: NON_RESPONSIVE_STATUS,
          sub_status: "AUTO_NON_RESPONSIVE",
          non_responsive_marked_at: nowIso,
          updated_at: nowIso,
        });
        summary.closedAsNonResponsive += 1;
      }

      return summary;
    },

    async processSlaBreaches(payload = {}, context = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.slaCheckLimit,
      );
      const candidates = await repository.findSlaBreachCandidates({ limit });

      const summary = {
        processed: 0,
        breachedLeadIds: [],
        reassigned: 0,
      };

      for (const lead of candidates) {
        if (!lead.responseDeadline || !isAfterResponseDeadline(new Date().toISOString(), lead.responseDeadline)) {
          continue;
        }

        const previousAssigneeId = lead.assignedTo || null;
        await repository.markSlaBreached(lead.id);

        const slaActivityStamp = resolveActivityStamp(payload);
        if (slaActivityStamp) {
          await repository.createActivity({
            leadId: lead.id,
            userId: context.user?.id || null,
            activityType: "SLA_BREACHED",
            notes: "Lead was not first-contacted within the 15-minute response SLA.",
            createdAt: slaActivityStamp.createdAt,
            timezone: slaActivityStamp.timezone,
          });
        }

        const reassigned = await assignLead(
          lead.id,
          {
            force: true,
            excludeUserId: previousAssigneeId,
            mode: "SLA_ESCALATION",
            reason: "AGENT_ACCEPT_TIMEOUT",
            roleName: ASSIGNMENT_ROLES.AGENT,
          },
          context,
        );

        const escalatedTo = reassigned?.assignedTo || null;
        const reassignedToAnotherAgent =
          Boolean(escalatedTo) && escalatedTo !== previousAssigneeId;
        const breachMessage = reassignedToAnotherAgent
          ? "Lead SLA breached: first contact was not completed within 15 minutes. Reassigned to another agent and manager notified."
          : "Lead SLA breached: first contact was not completed within 15 minutes. No alternate agent available, lead remains queued and manager notified.";

        const managementRoles = ["manager", "department_head", "team_lead"];
        const leadLabel = lead.fullName || lead.name || null;

        events.emitSlaBreached({
          id: lead.id,
          leadId: lead.id,
          fullName: leadLabel,
          leadName: leadLabel,
          assignedTo: lead.assignedTo,
          previousAssigneeId,
          escalatedTo,
          responseDeadline: lead.responseDeadline,
          message: breachMessage,
          roles: managementRoles,
        });

        events.emitEscalated({
          leadId: lead.id,
          reason: "SLA_BREACH_15_MIN",
          previousAssigneeId,
          escalatedTo,
          fullName: leadLabel,
          leadName: leadLabel,
          message: breachMessage,
          roles: managementRoles,
        });

        summary.processed += 1;
        summary.breachedLeadIds.push(lead.id);
        if (reassigned?.assignedTo && reassigned.assignedTo !== previousAssigneeId) {
          summary.reassigned += 1;
        }
      }

      return summary;
    },

    async update(id, payload, context = {}) {
      const existing = await getById(id, context);
      const hasExplicitStatus = payload.status !== undefined;
      const nextStatus =
        hasExplicitStatus ? normalizeLeadStatus(payload.status) : existing.status;
      payload.status = nextStatus;

      if (payload.qualificationCompleted === true) {
        assertQualificationCaptured({
          leadType: payload.leadType ?? payload.type ?? existing.leadType,
          leadCountry: payload.leadCountry ?? existing.leadCountry ?? existing.country,
          nationality: payload.nationality ?? existing.nationality,
          destinationId: payload.destinationId ?? existing.destinationId,
          destinationName: payload.destinationName ?? existing.destinationName,
          travelDate: payload.travelDate ?? existing.travelDate,
          travelEndDate: payload.travelEndDate ?? existing.travelEndDate,
          adultsCount: payload.adultsCount ?? existing.adultsCount,
          childrenCount: payload.childrenCount ?? existing.childrenCount,
          budget: payload.budget ?? existing.budget,
          salary: payload.salary ?? existing.salary,
          visaRequired: payload.visaRequired ?? existing.visaRequired,
          preferredHotelCategory:
            payload.preferredHotelCategory ?? existing.preferredHotelCategory,
          travelPurpose: payload.travelPurpose ?? existing.travelPurpose,
        });
        payload.qualificationCompleted = true;
      }

      const useCustomerLinking = await repository.hasLeadCustomerColumn();
      const customerPatch = {};

      if (payload.fullName !== undefined) {
        customerPatch.fullName = payload.fullName;
      }

      if (payload.phone !== undefined) {
        customerPatch.phone = normalizePhone(payload.phone);
      }

      if (payload.email !== undefined) {
        customerPatch.email = normalizeEmail(payload.email);
      }
      if (payload.panNumber !== undefined) {
        customerPatch.panNumber = payload.panNumber;
      }
      if (payload.addressLine !== undefined) {
        customerPatch.addressLine = payload.addressLine;
      }
      if (payload.clientCurrency !== undefined) {
        customerPatch.clientCurrency = payload.clientCurrency;
      }

      const resolvedDestinationId = await resolveDestinationId(payload);
      if (resolvedDestinationId && payload.destinationId === undefined) {
        payload.destinationId = resolvedDestinationId;
      }

      if (
        useCustomerLinking &&
        Object.keys(customerPatch).length &&
        existing.customerId
      ) {
        await repository.updateCustomer(existing.customerId, customerPatch);
      }

      const mapped = buildUpdateRecord(existing, payload, {
        useCustomerLinking,
        persistStatusTransitionCustom: hasExplicitStatus,
      });

      const shouldCreateWorkflowHistory = hasExplicitStatus;
      const shouldTrackWorkflowFollowup =
        shouldCreateWorkflowHistory && WORKFLOW_COMPLIANCE_STATUSES.has(nextStatus);
      let workflowFollowupType = null;
      let workflowRecordedAt = null;
      let workflowActionTimezone = null;
      let scheduledReminder = null;
      let workflowStatusSnapshot = null;
      if (shouldCreateWorkflowHistory) {
        const workflowActionStamp = resolveActivityStamp(payload);
        scheduledReminder = await repository.findPendingScheduleOnlyFollowupByLeadId(
          id,
          { referenceDate: new Date().toISOString() },
        );
        workflowRecordedAt = workflowActionStamp?.createdAt || null;
        workflowActionTimezone = workflowActionStamp?.timezone || null;
        if (shouldTrackWorkflowFollowup) {
          const compliance = await repository.getFollowupComplianceStats(id);
          const nextAttempt = compliance.total + 1;
          const policy = getFollowupPolicy(existing);
          workflowFollowupType = deriveWorkflowFollowupType({
            requestedFollowupType: payload.followupType,
            scheduledFollowup: scheduledReminder,
            compliance,
            policy,
            subStatus: payload.subStatus,
          });
          mapped.followup_attempts = nextAttempt;
          if (!payload.subStatus && nextStatus === "FOLLOW_UP") {
            mapped.sub_status =
              workflowFollowupType === "FINAL_REMINDER" ?
                "FINAL_REMINDER"
              : `FOLLOW_UP_${Math.min(nextAttempt, 4)}`;
          }
          if (workflowFollowupType === "FINAL_REMINDER" && workflowRecordedAt) {
            mapped.final_reminder_at = workflowRecordedAt;
          }
        } else {
          const policy = getFollowupPolicy(existing);
          workflowFollowupType =
            normalizeWorkflowHistoryFollowupType(payload.followupType, policy) ||
            String(scheduledReminder?.followupType || "").trim().toUpperCase() ||
            "EMAIL";
        }
        workflowStatusSnapshot = deriveDocStatus(
          nextStatus,
          payload.subStatus ?? mapped.sub_status ?? existing.subStatus,
        );
      }

      const updated =
        Object.keys(mapped).length ?
          await repository.update(id, mapped)
        : await repository.findById(id);

      if (payload.dynamicFields !== undefined) {
        try {
          await repository.upsertLeadDynamicFields?.(id, {
            fields: payload.dynamicFields || {},
            labels: payload.dynamicFieldLabels || {},
          });
        } catch (error) {
          logger?.warn?.(
            { err: error, module: "leads", leadId: id },
            "Failed to persist dynamic lead fields update; fixed fields saved",
          );
        }
      }

      if (shouldCreateWorkflowHistory && workflowFollowupType && workflowRecordedAt) {
        const scheduledAt = scheduledReminder?.followupDate;
        const wall =
          scheduledReminder?.followupLocalAt ||
          followupInstantToWallClock(scheduledAt) ||
          workflowRecordedAt ||
          null;

        if (!wall) {
          throw new AppError(
            500,
            "Could not derive wall-clock time for workflow follow-up",
            "WALL_CLOCK_MISSING",
          );
        }

        const wfTz =
          normalizeIANATimezone(
            workflowActionTimezone || scheduledReminder?.clientTimezone || null,
          ) || DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone;

        await repository.createFollowup(
          normalizeFollowupStoragePayload(
            {
              leadId: id,
              userId:
                context.user?.id || updated?.assignedTo || existing.assignedTo || null,
              followupType: workflowFollowupType,
              followupDate: wall,
              clientTimezone: wfTz,
              followupLocalAt: wall,
              statusSnapshot: workflowStatusSnapshot,
              notes: payload.notes || null,
              isCompleted: true,
              isScheduleOnly: false,
              countsTowardCompliance: shouldTrackWorkflowFollowup,
            },
            { fallbackTimezone: wfTz },
          ),
        );

        if (scheduledReminder?.id) {
          await repository.updateFollowup(scheduledReminder.id, {
            is_completed: true,
          });
        }
      }

      /** Custom-status-only saves skip workflow rows; mirror them into follow-up history. */
      if (!hasExplicitStatus && payload.customStatusLabel !== undefined) {
        const nextCustomRaw = payload.customStatusLabel;
        const nextCustomTrimmed =
          nextCustomRaw === null || nextCustomRaw === undefined ?
            ""
          : String(nextCustomRaw).trim();
        const prevCustomTrimmed =
          existing.customStatusLabel != null ?
            String(existing.customStatusLabel).trim()
          : "";
        const userNotesTrimmed = String(payload.notes ?? "").trim();
        const customChanged =
          nextCustomTrimmed !== prevCustomTrimmed;
        const shouldLogHistory =
          !!nextCustomTrimmed && resolveActivityStamp(payload) ?
            Boolean(customChanged || userNotesTrimmed)
          : false;
        if (shouldLogHistory) {
          const customStamp = resolveActivityStamp(payload);
          const snapshotMax = 60;
          const wall = customStamp.createdAt;
          const tz = customStamp.timezone;
          const historyLines = [];
          if (userNotesTrimmed) {
            historyLines.push(userNotesTrimmed);
          }
          historyLines.push(`Custom status: ${nextCustomTrimmed}`);
          const snap =
            nextCustomTrimmed.length <= snapshotMax ?
              nextCustomTrimmed
            : `${nextCustomTrimmed.slice(0, Math.max(0, snapshotMax - 3))}...`;
          await repository.createFollowup(
            normalizeFollowupStoragePayload(
              {
                leadId: id,
                userId:
                  context.user?.id ||
                  updated?.assignedTo ||
                  existing.assignedTo ||
                  null,
                followupType: "EMAIL",
                followupDate: wall,
                clientTimezone: tz,
                followupLocalAt: wall,
                statusSnapshot: snap,
                notes: historyLines.join("\n\n"),
                isCompleted: true,
                isScheduleOnly: false,
                countsTowardCompliance: false,
              },
              { fallbackTimezone: DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone },
            ),
          );
        }
      }

      let activityNotes = "";
      if (payload.notes) {
        activityNotes = String(payload.notes).trim();
      } else if (
        !hasExplicitStatus &&
        payload.customStatusLabel !== undefined &&
        String(payload.customStatusLabel ?? "").trim()
      ) {
        activityNotes = `Custom status: ${String(payload.customStatusLabel).trim()}`;
      }

      if (activityNotes) {
        const updateActivityStamp = resolveActivityStamp(payload);
        if (updateActivityStamp) {
          await repository.createActivity({
            leadId: id,
            userId: context.user?.id,
            activityType: "LEAD_UPDATED",
            notes: activityNotes,
            createdAt: updateActivityStamp.createdAt,
            timezone: updateActivityStamp.timezone,
          });
        }
      }

      if (
        payload.customStatusLabel !== undefined &&
        String(payload.customStatusLabel ?? "").trim()
      ) {
        try {
          await repository.ensureCustomStatusPreset(
            String(payload.customStatusLabel).trim(),
            context.user?.id || null,
          );
        } catch (presetErr) {
          logger?.warn?.(
            { err: presetErr, leadId: id },
            "Could not persist global custom status preset",
          );
        }
      }

      const lead = withTemperature(updated, {
        respondedPositively: payload.respondedPositively,
      });

      if (lead.slaBreached && !existing.slaBreached) {
        const mgmt = ["manager", "department_head", "team_lead"];
        const nm = lead.fullName || lead.name || null;
        events.emitSlaBreached({
          id: lead.id,
          leadId: lead.id,
          fullName: nm,
          leadName: nm,
          assignedTo: lead.assignedTo,
          responseDeadline: lead.responseDeadline,
          message:
            "Lead SLA breached: contact happened after 15-minute response window.",
          roles: mgmt,
        });
        events.emitEscalated({
          leadId: lead.id,
          reason: "SLA_BREACH_15_MIN",
          fullName: nm,
          message:
            "Lead SLA breach auto-alert to manager due to delayed first contact.",
          roles: mgmt,
        });
      }
      events.emitUpdated(lead);
      return lead;
    },
  });
}

export { createLeadsService, LEAD_TEMPERATURE };
