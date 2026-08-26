import { randomUUID } from "node:crypto";

import { AppError } from "../../core/errors/index.js";
import {
  localWallClockFromUtc,
  normalizeIANATimezone,
  toUtc,
  utcInstantFromLocalWallClock,
  WALL_CLOCK_REGEX,
} from "../../core/datetime/timezone.js";
import {
  defaultLeadStatusWorkflow,
  toApiMainStatus,
  toApiSubStatus,
} from "./leadStatusWorkflow.config.js";

function createLeadsRepository({ db, logger, schema }) {
  const ASSIGNABLE_ROLES = new Set([
    "sales_consultant",
    "agent",
    "visa_executive",
    "holiday_consultant",
  ]);
  const MANAGER_ROLES = new Set(["manager", "department_head", "team_lead"]);
  const FOLLOWUP_TYPE_TO_DB = Object.freeze({
    CALL: 1,
    WHATSAPP: 2,
    EMAIL: 3,
    FINAL_REMINDER: 4,
    TASK: 4,
  });

  const CLOSED_LEAD_STATUSES = new Set(["CONVERTED", "LOST", "NON_RESPONSIVE"]);
  const FOLLOWUP_TYPE_FROM_DB = Object.freeze({
    1: "CALL",
    2: "WHATSAPP",
    3: "EMAIL",
    4: "FINAL_REMINDER",
  });
  const tableColumnsCache = new Map();
  const tableExistsCache = new Map();
  const mysqlColumnExistsCache = new Map();

  function isDuplicateKeyError(error) {
    const code = String(error?.code || "").toUpperCase();
    const sqlState = String(error?.sqlState || "").toUpperCase();
    const errno = Number(error?.errno);
    return (
      code === "23505" ||
      code === "ER_DUP_ENTRY" ||
      sqlState === "23000" ||
      errno === 1062
    );
  }

  /** Avoid ER_CANT_AGGREGATE_2COLLATIONS when CHAR UUID columns use mixed utf8mb4 collations. */
  const MYSQL_UUID_JOIN_COLLATE = "utf8mb4_unicode_ci";

  async function queryLeadDynamicFieldsByLeadId(leadId) {
    if (db.adapter === "mysql" && typeof db.query === "function") {
      const result = await db.query(
        "SELECT * FROM `lead_dynamic_fields` WHERE BINARY `lead_id` = BINARY ?",
        [leadId],
      );
      return result.rows || [];
    }
    return db.findMany("lead_dynamic_fields", { lead_id: leadId });
  }

  async function queryOneLeadDynamicField(leadId, fieldKey) {
    if (db.adapter === "mysql" && typeof db.query === "function") {
      const result = await db.query(
        "SELECT * FROM `lead_dynamic_fields` WHERE BINARY `lead_id` = BINARY ? AND BINARY `field_key` = BINARY ? LIMIT 1",
        [leadId, fieldKey],
      );
      return result.rows?.[0] || null;
    }
    return db.findOne("lead_dynamic_fields", {
      lead_id: leadId,
      field_key: fieldKey,
    });
  }

  function canIntrospect() {
    return (
      typeof db.query === "function" &&
      (db.adapter === "mysql" || db.adapter === "mssql")
    );
  }

  function toPositiveInt(value, fallback, max = 500) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, max);
  }

  function normalizeEmail(email) {
    if (!email) {
      return null;
    }
    // Keep case as entered so backend checks remain case-sensitive.
    return String(email).trim();
  }

  function normalizePhone(phone) {
    if (!phone) {
      return null;
    }
    const normalized = String(phone).replace(/\D/g, "");
    return normalized || null;
  }

  const LEAD_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function normalizeLeadCode(value) {
    const raw = String(value || "").trim().toUpperCase();
    return raw || null;
  }

  function formatLeadCode(serialValue) {
    let serial = Number(serialValue);
    if (!Number.isFinite(serial) || serial <= 0) {
      serial = 1;
    }
    let n = Math.floor(serial) - 1;

    const d3 = n % 10;
    n = Math.floor(n / 10);
    const l3 = n % 26;
    n = Math.floor(n / 26);

    const d2 = n % 10;
    n = Math.floor(n / 10);
    const l2 = n % 26;
    n = Math.floor(n / 26);

    const d1 = n % 10;
    n = Math.floor(n / 10);
    const l1 = n % 26;

    return `${LEAD_CODE_ALPHABET[l1]}${d1}${LEAD_CODE_ALPHABET[l2]}${d2}${LEAD_CODE_ALPHABET[l3]}${d3}`;
  }

  function parseLeadCodeSerial(value) {
    const normalized = normalizeLeadCode(value);
    if (!normalized) {
      return null;
    }
    const match = /^([A-Z])(\d)([A-Z])(\d)([A-Z])(\d)$/.exec(normalized);
    if (!match) {
      return null;
    }
    const l1 = LEAD_CODE_ALPHABET.indexOf(match[1]);
    const d1 = Number(match[2]);
    const l2 = LEAD_CODE_ALPHABET.indexOf(match[3]);
    const d2 = Number(match[4]);
    const l3 = LEAD_CODE_ALPHABET.indexOf(match[5]);
    const d3 = Number(match[6]);
    if (
      l1 < 0 ||
      l2 < 0 ||
      l3 < 0 ||
      !Number.isFinite(d1) ||
      !Number.isFinite(d2) ||
      !Number.isFinite(d3)
    ) {
      return null;
    }
    return (((((l1 * 10 + d1) * 26 + l2) * 10 + d2) * 26 + l3) * 10 + d3) + 1;
  }

  async function reserveNextLeadCodeSerial() {
    if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
      try {
        const result = await db.query(
          `SELECT nextval('leads_lead_code_seq') AS serial`,
        );
        const serial = Number(result.rows?.[0]?.serial ?? 0);
        if (Number.isFinite(serial) && serial > 0) {
          return serial;
        }
      } catch (_error) {
        // Fallback below when sequence is unavailable.
      }
    }

    const rows = await db.findMany(schema.tableName, {});
    const maxSerial = rows.reduce((currentMax, row) => {
      const serial = parseLeadCodeSerial(row?.lead_code ?? row?.leadCode ?? null);
      if (serial === null) {
        return currentMax;
      }
      return Math.max(currentMax, serial);
    }, 0);
    return maxSerial + 1;
  }

  async function assignLeadCode(leadId) {
    if (!leadId) {
      return null;
    }

    const existing = await db.findById(schema.tableName, leadId);
    if (!existing) {
      return null;
    }

    const existingLeadCode = normalizeLeadCode(
      existing.lead_code ?? existing.leadCode,
    );
    if (existingLeadCode) {
      return mapRowToDomain(existing);
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = formatLeadCode(await reserveNextLeadCodeSerial());
      try {
        const updated = await db.update(schema.tableName, leadId, {
          lead_code: candidate,
        });
        return mapRowToDomain(updated);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          continue;
        }
        if (error?.code === "42703" || error?.code === "ER_BAD_FIELD_ERROR") {
          return mapRowToDomain(existing);
        }
        throw error;
      }
    }

    return mapRowToDomain(existing);
  }

  function normalizeTextArray(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/^"|"$/g, ""))
          .filter(Boolean);
      }

      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function toDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function deriveSlaBreached(row) {
    const storedValue = row.sla_breached ?? row.slaBreached ?? false;
    const responseAt = toDate(row.response_at ?? row.responseAt ?? null);
    const responseDeadline = toDate(
      row.response_deadline ?? row.responseDeadline ?? null,
    );

    if (responseAt && responseDeadline) {
      return responseAt.getTime() > responseDeadline.getTime();
    }

    return Boolean(storedValue);
  }

  function normalizeFollowupType(value) {
    if (value === undefined || value === null) {
      return 1;
    }

    if (Number.isInteger(value) && value >= 1 && value <= 4) {
      return value;
    }

    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 4) {
      return numeric;
    }

    const mapped = FOLLOWUP_TYPE_TO_DB[String(value).trim().toUpperCase()];
    return mapped || 1;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (!columns) {
      return false;
    }
    return columns.has(String(columnName).toLowerCase());
  }

  function toCustomerDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      panNumber: row.pan_number ?? row.panNumber ?? null,
      addressLine: row.address_line ?? row.addressLine ?? null,
      clientCurrency: row.client_currency ?? row.clientCurrency ?? null,
      preferences: row.preferences ?? null,
      lifetimeValue: row.lifetime_value ?? row.lifetimeValue ?? 0,
      segment: row.segment ?? "NEW",
      isDeleted: row.is_deleted ?? row.isDeleted ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function toDestinationDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name ?? null,
      country: row.country ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function toDomain(
    row,
    customerMap = new Map(),
    assigneeMap = new Map(),
    destinationMap = new Map(),
    assignedByMap = new Map(),
  ) {
    if (!row) {
      return null;
    }

    const customerId = row.customer_id ?? row.customerId ?? null;
    const customer = customerMap.get(customerId) || row.customer || null;
    const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
    const assignee =
      assigneeMap.get(assignedTo) || row.assignee || row.assignedUser || null;
    const assignedBy = row.assigned_by ?? row.assignedBy ?? null;
    const assignedByUser = assignedByMap.get(assignedBy) || null;
    const destinationId = row.destination_id ?? row.destinationId ?? null;
    const destination = destinationMap.get(destinationId) || null;

    return {
      id: row.id,
      // Always the primary key UUID (same as id). Human-readable code is `leadCode` only.
      leadId: row.id,
      leadCode: row.lead_code ?? row.leadCode ?? null,
      customerId,
      fullName: customer?.fullName ?? row.full_name ?? row.fullName ?? null,
      phone: customer?.phone ?? row.phone ?? null,
      email: customer?.email ?? row.email ?? null,
      city: row.city ?? null,
      panNumber: customer?.panNumber ?? row.pan_number ?? row.panNumber ?? null,
      addressLine:
        customer?.addressLine ?? row.address_line ?? row.addressLine ?? null,
      clientCurrency:
        customer?.clientCurrency ??
        row.client_currency ??
        row.clientCurrency ??
        null,
      nationality: row.nationality ?? null,
      leadCountry:
        row.lead_country ?? row.leadCountry ?? row.country ?? null,
      country: row.lead_country ?? row.leadCountry ?? row.country ?? null,
      countryId: row.country_id ?? row.countryId ?? null,
      destinationId,
      destination: destination ? toDestinationDomain(destination) : null,
      destinationName: destination?.name ?? row.travel_to ?? row.travelTo ?? null,
      travelFrom: row.travel_from ?? row.travelFrom ?? null,
      travelTo:
        row.travel_to ??
        row.travelTo ??
        destination?.name ??
        null,
      travelDate: row.travel_date ?? row.travelDate ?? null,
      travelEndDate: row.travel_end_date ?? row.travelEndDate ?? null,
      budget: row.budget ?? null,
      salary: row.salary ?? null,
      adultsCount: row.adults_count ?? row.adultsCount ?? 1,
      childrenCount: row.children_count ?? row.childrenCount ?? 0,
      childAges:
        typeof row.child_ages === "string"
          ? JSON.parse(row.child_ages)
          : row.child_ages ?? row.childAges ?? [],
      visaRequired: row.visa_required ?? row.visaRequired ?? false,
      leadType: row.lead_type ?? row.leadType ?? "HOLIDAY",
      preferredHotelCategory:
        row.preferred_hotel_category ?? row.preferredHotelCategory ?? null,
      travelPurpose: row.travel_purpose ?? row.travelPurpose ?? null,
      source: row.source ?? null,
      platform: row.platform ?? null,
      campaignName: row.campaign_name ?? row.campaignName ?? null,
      adName: row.ad_name ?? row.adName ?? null,
      campaignId: row.campaign_id ?? row.campaignId ?? null,
      utmSource: row.utm_source ?? row.utmSource ?? null,
      utmMedium: row.utm_medium ?? row.utmMedium ?? null,
      utmCampaign: row.utm_campaign ?? row.utmCampaign ?? null,
      metaLeadId: row.meta_lead_id ?? row.metaLeadId ?? null,
      metaPageId: row.meta_page_id ?? row.metaPageId ?? null,
      metaFormId: row.meta_form_id ?? row.metaFormId ?? null,
      metaAdId: row.meta_ad_id ?? row.metaAdId ?? null,
      metaAdsetId: row.meta_adset_id ?? row.metaAdsetId ?? null,
      metaCampaignId: row.meta_campaign_id ?? row.metaCampaignId ?? null,
      leadScore: row.lead_score ?? row.leadScore ?? 0,
      priorityLevel: row.priority_level ?? row.priorityLevel ?? 0,
      isVip: row.is_vip ?? row.isVip ?? false,
      status: row.status,
      mainStatus: row.main_status ?? row.mainStatus ?? null,
      assignedTo,
      assignedUser:
        assignee ?
          {
            id: assignee.id ?? assignedTo,
            fullName: assignee.fullName ?? null,
            email: assignee.email ?? null,
          }
        : null,
      assignedByUser:
        assignedByUser ?
          {
            id: assignedByUser.id ?? assignedBy,
            fullName: assignedByUser.fullName ?? null,
          }
        : null,
      assignedAt: row.assigned_at ?? row.assignedAt ?? null,
      responseDeadline: row.response_deadline ?? row.responseDeadline ?? null,
      responseAt: row.response_at ?? row.responseAt ?? null,
      slaBreached: deriveSlaBreached(row),
      reassignmentCount: row.reassignment_count ?? row.reassignmentCount ?? 0,
      qualificationCompleted:
        row.qualification_completed ?? row.qualificationCompleted ?? false,
      closedReason: row.closed_reason ?? row.closedReason ?? null,
      statusTransitionCustom:
        row.status_transition_custom ?? row.statusTransitionCustom ?? null,
      customStatusLabel:
        row.custom_status_label ?? row.customStatusLabel ?? null,
      nextFollowupDate: row.next_followup_date ?? row.nextFollowupDate ?? null,
      subStatus: row.sub_status ?? row.subStatus ?? null,
      temperature: row.temperature ?? null,
      followupAttempts: row.followup_attempts ?? row.followupAttempts ?? 0,
      finalReminderAt: row.final_reminder_at ?? row.finalReminderAt ?? null,
      nonResponsiveMarkedAt:
        row.non_responsive_marked_at ?? row.nonResponsiveMarkedAt ?? null,
      callsDisabled: row.calls_disabled ?? row.callsDisabled ?? false,
      isDeleted: row.is_deleted ?? row.isDeleted ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      clientCreatedAt:
        row.client_created_at ?? row.clientCreatedAt ?? null,
      clientTimezone:
        row.client_timezone ?? row.clientTimezone ?? null,
      dynamicFields: (() => {
        const raw = row.dynamic_fields ?? row.dynamicFields;
        try {
          if (typeof raw === "string") {
            const parsed = JSON.parse(raw || "{}");
            return parsed &&
              typeof parsed === "object" &&
              !Array.isArray(parsed) ?
              parsed
            : {};
          }
          return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        } catch {
          return {};
        }
      })(),
      dynamicFieldLabels: (() => {
        const raw = row.dynamic_field_labels ?? row.dynamicFieldLabels;
        try {
          if (typeof raw === "string") {
            const parsed = JSON.parse(raw || "{}");
            return parsed &&
              typeof parsed === "object" &&
              !Array.isArray(parsed) ?
              parsed
            : {};
          }
          return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        } catch {
          return {};
        }
      })(),
    };
  }

  function coalesceBool(value, whenMissing) {
    if (value === undefined || value === null) {
      return whenMissing;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const s = value.trim().toLowerCase();
      if (s === "1" || s === "true") {
        return true;
      }
      if (s === "0" || s === "false") {
        return false;
      }
    }
    return Boolean(value);
  }

  function enrichFollowupRead(domain) {
    if (!domain) {
      return null;
    }
    const tz = normalizeIANATimezone(domain.clientTimezone);
    let followupDate = domain.followupDate;
    let utc = null;

    if (followupDate instanceof Date) {
      utc = toUtc(followupDate);
    } else if (followupDate != null && followupDate !== "") {
      const asString = String(followupDate);
      utc = toUtc(followupDate);
      if (!utc && WALL_CLOCK_REGEX.test(asString.trim()) && tz) {
        utc = utcInstantFromLocalWallClock(asString.trim(), tz);
      }
    }

    let followupDateOut = followupDate;
    if (utc && !Number.isNaN(utc.getTime())) {
      followupDateOut = utc.toISOString();
    }

    let followupLocalAt = domain.followupLocalAt;
    if (
      utc &&
      tz &&
      (!followupLocalAt || !String(followupLocalAt).trim())
    ) {
      followupLocalAt = localWallClockFromUtc(utc, tz);
    }

    const clientTimezone = tz || domain.clientTimezone;

    return {
      ...domain,
      followupDate: followupDateOut,
      followupLocalAt: followupLocalAt ?? domain.followupLocalAt,
      clientTimezone,
      activityTimezone: clientTimezone,
      activity_timezone: clientTimezone,
    };
  }

  function toFollowupDomain(row) {
    if (!row) {
      return null;
    }

    const followupType = normalizeFollowupType(
      row.followup_type ?? row.followupType,
    );

    return enrichFollowupRead({
      id: row.id,
      leadId: row.lead_id ?? row.leadId,
      userId: row.user_id ?? row.userId ?? null,
      userFullName:
        row.user_full_name ??
        row.userFullName ??
        row.user_name ??
        row.userName ??
        row.actor_name ??
        row.actorName ??
        null,
      followupType: FOLLOWUP_TYPE_FROM_DB[followupType] || "CALL",
      followupTypeCode: followupType,
      followupDate: row.followup_date ?? row.followupDate ?? null,
      cadenceCode: row.cadence_code ?? row.cadenceCode ?? null,
      statusSnapshot: row.status_snapshot ?? row.statusSnapshot ?? null,
      notes: row.notes ?? null,
      clientTimezone:
        row.client_timezone ?? row.clientTimezone ?? null,
      followupLocalAt:
        row.followup_local_at ?? row.followupLocalAt ?? null,
      isCompleted: coalesceBool(row.is_completed ?? row.isCompleted, false),
      isScheduleOnly: coalesceBool(row.is_schedule_only ?? row.isScheduleOnly, false),
      countsTowardCompliance: coalesceBool(
        row.counts_toward_compliance ?? row.countsTowardCompliance,
        true,
      ),
      createdAt: row.created_at ?? row.createdAt ?? null,
      activityCreatedAt: row.created_at ?? row.createdAt ?? null,
      activity_created_at: row.created_at ?? row.createdAt ?? null,
      activityTimezone: row.client_timezone ?? row.clientTimezone ?? null,
      activity_timezone: row.client_timezone ?? row.clientTimezone ?? null,
    });
  }

  function toAssignableUser(row, roleName) {
    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
      role: roleName ? String(roleName).toLowerCase() : null,
      managerId: row.manager_id ?? row.managerId ?? null,
      country: row.agent_country ?? row.agentCountry ?? null,
      agentType: row.agent_type ?? row.agentType ?? null,
      expertiseDestinations: normalizeTextArray(
        row.expertise_destinations ?? row.expertiseDestinations,
      ),
      isActive: row.is_active ?? row.isActive ?? true,
      isOnLeave: row.is_on_leave ?? row.isOnLeave ?? false,
      active: row.active ?? null,
      lastLogin: row.last_login ?? row.lastLogin ?? null,
      incentivePercent:
        Number(row.incentive_percent ?? row.incentivePercent ?? 0) || 0,
    };
  }

  /**
   * Prefer this for JOIN decisions: matches MySQL table name casing and does not rely on full column list cache.
   */
  async function mysqlColumnExists(tableName, columnName) {
    if (!canIntrospect()) {
      return false;
    }
    const cacheKey = `${String(tableName).toLowerCase()}|${String(columnName).toLowerCase()}`;
    if (mysqlColumnExistsCache.has(cacheKey)) {
      return mysqlColumnExistsCache.get(cacheKey);
    }
    let exists = false;
    try {
      const result = await db.query(
        `SELECT 1 AS ok FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND LOWER(TABLE_NAME) = LOWER(?)
           AND LOWER(COLUMN_NAME) = LOWER(?)
         LIMIT 1`,
        [tableName, columnName],
      );
      exists = (result.rows?.length ?? 0) > 0;
    } catch {
      exists = false;
    }
    mysqlColumnExistsCache.set(cacheKey, exists);
    return exists;
  }

  async function getTableColumns(tableName) {
    if (!canIntrospect()) {
      return null;
    }

    const cacheKey = String(tableName).toLowerCase();
    if (tableColumnsCache.has(cacheKey)) {
      return tableColumnsCache.get(cacheKey);
    }

    const result = await db.query(
      `SELECT COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
      [tableName],
    );

    const columns = new Set(
      (result.rows || []).map((row) =>
        String(row.column_name ?? row.COLUMN_NAME ?? "").toLowerCase(),
      ),
    );
    tableColumnsCache.set(cacheKey, columns);
    return columns;
  }

  async function hasTable(tableName) {
    if (!canIntrospect()) {
      return true;
    }

    if (tableExistsCache.has(tableName)) {
      return tableExistsCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [tableName],
      );
      const exists = (result.rows?.length ?? 0) > 0;
      tableExistsCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableExistsCache.set(tableName, false);
      return false;
    }
  }

  async function sanitizeForTable(tableName, payload = {}) {
    const entries = Object.entries(payload).filter(
      ([, value]) => value !== undefined,
    );
    if (!entries.length) {
      return {};
    }

    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(
      entries.filter(([key]) => columns.has(String(key).toLowerCase())),
    );
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.status) {
      mapped.status = filters.status;
    }

    if (filters.temperature) {
      mapped.temperature = filters.temperature;
    }

    if (filters.subStatus) {
      mapped.sub_status = filters.subStatus;
    }

    if (filters.mainStatus) {
      mapped.main_status = filters.mainStatus;
    }

    if (filters.leadType) {
      mapped.lead_type = filters.leadType;
    }

    if (filters.assignedTo) {
      mapped.assigned_to = filters.assignedTo;
    }

    if (filters.destinationId) {
      mapped.destination_id = filters.destinationId;
    }

    if (filters.leadCountry || filters.country) {
      mapped.lead_country = filters.leadCountry ?? filters.country;
    }

    if (filters.countryId) {
      mapped.country_id = filters.countryId;
    }

    if (filters.campaignId) {
      mapped.campaign_id = filters.campaignId;
    }

    if (filters.platform) {
      mapped.platform = String(filters.platform).trim();
    }

    if (filters.page) {
      mapped.page = filters.page;
    }

    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  function buildSortClause(sortBy) {
    const normalized = String(sortBy || "NEWEST_FIRST")
      .trim()
      .toUpperCase();
    if (normalized === "CREATED_AT_ASC" || normalized === "OLDEST_FIRST") {
      return "ORDER BY l.created_at ASC";
    }
    if (normalized === "CREATED_AT_DESC" || normalized === "NEWEST_FIRST") {
      return "ORDER BY l.created_at DESC";
    }
    if (normalized === "NAME_A_Z" || normalized === "NAME_ASC") {
      return "ORDER BY LOWER(COALESCE(NULLIF(c.full_name, ''), NULLIF(l.full_name, ''), '')) ASC, l.created_at DESC";
    }
    if (normalized === "COUNTRY_ASC") {
      return "ORDER BY LOWER(COALESCE(l.lead_country, '')), l.created_at DESC";
    }
    if (normalized === "STATUS" || normalized === "STATUS_ASC") {
      return `
        ORDER BY CASE l.status
          WHEN 'OPEN' THEN 1
          WHEN 'CONTACTED' THEN 2
          WHEN 'WIP' THEN 3
          WHEN 'QUOTED' THEN 4
          WHEN 'FOLLOW_UP' THEN 5
          WHEN 'CONVERTED' THEN 6
          WHEN 'LOST' THEN 7
          WHEN 'NON_RESPONSIVE' THEN 8
          ELSE 99
        END ASC, l.created_at DESC
      `;
    }
    return "ORDER BY l.created_at DESC";
  }

  function resolveSourceAliases(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === "meta_india") {
      return ["Meta India", "Meta India Page", "Meta INDIA Page"];
    }
    if (normalized === "meta_uae") {
      return ["Meta UAE", "Meta UAE Page"];
    }
    return [String(value).trim()];
  }

  function resolveCountryAliases(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === "uae" || normalized === "united arab emirates") {
      return ["UAE", "United Arab Emirates"];
    }
    if (normalized === "india") {
      return ["India"];
    }
    return [String(value).trim()];
  }

  function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim(),
    );
  }

  function startOfToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  async function buildMysqlLeadScope(filters = {}) {
    const hasLeadCustomerId = await mysqlColumnExists(
      schema.tableName,
      "customer_id",
    );
    const hasLeadPhoneNormalized = await mysqlColumnExists(
      schema.tableName,
      "phone_normalized",
    );
    const hasCustomerPhoneNormalized = hasLeadCustomerId ?
        await mysqlColumnExists(schema.customersTable, "phone_normalized")
      : false;
    const hasLeadSourceColumn = await mysqlColumnExists(
      schema.tableName,
      "source",
    );
    const hasPlatformColumn = await mysqlColumnExists(
      schema.tableName,
      "platform",
    );
    const hasMainStatusColumn = await mysqlColumnExists(
      schema.tableName,
      "main_status",
    );
    const quickFilter = String(filters.quickFilter || "")
      .trim()
      .toUpperCase();
    const where = ["COALESCE(l.is_deleted, 0) = 0"];
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      where.push(`l.status = ?`);
    }

    if (filters.mainStatus && hasMainStatusColumn) {
      params.push(filters.mainStatus);
      where.push(`l.main_status = ?`);
    }

    if (filters.source && hasLeadSourceColumn) {
      const sourceAliases = resolveSourceAliases(filters.source);
      if (sourceAliases.length > 1) {
        const sourcePh = sourceAliases.map(() => "?").join(", ");
        params.push(...sourceAliases);
        where.push(`l.source IN (${sourcePh})`);
      } else if (sourceAliases.length === 1) {
        params.push(sourceAliases[0]);
        where.push(`l.source = ?`);
      }
    }

    if (filters.platform && hasPlatformColumn) {
      const plat = String(filters.platform).trim();
      if (plat) {
        params.push(plat);
        where.push(`LOWER(TRIM(COALESCE(l.platform, ''))) = LOWER(?)`);
      }
    }

    if (filters.temperature) {
      params.push(filters.temperature);
      where.push(`l.temperature = ?`);
    }

    if (filters.subStatus) {
      params.push(filters.subStatus);
      where.push(`l.sub_status = ?`);
    }

    if (filters.leadType) {
      params.push(filters.leadType);
      where.push(`l.lead_type = ?`);
    } else if (filters.type) {
      params.push(filters.type);
      where.push(`l.lead_type = ?`);
    }

    if (filters.assignedTo) {
      params.push(filters.assignedTo);
      where.push(`l.assigned_to = ?`);
    }

    if (Array.isArray(filters.visibleAssigneeIds)) {
      const visibleAssigneeIds = [
        ...new Set(
          filters.visibleAssigneeIds
            .map((value) => String(value || "").trim())
            .filter(Boolean),
        ),
      ];
      if (visibleAssigneeIds.length > 0) {
        const assignPh = visibleAssigneeIds.map(() => "?").join(", ");
        params.push(...visibleAssigneeIds);
        if (filters.includeUnassigned === false) {
          where.push(`l.assigned_to IN (${assignPh})`);
        } else {
          where.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${assignPh}))`);
        }
      }
    }

    if (filters.destinationId) {
      params.push(filters.destinationId);
      where.push(`l.destination_id = ?`);
    }

    if (filters.destination) {
      const destination = String(filters.destination).trim();
      if (destination) {
        if (isUuidLike(destination)) {
          params.push(destination);
          where.push(`l.destination_id = ?`);
        } else {
          params.push(destination);
          where.push(`LOWER(COALESCE(d.name, '')) = LOWER(?)`);
        }
      }
    }

    if (filters.leadCountry || filters.country) {
      const countryAliases = resolveCountryAliases(
        filters.leadCountry ?? filters.country,
      );
      if (countryAliases.length > 1) {
        const countryPh = countryAliases.map(() => "?").join(", ");
        params.push(...countryAliases);
        where.push(`LOWER(COALESCE(l.lead_country, '')) IN (${countryPh})`);
      } else if (countryAliases.length === 1) {
        params.push(countryAliases[0]);
        where.push(`LOWER(COALESCE(l.lead_country, '')) = LOWER(?)`);
      }
    }

    if (Array.isArray(filters.allowedCountries)) {
      const allowedCountries = [
        ...new Set(
          filters.allowedCountries
            .map((value) => String(value || "").trim().toLowerCase())
            .filter(Boolean),
        ),
      ];
      if (allowedCountries.length > 0) {
        const countryPh = allowedCountries.map(() => "?").join(", ");
        params.push(...allowedCountries);
        where.push(
          filters.strictCountryScope
            ? `LOWER(COALESCE(l.lead_country, '')) IN (${countryPh})`
            : `(NULLIF(TRIM(COALESCE(l.lead_country, '')), '') IS NULL OR LOWER(COALESCE(l.lead_country, '')) IN (${countryPh}))`,
        );
      }
    }

    if (filters.countryId) {
      params.push(filters.countryId);
      where.push(`l.country_id = ?`);
    }

    if (filters.campaignId) {
      params.push(filters.campaignId);
      where.push(`l.campaign_id = ?`);
    }

    if (filters.email) {
      const normalizedEmail = String(filters.email).trim().toLowerCase();
      if (normalizedEmail) {
        const emailValue = `%${normalizedEmail}%`;
        if (hasLeadCustomerId) {
          params.push(emailValue, emailValue);
          where.push(
            `(LOWER(COALESCE(NULLIF(l.email, ''), '')) LIKE ? OR LOWER(COALESCE(c.email, '')) LIKE ?)`,
          );
        } else {
          params.push(emailValue);
          where.push(`(LOWER(COALESCE(NULLIF(l.email, ''), '')) LIKE ?)`);
        }
      }
    }

    if (filters.phone) {
      const normalizedPhone = String(filters.phone).replace(/\D/g, "");
      if (normalizedPhone) {
        const phoneLike = `%${normalizedPhone}%`;
        if (hasLeadCustomerId) {
          params.push(phoneLike, phoneLike);
          where.push(
            `(${
              hasLeadPhoneNormalized ?
                `COALESCE(NULLIF(l.phone_normalized, ''), COALESCE(NULLIF(l.phone, ''), '')) LIKE ?`
              : `COALESCE(NULLIF(l.phone, ''), '') LIKE ?`
            } OR ${
              hasCustomerPhoneNormalized ?
                `COALESCE(NULLIF(c.phone_normalized, ''), '') LIKE ?`
              : `REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '') LIKE ?`
            })`,
          );
        } else {
          params.push(phoneLike);
          where.push(
            `(${
              hasLeadPhoneNormalized ?
                `COALESCE(NULLIF(l.phone_normalized, ''), COALESCE(NULLIF(l.phone, ''), '')) LIKE ?`
              : `COALESCE(NULLIF(l.phone, ''), '') LIKE ?`
            })`,
          );
        }
      }
    }

    if (filters.leadId) {
      const leadId = String(filters.leadId).trim();
      if (leadId) {
        const leadIdLike = `%${leadId}%`;
        params.push(leadIdLike, leadIdLike, leadIdLike);
        where.push(
          `(LOWER(CAST(l.id AS CHAR)) LIKE LOWER(?) OR LOWER(COALESCE(l.lead_code, '')) LIKE LOWER(?) OR LOWER(COALESCE(l.meta_lead_id, '')) LIKE LOWER(?))`,
        );
      }
    }

    if (filters.search) {
      const rawSearch = String(filters.search).trim().toLowerCase();
      if (rawSearch) {
        const searchVal = `%${rawSearch}%`;
        const searchWhere = hasLeadCustomerId ?
            [
              `LOWER(COALESCE(c.full_name, '')) LIKE ?`,
              `LOWER(COALESCE(NULLIF(l.full_name, ''), '')) LIKE ?`,
              `LOWER(COALESCE(c.email, '')) LIKE ?`,
              `LOWER(COALESCE(NULLIF(l.email, ''), '')) LIKE ?`,
              `LOWER(COALESCE(d.name, '')) LIKE ?`,
              hasLeadSourceColumn ? `LOWER(COALESCE(l.source, '')) LIKE ?` : null,
              `LOWER(CAST(l.id AS CHAR)) LIKE ?`,
              `LOWER(COALESCE(l.lead_code, '')) LIKE ?`,
              `LOWER(COALESCE(l.meta_lead_id, '')) LIKE ?`,
            ].filter(Boolean)
          : [
              `LOWER(COALESCE(NULLIF(l.full_name, ''), '')) LIKE ?`,
              `LOWER(COALESCE(NULLIF(l.email, ''), '')) LIKE ?`,
              `LOWER(COALESCE(d.name, '')) LIKE ?`,
              hasLeadSourceColumn ? `LOWER(COALESCE(l.source, '')) LIKE ?` : null,
              `LOWER(CAST(l.id AS CHAR)) LIKE ?`,
              `LOWER(COALESCE(l.lead_code, '')) LIKE ?`,
              `LOWER(COALESCE(l.meta_lead_id, '')) LIKE ?`,
            ].filter(Boolean);
        for (let i = 0; i < searchWhere.length; i += 1) {
          params.push(searchVal);
        }
        const phoneSearch = rawSearch.replace(/\D/g, "");
        if (phoneSearch) {
          const phoneLike = `%${phoneSearch}%`;
          if (hasLeadCustomerId) {
            params.push(phoneLike, phoneLike);
            searchWhere.push(
              `(${
                hasLeadPhoneNormalized ?
                  `COALESCE(NULLIF(l.phone_normalized, ''), COALESCE(NULLIF(l.phone, ''), '')) LIKE ?`
                : `COALESCE(NULLIF(l.phone, ''), '') LIKE ?`
              } OR ${
                hasCustomerPhoneNormalized ?
                  `COALESCE(NULLIF(c.phone_normalized, ''), '') LIKE ?`
                : `REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '') LIKE ?`
              })`,
            );
          } else {
            params.push(phoneLike);
            searchWhere.push(
              `(${
                hasLeadPhoneNormalized ?
                  `COALESCE(NULLIF(l.phone_normalized, ''), COALESCE(NULLIF(l.phone, ''), '')) LIKE ?`
                : `COALESCE(NULLIF(l.phone, ''), '') LIKE ?`
              })`,
            );
          }
        }
        where.push(`(${searchWhere.join(" OR ")})`);
      }
    }

    if (filters.fromDate) {
      params.push(filters.fromDate);
      where.push(`l.created_at >= CAST(? AS DATE)`);
    }

    if (filters.toDate) {
      params.push(filters.toDate);
      where.push(`l.created_at < DATE_ADD(CAST(? AS DATE), INTERVAL 1 DAY)`);
    }

    if (filters.sla === "OVERDUE" || quickFilter === "LATE_RESPONSE") {
      where.push(
        `(COALESCE(l.sla_breached, 0) = 1 OR (l.response_at IS NULL AND l.response_deadline IS NOT NULL AND l.response_deadline < NOW()))`,
      );
    } else if (filters.sla === "PENDING") {
      where.push(
        `(l.response_at IS NULL AND l.response_deadline IS NOT NULL AND l.response_deadline >= NOW() AND COALESCE(l.sla_breached, 0) = 0)`,
      );
    } else if (filters.sla === "WITHIN_SLA") {
      where.push(
        `(l.response_at IS NOT NULL AND l.response_deadline IS NOT NULL AND l.response_at <= l.response_deadline AND COALESCE(l.sla_breached, 0) = 0)`,
      );
    }

    if (quickFilter === "ACTIVE") {
      where.push(`l.status IN ('OPEN', 'CONTACTED', 'WIP', 'QUOTED')`);
    } else if (quickFilter === "FOLLOW_UP") {
      where.push(`l.status = 'FOLLOW_UP'`);
    } else if (quickFilter === "CLOSED") {
      where.push(`l.status IN ('CONVERTED', 'LOST', 'NON_RESPONSIVE')`);
    } else if (quickFilter === "LOST") {
      where.push(`l.status = 'LOST'`);
    } else if (quickFilter !== "LATE_RESPONSE") {
      // Default "All" list: hide lost (use Lost or Closed tab)
      where.push(`l.status <> 'LOST'`);
    }

    const baseSql = [
      `FROM ${schema.tableName} l`,
      hasLeadCustomerId ?
        `LEFT JOIN ${schema.customersTable} c ON c.id COLLATE ${MYSQL_UUID_JOIN_COLLATE} = l.customer_id COLLATE ${MYSQL_UUID_JOIN_COLLATE}`
      : null,
      `LEFT JOIN ${schema.destinationsTable} d ON d.id COLLATE ${MYSQL_UUID_JOIN_COLLATE} = l.destination_id COLLATE ${MYSQL_UUID_JOIN_COLLATE}`,
      `WHERE ${where.join(" AND ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      baseSql,
      hasLeadCustomerId,
      params,
    };
  }

  function computeStatsFromItems(items = []) {
    const todayStart = startOfToday().getTime();
    let newToday = 0;
    let followupActive = 0;
    let slaBreached = 0;

    items.forEach((item) => {
      const createdAt = new Date(item.createdAt ?? 0).getTime();
      if (Number.isFinite(createdAt) && createdAt >= todayStart) {
        newToday += 1;
      }
      if (String(item.status || "").toUpperCase() === "FOLLOW_UP") {
        followupActive += 1;
      }
      if (item.slaBreached) {
        slaBreached += 1;
      }
    });

    return {
      totalLeads: items.length,
      newToday,
      followupActive,
      slaBreached,
    };
  }

  async function filterInMemoryLeadItems(filters = {}) {
    const quickFilter = String(filters.quickFilter || "")
      .trim()
      .toUpperCase();
    const mappedFilters = mapListFilters({
      ...filters,
      page: undefined,
      limit: undefined,
    });
    const rows = await db.findMany(schema.tableName, mappedFilters);
    const [customerMap, assigneeMap, destinationMap] = await Promise.all([
      loadCustomersByIds(rows.map((row) => row.customer_id ?? row.customerId)),
      loadUsersByIds(rows.map((row) => row.assigned_to ?? row.assignedTo)),
      loadDestinationsByIds(
        rows.map((row) => row.destination_id ?? row.destinationId),
      ),
    ]);

    let items = rows
      .map((row) => toDomain(row, customerMap, assigneeMap, destinationMap))
      .filter(Boolean);

    if (filters.email) {
      const normalizedEmail = String(filters.email).trim().toLowerCase();
      items = items.filter((item) =>
        String(item.email || "").toLowerCase().includes(normalizedEmail),
      );
    }

    if (filters.phone) {
      const normalizedPhone = String(filters.phone).replace(/\D/g, "");
      items = items.filter((item) =>
        String(item.phone || "").replace(/\D/g, "").includes(normalizedPhone),
      );
    }

    if (filters.leadId) {
      const leadId = String(filters.leadId).trim().toLowerCase();
      items = items.filter((item) => {
        const id = String(item.id || "").toLowerCase();
        const leadCode = String(item.leadCode || "").toLowerCase();
        const metaLeadId = String(item.metaLeadId || "").toLowerCase();
        return (
          id.includes(leadId) ||
          leadCode.includes(leadId) ||
          metaLeadId.includes(leadId)
        );
      });
    }

    if (filters.source) {
      const sourceAliases = resolveSourceAliases(filters.source).map((v) =>
        String(v).trim().toLowerCase(),
      );
      if (sourceAliases.length > 0) {
        const sourceSet = new Set(sourceAliases);
        items = items.filter((item) =>
          sourceSet.has(String(item.source || "").trim().toLowerCase()),
        );
      }
    }

    if (filters.leadCountry || filters.country) {
      const countryAliases = resolveCountryAliases(
        filters.leadCountry ?? filters.country,
      ).map((v) => String(v).trim().toLowerCase());
      if (countryAliases.length > 0) {
        const countrySet = new Set(countryAliases);
        items = items.filter((item) =>
          countrySet.has(String(item.leadCountry || item.country || "").trim().toLowerCase()),
        );
      }
    }

    if (filters.platform) {
      const plat = String(filters.platform).trim().toLowerCase();
      if (plat) {
        items = items.filter(
          (item) => String(item.platform || "").trim().toLowerCase() === plat,
        );
      }
    }

    if (filters.search) {
      const search = String(filters.search).trim().toLowerCase();
      if (search) {
        const phoneSearch = search.replace(/\D/g, "");
        items = items.filter((item) => {
          const haystack = [
            item.fullName,
            item.email,
            item.destinationName,
            item.source,
            item.id,
            item.leadCode,
            item.metaLeadId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (haystack.includes(search)) return true;
          if (!phoneSearch) return false;
          return String(item.phone || "")
            .replace(/\D/g, "")
            .includes(phoneSearch);
        });
      }
    }

    if (Array.isArray(filters.visibleAssigneeIds)) {
      const visibleAssigneeSet = new Set(
        filters.visibleAssigneeIds
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      if (visibleAssigneeSet.size > 0) {
        items = items.filter((item) => {
          if (!item.assignedTo) {
            return filters.includeUnassigned !== false;
          }
          return visibleAssigneeSet.has(String(item.assignedTo));
        });
      }
    }

    if (Array.isArray(filters.allowedCountries)) {
      const allowedCountrySet = new Set(
        filters.allowedCountries
          .map((value) => String(value || "").trim().toLowerCase())
          .filter(Boolean),
      );
      if (allowedCountrySet.size > 0) {
        items = items.filter((item) => {
          const country = String(item.leadCountry || item.country || "")
            .trim()
            .toLowerCase();
          return filters.strictCountryScope
            ? allowedCountrySet.has(country)
            : !country || allowedCountrySet.has(country);
        });
      }
    }

    if (quickFilter === "ACTIVE") {
      items = items.filter((item) =>
        ["OPEN", "CONTACTED", "WIP", "QUOTED"].includes(
          String(item.status || "").toUpperCase(),
        ),
      );
    } else if (quickFilter === "FOLLOW_UP") {
      items = items.filter(
        (item) => String(item.status || "").toUpperCase() === "FOLLOW_UP",
      );
    } else if (quickFilter === "CLOSED") {
      items = items.filter((item) =>
        ["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(
          String(item.status || "").toUpperCase(),
        ),
      );
    } else if (quickFilter === "LOST") {
      items = items.filter(
        (item) => String(item.status || "").toUpperCase() === "LOST",
      );
    } else if (quickFilter === "LATE_RESPONSE") {
      items = items.filter((item) => Boolean(item.slaBreached));
    } else {
      items = items.filter(
        (item) => String(item.status || "").toUpperCase() !== "LOST",
      );
    }

    if (filters.sla === "OVERDUE") {
      items = items.filter((item) => Boolean(item.slaBreached));
    } else if (filters.sla === "WITHIN_SLA") {
      items = items.filter(
        (item) => !item.slaBreached && Boolean(item.responseAt),
      );
    } else if (filters.sla === "PENDING") {
      items = items.filter(
        (item) =>
          !item.slaBreached &&
          !item.responseAt &&
          Boolean(item.responseDeadline),
      );
    }

    return items;
  }

  async function loadRoleLookup() {
    const roleRows = await db.findMany(schema.rolesTable, {});
    const lookup = new Map();

    roleRows.forEach((row) => {
      lookup.set(row.id, row.name);
    });

    return lookup;
  }

  async function loadCustomersByIds(customerIds = []) {
    const ids = [...new Set(customerIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.customersTable, id)),
    );
    const customerMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      customerMap.set(row.id, toCustomerDomain(row));
    });

    return customerMap;
  }

  async function loadUsersByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.usersTable, id)));
    const userMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      userMap.set(row.id, {
        id: row.id,
        fullName: row.full_name ?? row.fullName ?? null,
        email: row.email ?? null,
      });
    });

    return userMap;
  }

  async function loadDestinationsByIds(destinationIds = []) {
    const ids = [...new Set(destinationIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.destinationsTable, id)),
    );
    const destinationMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      destinationMap.set(row.id, row);
    });

    return destinationMap;
  }

  async function mapRowsToDomain(rows = []) {
    const [customerMap, assigneeMap, destinationMap, assignedByMap] = await Promise.all([
      loadCustomersByIds(rows.map((row) => row.customer_id ?? row.customerId)),
      loadUsersByIds(rows.map((row) => row.assigned_to ?? row.assignedTo)),
      loadDestinationsByIds(
        rows.map((row) => row.destination_id ?? row.destinationId),
      ),
      loadUsersByIds(rows.map((row) => row.assigned_by ?? row.assignedBy)),
    ]);
    return rows.map((row) =>
      toDomain(row, customerMap, assigneeMap, destinationMap, assignedByMap),
    );
  }

  async function mapRowToDomain(row) {
    if (!row) {
      return null;
    }
    const [customerMap, assigneeMap, destinationMap, assignedByMap] = await Promise.all([
      loadCustomersByIds([row.customer_id ?? row.customerId]),
      loadUsersByIds([row.assigned_to ?? row.assignedTo]),
      loadDestinationsByIds([row.destination_id ?? row.destinationId]),
      loadUsersByIds([row.assigned_by ?? row.assignedBy]),
    ]);
    return toDomain(row, customerMap, assigneeMap, destinationMap, assignedByMap);
  }

  async function findCustomerByContact({ email, phone }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const hasSoftDelete = await hasColumn(schema.customersTable, "is_deleted");

    if (normalizedEmail) {
      const row = await db.findOne(
        schema.customersTable,
        hasSoftDelete
          ? { email: normalizedEmail, is_deleted: false }
          : { email: normalizedEmail },
      );
      if (row) {
        return toCustomerDomain(row);
      }
    }

    if (normalizedPhone) {
      const row = await db.findOne(
        schema.customersTable,
        hasSoftDelete
          ? { phone: normalizedPhone, is_deleted: false }
          : { phone: normalizedPhone },
      );
      if (row) {
        return toCustomerDomain(row);
      }
    }

    return null;
  }

  async function createCustomer(payload = {}) {
    const hasSoftDelete = await hasColumn(schema.customersTable, "is_deleted");
    const fullName =
      payload.fullName ||
      (payload.email ? String(payload.email).split("@")[0] : null) ||
      payload.phone ||
      `Customer ${Date.now()}`;

    const customerPayload = {
      full_name: fullName,
      phone: normalizePhone(payload.phone),
      email: normalizeEmail(payload.email),
      pan_number: payload.panNumber || null,
      address_line: payload.addressLine || null,
      client_currency: payload.clientCurrency || null,
      preferences: payload.preferences || null,
      lifetime_value: payload.lifetimeValue ?? 0,
      segment: payload.segment || "NEW",
    };

    if (hasSoftDelete) {
      customerPayload.is_deleted = false;
    }

    const row = await db.insert(schema.customersTable, customerPayload);

    return toCustomerDomain(row);
  }

  async function updateCustomer(id, payload = {}) {
    if (!id) {
      return null;
    }

    const mapped = {};

    if (payload.fullName !== undefined) {
      mapped.full_name = payload.fullName;
    }

    if (payload.phone !== undefined) {
      mapped.phone = normalizePhone(payload.phone);
    }

    if (payload.email !== undefined) {
      mapped.email = normalizeEmail(payload.email);
    }

    if (payload.preferences !== undefined) {
      mapped.preferences = payload.preferences;
    }

    if (payload.lifetimeValue !== undefined) {
      mapped.lifetime_value = payload.lifetimeValue;
    }

    if (payload.segment !== undefined) {
      mapped.segment = payload.segment;
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

    if (!Object.keys(mapped).length) {
      const existing = await db.findById(schema.customersTable, id);
      return toCustomerDomain(existing);
    }

    const row = await db.update(schema.customersTable, id, mapped);
    return toCustomerDomain(row);
  }

  async function findSystemDateTimePreferences() {
    if (!schema.appSettingsTable) {
      return null;
    }

    try {
      const row = await db.findOne(schema.appSettingsTable, { key: "system" });
      const value =
        row && typeof row.value === "object" && !Array.isArray(row.value) ?
          row.value
        : {};

      return {
        timezone:
          typeof value.timezone === "string" ? value.timezone.trim() : null,
        locale: typeof value.locale === "string" ? value.locale.trim() : null,
        dateFormat:
          typeof value.dateFormat === "string" ? value.dateFormat.trim() : null,
      };
    } catch (_error) {
      return null;
    }
  }

  async function upsertLeadDynamicFields(
    leadId,
    { fields = {}, labels = {} } = {},
  ) {
    const tableName = "lead_dynamic_fields";
    const tableExists = await hasTable(tableName);
    if (!tableExists || !leadId) {
      return { upserted: 0, skipped: true };
    }

    if (!fields || typeof fields !== "object") {
      return { upserted: 0, skipped: true };
    }

    const entries = Object.entries(fields)
      .map(([key, value]) => ({
        field_key: String(key || "").trim().toLowerCase(),
        field_value: value === undefined || value === null ? null : String(value),
        field_label:
          labels && typeof labels === "object" && labels[key] ?
            String(labels[key]).trim()
          : null,
      }))
      .filter((item) => item.field_key);

    if (!entries.length) {
      return { upserted: 0, skipped: true };
    }

    let upserted = 0;

    for (const item of entries) {
      try {
        await db.insert(tableName, {
          lead_id: leadId,
          field_key: item.field_key,
          field_label: item.field_label,
          field_value: item.field_value,
        });
        upserted += 1;
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        await db.update(
          tableName,
          // db.update requires primary key for some adapters; fallback to query.
          // If adapter cannot update by filter, we skip silently.
          (await queryOneLeadDynamicField(leadId, item.field_key))?.id,
          {
            field_label: item.field_label,
            field_value: item.field_value,
          },
        ).catch(() => null);
      }
    }

    return { upserted, skipped: false };
  }

  async function mergeLeadDynamicFieldsFromChildTable(lead, leadId) {
    if (!lead || !leadId) {
      return lead;
    }
    const tableName = "lead_dynamic_fields";
    if (!(await hasTable(tableName))) {
      return lead;
    }
    try {
      const rows = await queryLeadDynamicFieldsByLeadId(leadId);
      if (!Array.isArray(rows) || rows.length === 0) {
        return lead;
      }
      const baseFields =
        lead.dynamicFields &&
        typeof lead.dynamicFields === "object" &&
        !Array.isArray(lead.dynamicFields) ?
          { ...lead.dynamicFields }
        : {};
      const baseLabels =
        lead.dynamicFieldLabels &&
        typeof lead.dynamicFieldLabels === "object" &&
        !Array.isArray(lead.dynamicFieldLabels) ?
          { ...lead.dynamicFieldLabels }
        : {};

      for (const r of rows) {
        const key = String(r.field_key ?? r.fieldKey ?? "")
          .trim()
          .toLowerCase();
        if (!key) continue;
        const label = String(r.field_label ?? r.fieldLabel ?? "").trim();
        if (label) {
          baseLabels[key] = label;
        }
        const val = r.field_value ?? r.fieldValue;
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str !== "" && (baseFields[key] === undefined || baseFields[key] === null)) {
            baseFields[key] = str;
          }
        }
      }

      return {
        ...lead,
        dynamicFields: baseFields,
        dynamicFieldLabels: baseLabels,
      };
    } catch (error) {
      logger?.warn?.(
        { err: error, leadId },
        "mergeLeadDynamicFieldsFromChildTable failed",
      );
      return lead;
    }
  }

  return Object.freeze({
    normalizeEmail,
    normalizePhone,
    normalizeFollowupType,
    findSystemDateTimePreferences,

    async findAll(filters = {}) {
      const limit = toPositiveInt(filters.limit, 25, 50);
      const page = toPositiveInt(filters.page, 1, 1000000);
      const offset = (Math.max(page, 1) - 1) * limit;

      if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
        const { baseSql, hasLeadCustomerId, params } =
          await buildMysqlLeadScope(filters);

        const countSql = [`SELECT COUNT(*) AS total`, baseSql].join("\n");
        const countResult = await db.query(countSql, params);
        const total = Number(countResult.rows?.[0]?.total || 0);

        const sortClause = hasLeadCustomerId
          ? buildSortClause(filters.sortBy)
          : filters.sortBy === "NAME_A_Z"
            ? "ORDER BY LOWER(COALESCE(NULLIF(l.full_name, ''), '')) ASC, l.created_at DESC"
            : buildSortClause(filters.sortBy);

        const dataSql = [
          `SELECT l.*`,
          baseSql,
          sortClause,
          `LIMIT ? OFFSET ?`,
        ]
          .filter(Boolean)
          .join("\n");
        const dataResult = await db.query(dataSql, [...params, limit, offset]);

        return {
          items: await mapRowsToDomain(dataResult.rows),
          total,
          page,
          limit,
        };
      }

      const items = await filterInMemoryLeadItems(filters);

      const sortedItems = [...items].sort((left, right) => {
        const leftTime = new Date(left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.createdAt ?? 0).getTime();
        const mode = String(filters.sortBy || "NEWEST_FIRST")
          .trim()
          .toUpperCase();
        if (mode === "OLDEST_FIRST") {
          return leftTime - rightTime;
        }
        if (mode === "NAME_A_Z") {
          return String(left.fullName || "")
            .toLowerCase()
            .localeCompare(String(right.fullName || "").toLowerCase());
        }
        if (mode === "STATUS") {
          return String(left.status || "")
            .toLowerCase()
            .localeCompare(String(right.status || "").toLowerCase());
        }
        return rightTime - leftTime;
      });

      const total = sortedItems.length;
      const pagedItems = sortedItems.slice(offset, offset + limit);

      return {
        items: pagedItems,
        total,
        page,
        limit,
      };
    },

    async findStats(filters = {}) {
      if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
        const { baseSql, params } = await buildMysqlLeadScope(filters);
        const statsSql = [
          `SELECT`,
          `  COUNT(*) AS total_leads,`,
          `  SUM(CASE WHEN l.created_at >= CURRENT_DATE THEN 1 ELSE 0 END) AS new_today,`,
          `  SUM(CASE WHEN l.status = 'FOLLOW_UP' THEN 1 ELSE 0 END) AS followup_active,`,
          `  SUM(CASE WHEN COALESCE(l.sla_breached, 0) = 1 THEN 1 ELSE 0 END) AS sla_breached`,
          baseSql,
        ].join("\n");
        const result = await db.query(statsSql, params);
        const row = result.rows?.[0] || {};
        return {
          totalLeads: Number(row.total_leads || 0),
          newToday: Number(row.new_today || 0),
          followupActive: Number(row.followup_active || 0),
          slaBreached: Number(row.sla_breached || 0),
        };
      }

      const items = await filterInMemoryLeadItems(filters);
      return computeStatsFromItems(items);
    },

    async findDistinctDestinations(filters = {}) {
      const limit = toPositiveInt(filters.limit, 200, 500);

      if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
        const where = [
          "COALESCE(l.is_deleted, 0) = 0",
          "NULLIF(TRIM(COALESCE(d.name, l.travel_to, '')), '') IS NOT NULL",
        ];
        const params = [];

        if (filters.country) {
          params.push(String(filters.country).trim());
          where.push(`LOWER(COALESCE(l.lead_country, '')) = LOWER(?)`);
        }

        if (filters.assignedTo) {
          params.push(filters.assignedTo);
          where.push(`l.assigned_to = ?`);
        }

        if (Array.isArray(filters.visibleAssigneeIds)) {
          const visibleAssigneeIds = [
            ...new Set(
              filters.visibleAssigneeIds
                .map((value) => String(value || "").trim())
                .filter(Boolean),
            ),
          ];
          if (visibleAssigneeIds.length > 0) {
            const assignPh = visibleAssigneeIds.map(() => "?").join(", ");
            params.push(...visibleAssigneeIds);
            if (filters.includeUnassigned === false) {
              where.push(`l.assigned_to IN (${assignPh})`);
            } else {
              where.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${assignPh}))`);
            }
          }
        }

        if (Array.isArray(filters.allowedCountries)) {
          const allowedCountries = [
            ...new Set(
              filters.allowedCountries
                .map((value) => String(value || "").trim().toLowerCase())
                .filter(Boolean),
            ),
          ];
          if (allowedCountries.length > 0) {
            const countryPh = allowedCountries.map(() => "?").join(", ");
            params.push(...allowedCountries);
            where.push(
              filters.strictCountryScope
                ? `LOWER(COALESCE(l.lead_country, '')) IN (${countryPh})`
                : `(NULLIF(TRIM(COALESCE(l.lead_country, '')), '') IS NULL OR LOWER(COALESCE(l.lead_country, '')) IN (${countryPh}))`,
            );
          }
        }

        if (filters.search) {
          const search = `%${String(filters.search).trim().toLowerCase()}%`;
          params.push(search, search);
          where.push(
            `(LOWER(COALESCE(d.name, '')) LIKE ? OR LOWER(COALESCE(l.travel_to, '')) LIKE ?)`,
          );
        }

        const sql = [
          `SELECT DISTINCT TRIM(COALESCE(d.name, l.travel_to, '')) AS destination_name`,
          `FROM ${schema.tableName} l`,
          `LEFT JOIN ${schema.destinationsTable} d ON d.id COLLATE ${MYSQL_UUID_JOIN_COLLATE} = l.destination_id COLLATE ${MYSQL_UUID_JOIN_COLLATE}`,
          `WHERE ${where.join(" AND ")}`,
          `ORDER BY destination_name ASC`,
          `LIMIT ?`,
        ].join("\n");

        const result = await db.query(sql, [...params, limit]);
        return (result.rows || [])
          .map((row) => String(row.destination_name ?? "").trim())
          .filter(Boolean);
      }

      const rows = await db.findMany(schema.tableName, {});
      const unique = new Set();
      rows.forEach((row) => {
        if (row.is_deleted === true || row.isDeleted === true) return;
        const destination = String(row.travel_to ?? row.travelTo ?? "").trim();
        if (!destination) return;
        if (
          filters.search &&
          !destination.toLowerCase().includes(String(filters.search).trim().toLowerCase())
        ) {
          return;
        }
        unique.add(destination);
      });
      return [...unique].sort((left, right) => left.localeCompare(right)).slice(0, limit);
    },

    async findDistinctLeadSources(filters = {}) {
      const limit = toPositiveInt(filters.limit, 200, 200);
      const hasSource = await mysqlColumnExists(schema.tableName, "source");
      if (!hasSource) {
        return [];
      }

      if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
        const where = [
          "COALESCE(l.is_deleted, 0) = 0",
          "NULLIF(TRIM(COALESCE(l.source, '')), '') IS NOT NULL",
        ];
        const params = [];

        if (filters.country) {
          params.push(String(filters.country).trim());
          where.push(`LOWER(COALESCE(l.lead_country, '')) = LOWER(?)`);
        }

        if (filters.assignedTo) {
          params.push(filters.assignedTo);
          where.push(`l.assigned_to = ?`);
        }

        if (Array.isArray(filters.visibleAssigneeIds)) {
          const visibleAssigneeIds = [
            ...new Set(
              filters.visibleAssigneeIds
                .map((value) => String(value || "").trim())
                .filter(Boolean),
            ),
          ];
          if (visibleAssigneeIds.length > 0) {
            const assignPh = visibleAssigneeIds.map(() => "?").join(", ");
            params.push(...visibleAssigneeIds);
            if (filters.includeUnassigned === false) {
              where.push(`l.assigned_to IN (${assignPh})`);
            } else {
              where.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${assignPh}))`);
            }
          }
        }

        if (Array.isArray(filters.allowedCountries)) {
          const allowedCountries = [
            ...new Set(
              filters.allowedCountries
                .map((value) => String(value || "").trim().toLowerCase())
                .filter(Boolean),
            ),
          ];
          if (allowedCountries.length > 0) {
            const countryPh = allowedCountries.map(() => "?").join(", ");
            params.push(...allowedCountries);
            where.push(
              filters.strictCountryScope
                ? `LOWER(COALESCE(l.lead_country, '')) IN (${countryPh})`
                : `(NULLIF(TRIM(COALESCE(l.lead_country, '')), '') IS NULL OR LOWER(COALESCE(l.lead_country, '')) IN (${countryPh}))`,
            );
          }
        }

        if (filters.search) {
          const search = `%${String(filters.search).trim().toLowerCase()}%`;
          params.push(search);
          where.push(`LOWER(TRIM(COALESCE(l.source, ''))) LIKE ?`);
        }

        const sql = [
          `SELECT DISTINCT TRIM(COALESCE(l.source, '')) AS source_name`,
          `FROM ${schema.tableName} l`,
          `WHERE ${where.join(" AND ")}`,
          `ORDER BY source_name ASC`,
          `LIMIT ?`,
        ].join("\n");

        const result = await db.query(sql, [...params, limit]);
        return (result.rows || [])
          .map((row) => String(row.source_name ?? "").trim())
          .filter(Boolean);
      }

      const rows = await db.findMany(schema.tableName, {});
      const unique = new Set();
      rows.forEach((row) => {
        if (row.is_deleted === true || row.isDeleted === true) return;
        const src = String(row.source ?? "").trim();
        if (!src) return;
        if (
          filters.search &&
          !src.toLowerCase().includes(String(filters.search).trim().toLowerCase())
        ) {
          return;
        }
        unique.add(src);
      });
      return [...unique].sort((a, b) => a.localeCompare(b)).slice(0, limit);
    },

    async findDistinctPlatforms(filters = {}) {
      const limit = toPositiveInt(filters.limit, 100, 200);
      const hasPlatform = await mysqlColumnExists(schema.tableName, "platform");
      if (!hasPlatform) {
        return [];
      }

      if ((db.adapter === "mysql" || db.adapter === "mssql") && typeof db.query === "function") {
        const where = [
          "COALESCE(l.is_deleted, 0) = 0",
          "NULLIF(TRIM(COALESCE(l.platform, '')), '') IS NOT NULL",
        ];
        const params = [];

        if (filters.country) {
          params.push(String(filters.country).trim());
          where.push(`LOWER(COALESCE(l.lead_country, '')) = LOWER(?)`);
        }

        if (filters.assignedTo) {
          params.push(filters.assignedTo);
          where.push(`l.assigned_to = ?`);
        }

        if (Array.isArray(filters.visibleAssigneeIds)) {
          const visibleAssigneeIds = [
            ...new Set(
              filters.visibleAssigneeIds
                .map((value) => String(value || "").trim())
                .filter(Boolean),
            ),
          ];
          if (visibleAssigneeIds.length > 0) {
            const assignPh = visibleAssigneeIds.map(() => "?").join(", ");
            params.push(...visibleAssigneeIds);
            if (filters.includeUnassigned === false) {
              where.push(`l.assigned_to IN (${assignPh})`);
            } else {
              where.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${assignPh}))`);
            }
          }
        }

        if (Array.isArray(filters.allowedCountries)) {
          const allowedCountries = [
            ...new Set(
              filters.allowedCountries
                .map((value) => String(value || "").trim().toLowerCase())
                .filter(Boolean),
            ),
          ];
          if (allowedCountries.length > 0) {
            const countryPh = allowedCountries.map(() => "?").join(", ");
            params.push(...allowedCountries);
            where.push(
              filters.strictCountryScope
                ? `LOWER(COALESCE(l.lead_country, '')) IN (${countryPh})`
                : `(NULLIF(TRIM(COALESCE(l.lead_country, '')), '') IS NULL OR LOWER(COALESCE(l.lead_country, '')) IN (${countryPh}))`,
            );
          }
        }

        if (filters.search) {
          const search = `%${String(filters.search).trim().toLowerCase()}%`;
          params.push(search);
          where.push(`LOWER(TRIM(COALESCE(l.platform, ''))) LIKE ?`);
        }

        const sql = [
          `SELECT DISTINCT TRIM(COALESCE(l.platform, '')) AS platform_name`,
          `FROM ${schema.tableName} l`,
          `WHERE ${where.join(" AND ")}`,
          `ORDER BY platform_name ASC`,
          `LIMIT ?`,
        ].join("\n");

        const result = await db.query(sql, [...params, limit]);
        return (result.rows || [])
          .map((row) => String(row.platform_name ?? "").trim())
          .filter(Boolean);
      }

      const rows = await db.findMany(schema.tableName, {});
      const unique = new Set();
      rows.forEach((row) => {
        if (row.is_deleted === true || row.isDeleted === true) return;
        const p = String(row.platform ?? "").trim();
        if (!p) return;
        if (
          filters.search &&
          !p.toLowerCase().includes(String(filters.search).trim().toLowerCase())
        ) {
          return;
        }
        unique.add(p);
      });
      return [...unique].sort((a, b) => a.localeCompare(b)).slice(0, limit);
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      const lead = await mapRowToDomain(row);
      if (!lead) {
        return null;
      }
      return mergeLeadDynamicFieldsFromChildTable(lead, id);
    },

    async listCustomStatusPresets() {
      const table = schema.customStatusPresetsTable;
      if (typeof db.query === "function" && (db.adapter === "mysql" || db.adapter === "mssql")) {
        try {
          const result = await db.query(
            `SELECT label FROM \`${table}\` ORDER BY label ASC`,
          );
          return (Array.isArray(result.rows) ? result.rows : [])
            .map((r) => String(r.label ?? "").trim())
            .filter(Boolean);
        } catch (err) {
          if (
            logger &&
            typeof logger.warn === "function" &&
            /doesn't exist|Unknown table/i.test(String(err.message || ""))
          ) {
            logger.warn({ err }, "lead_custom_status_presets table missing; migrate DB");
          }
          return [];
        }
      }
      try {
        const rows = await db.findMany(table, {});
        return [...rows]
          .map((r) => String(r.label ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      } catch (_e) {
        return [];
      }
    },

    async listLeadStatusWorkflow({ activeOnly = false } = {}) {
      if (typeof db.query !== "function" || !["mysql", "mssql"].includes(db.adapter)) {
        return defaultLeadStatusWorkflow();
      }

      try {
        const activeMainWhere = activeOnly ? "WHERE is_active = 1" : "";
        const activeSubWhere = activeOnly ? "WHERE s.is_active = 1 AND m.is_active = 1" : "";
        const mainResult = await db.query(
          `
            SELECT id, code, label, canonical_status, sort_order, color,
                   is_active, is_system, is_terminal, requires_sub_status,
                   requires_quotation, creates_booking, is_booking_controlled
            FROM \`${schema.leadStatusMainTable}\`
            ${activeMainWhere}
            ORDER BY sort_order ASC, label ASC
          `,
        );
        const subResult = await db.query(
          `
            SELECT s.id, s.main_status_id, m.code AS main_status_code, s.code,
                   s.label, s.sort_order, s.is_active, s.is_system, s.is_terminal
            FROM \`${schema.leadStatusSubTable}\` s
            JOIN \`${schema.leadStatusMainTable}\` m ON m.id = s.main_status_id
            ${activeSubWhere}
            ORDER BY m.sort_order ASC, s.sort_order ASC, s.label ASC
          `,
        );
        return {
          mainStatuses: (mainResult.rows || []).map(toApiMainStatus),
          subStatuses: (subResult.rows || []).map(toApiSubStatus),
        };
      } catch (err) {
        if (/doesn't exist|Unknown table|Invalid object name/i.test(String(err.message || ""))) {
          logger?.warn?.(
            { err },
            "lead status workflow tables missing; returning default workflow",
          );
          return defaultLeadStatusWorkflow();
        }
        throw err;
      }
    },

    async ensureCustomStatusPreset(label, createdBy = null) {
      const trimmed = String(label ?? "")
        .trim()
        .slice(0, 191);
      if (!trimmed) {
        return null;
      }
      const table = schema.customStatusPresetsTable;
      if (typeof db.query === "function" && (db.adapter === "mysql" || db.adapter === "mssql")) {
        try {
          const dup = await db.query(
            `SELECT id FROM \`${table}\` WHERE LOWER(TRIM(label)) = LOWER(?) LIMIT 1`,
            [trimmed],
          );
          if ((dup.rows?.length || 0) > 0) {
            return dup.rows[0];
          }
          const id = randomUUID();
          await db.query(
            `INSERT INTO \`${table}\` (id, label, created_by) VALUES (?, ?, ?)`,
            [id, trimmed, createdBy || null],
          );
          return { id, label: trimmed };
        } catch (err) {
          if (
            /Duplicate entry/i.test(String(err.message || "")) ||
            String(err.code || "") === "ER_DUP_ENTRY"
          ) {
            return null;
          }
          if (
            logger &&
            typeof logger.warn === "function" &&
            /doesn't exist|Unknown table/i.test(String(err.message || ""))
          ) {
            logger.warn({ err }, "lead_custom_status_presets insert skipped; migrate DB");
            return null;
          }
          throw err;
        }
      }
      const rows = await db.findMany(table, {});
      const exists = [...rows].find(
        (r) =>
          String(r.label ?? "").trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) {
        return exists;
      }
      return db.insert(table, {
        id: randomUUID(),
        label: trimmed,
        created_by: createdBy || null,
      });
    },

    async findDestinationById(id) {
      if (!id) {
        return null;
      }
      return db.findById(schema.destinationsTable, id);
    },

    async findDestinationByName(name) {
      if (!name) {
        return null;
      }
      const normalized = String(name).trim();
      if (!normalized) {
        return null;
      }

      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const result = await db.query(
          `SELECT * FROM ${schema.destinationsTable} WHERE LOWER(name) = LOWER(?) LIMIT 1`,
          [normalized],
        );
        return result.rows?.[0] || null;
      }

      const rows = await db.findMany(schema.destinationsTable, {});
      return (
        rows.find(
          (row) =>
            String(row.name || "").trim().toLowerCase() ===
            normalized.toLowerCase(),
        ) || null
      );
    },

    async ensureDestinationByName(name) {
      const normalized = String(name || "").trim();
      if (!normalized) {
        return null;
      }

      const existing = await this.findDestinationByName(normalized);
      if (existing) {
        return existing;
      }

      return db.insert(schema.destinationsTable, {
        name: normalized,
        is_active: true,
      });
    },

    async findDuplicateCandidate({ email, phone }) {
      const hasLeadCustomerId = await hasColumn(
        schema.tableName,
        "customer_id",
      );

      if (hasLeadCustomerId) {
        const customer = await findCustomerByContact({ email, phone });
        if (!customer?.id) {
          return null;
        }

        const leadRows = await db.findMany(schema.tableName, {
          customer_id: customer.id,
        });

        const activeRows = leadRows.filter(
          (row) => !(row.is_deleted ?? row.isDeleted ?? false),
        );
        const sortByNewest = (left, right) => {
          const leftTs = toDate(left.created_at ?? left.createdAt)?.getTime() || 0;
          const rightTs = toDate(right.created_at ?? right.createdAt)?.getTime() || 0;
          return rightTs - leftTs;
        };
        const blockingCandidate = activeRows
          .filter((row) => {
            const status = String(row.status ?? "").toUpperCase();
            return !CLOSED_LEAD_STATUSES.has(status);
          })
          .sort(sortByNewest)[0];
        const activeCandidate =
          blockingCandidate ||
          activeRows
          .sort((left, right) => {
            const leftTs =
              toDate(left.created_at ?? left.createdAt)?.getTime() || 0;
            const rightTs =
              toDate(right.created_at ?? right.createdAt)?.getTime() || 0;
            return rightTs - leftTs;
          })[0];

        if (!activeCandidate) {
          return null;
        }

        return toDomain(activeCandidate, new Map([[customer.id, customer]]));
      }

      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = normalizePhone(phone);

      if (normalizedEmail) {
        const byEmail = await db.findOne(schema.tableName, {
          email: normalizedEmail,
        });
        if (byEmail) {
          return mapRowToDomain(byEmail);
        }
      }

      if (normalizedPhone) {
        const byPhone = await db.findOne(schema.tableName, {
          phone: normalizedPhone,
        });
        if (byPhone) {
          return mapRowToDomain(byPhone);
        }
      }

      return null;
    },

    async findOrCreateCustomer(payload = {}) {
      const existing = await findCustomerByContact({
        email: payload.email,
        phone: payload.phone,
      });

      if (existing) {
        const patch = {};
        if (!existing.fullName && payload.fullName) {
          patch.fullName = payload.fullName;
        }
        if (!existing.panNumber && payload.panNumber) {
          patch.panNumber = payload.panNumber;
        }
        if (!existing.addressLine && payload.addressLine) {
          patch.addressLine = payload.addressLine;
        }
        if (!existing.clientCurrency && payload.clientCurrency) {
          patch.clientCurrency = payload.clientCurrency;
        }

        if (Object.keys(patch).length) {
          return updateCustomer(existing.id, patch);
        }
        return existing;
      }

      return createCustomer(payload);
    },

    async updateCustomer(id, payload = {}) {
      return updateCustomer(id, payload);
    },

    async hasLeadCustomerColumn() {
      return hasColumn(schema.tableName, "customer_id");
    },

    async findUserAgentCountry(userId) {
      if (!userId) return null;

      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const [hasUserCountriesTable, hasCountriesTable] = await Promise.all([
          hasTable(schema.userCountriesTable),
          hasTable(schema.countriesTable),
        ]);
        if (hasUserCountriesTable && hasCountriesTable) {
          const result = await db.query(
            `
              SELECT c.name
              FROM ${schema.userCountriesTable} uc
              INNER JOIN ${schema.countriesTable} c ON c.id = uc.country_id
              WHERE uc.user_id = ?
              ORDER BY uc.is_primary DESC, c.name ASC
              LIMIT 1
            `,
            [userId],
          );
          if (result.rows[0]?.name) {
            return result.rows[0].name;
          }
        }
      }

      const row = await db.findById(schema.usersTable, userId);
      if (!row) return null;
      return row.agent_country ?? row.agentCountry ?? null;
    },

    async findUserCountryNames(userId) {
      if (!userId) return [];
      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const [hasUserCountriesTable, hasCountriesTable] = await Promise.all([
          hasTable(schema.userCountriesTable),
          hasTable(schema.countriesTable),
        ]);
        if (hasUserCountriesTable && hasCountriesTable) {
          const result = await db.query(
            `
              SELECT c.name
              FROM ${schema.userCountriesTable} uc
              INNER JOIN ${schema.countriesTable} c ON c.id = uc.country_id
              WHERE uc.user_id = ?
              ORDER BY uc.is_primary DESC, c.name ASC
            `,
            [userId],
          );
          const countryNames = result.rows
            .map((row) => row.name)
            .filter(Boolean);
          if (countryNames.length > 0) {
            return countryNames;
          }
        }
      }

      const row = await db.findById(schema.usersTable, userId);
      const singleCountry = row?.agent_country ?? row?.agentCountry ?? null;
      return singleCountry ? [singleCountry] : [];
    },

    async findActiveAgentsByCountry(country, agentType = null) {
      if (!country && !agentType) {
        return this.findActiveAssignableUsers('agent');
      }

      const normalizedCountry = country ? String(country).trim().toLowerCase() : null;
      const normalizedType = agentType ? String(agentType).trim().toUpperCase() : null;
      
      // Use database-level filtering for better performance
      if (db.adapter === 'mysql' && normalizedCountry) {
        const typeCondition = normalizedType
          ? `AND (u.agent_type = ? OR u.agent_type = 'BOTH')`
          : "";

        const params = normalizedType
          ? [normalizedCountry, normalizedType]
          : [normalizedCountry];

        const query = `
          SELECT u.*, r.name as role_name
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.rolesTable} r ON u.role_id = r.id
          WHERE u.is_active = 1
            AND COALESCE(u.is_on_leave, 0) = 0
            AND LOWER(u.agent_country) = ?
            AND r.name IN ('agent', 'sales_consultant', 'visa_executive', 'holiday_consultant')
            ${typeCondition}
          ORDER BY u.id ASC
        `;
        
        try {
          const result = await db.query(query, params);
          return result.rows.map(row => toAssignableUser(row, row.role_name));
        } catch (error) {
          logger.error({ err: error }, 'Error in findActiveAgentsByCountry, falling back');
          // Fallback to in-memory filtering
        }
      }

      // Fallback: In-memory filtering
      const [users, roleLookup] = await Promise.all([
        db.findMany(schema.usersTable, {}),
        loadRoleLookup(),
      ]);

      const activeUsers = users
        .filter((row) => {
          const isActive = row.is_active ?? row.isActive ?? true;
          const isOnLeave = row.is_on_leave ?? row.isOnLeave ?? false;
          if (!isActive || isOnLeave) {
            return false;
          }

          const roleId = row.role_id ?? row.roleId ?? null;
          const roleFromUser = row.role ? String(row.role).toLowerCase() : null;
          const roleFromLookup = roleLookup.get(roleId);
          const roleName =
            roleFromUser ||
            (roleFromLookup ? String(roleFromLookup).toLowerCase() : null);
          
          if (!ASSIGNABLE_ROLES.has(roleName)) {
            return false;
          }

          // Country filter
          if (normalizedCountry) {
            const agentCountry = row.agent_country ?? row.agentCountry ?? null;
            const normalizedAgentCountry = agentCountry 
              ? String(agentCountry).trim().toLowerCase()
              : null;
            if (!normalizedAgentCountry || normalizedAgentCountry !== normalizedCountry) {
              return false;
            }
          }

          // Agent type filter
          if (normalizedType) {
            const agentTypeValue = row.agent_type ?? row.agentType ?? null;
            const normalizedAgentType = agentTypeValue
              ? String(agentTypeValue).trim().toUpperCase()
              : null;
            if (!normalizedAgentType || 
                (normalizedAgentType !== normalizedType && normalizedAgentType !== 'BOTH')) {
              return false;
            }
          }

          return true;
        })
        .map((row) => {
          const roleId = row.role_id ?? row.roleId ?? null;
          const roleFromUser = row.role ? String(row.role).toLowerCase() : null;
          const roleFromLookup = roleLookup.get(roleId);
          const roleName =
            roleFromUser ||
            (roleFromLookup ? String(roleFromLookup).toLowerCase() : null);
          return toAssignableUser(row, roleName);
        });

      return activeUsers;
    },

    async findActiveAssignableUsers(roleName = null) {
      const [users, roleLookup] = await Promise.all([
        db.findMany(schema.usersTable, {}),
        loadRoleLookup(),
      ]);

      const normalizedRole = roleName ?
        String(roleName).trim().toLowerCase()
      : null;

      const activeUsers = users
        .filter((row) => {
          const isActive = row.is_active ?? row.isActive ?? true;
          const isOnLeave = row.is_on_leave ?? row.isOnLeave ?? false;
          return (
            Boolean(isActive) &&
            !Boolean(isOnLeave)
          );
        })
        .map((row) => {
          const roleId = row.role_id ?? row.roleId ?? null;
          const roleFromUser = row.role ? String(row.role).toLowerCase() : null;
          const roleFromLookup = roleLookup.get(roleId);
          const roleName =
            roleFromUser ||
            (roleFromLookup ? String(roleFromLookup).toLowerCase() : null);
          return toAssignableUser(row, roleName);
        });

      if (normalizedRole) {
        if (normalizedRole === "agent") {
          return activeUsers.filter((user) => ASSIGNABLE_ROLES.has(user.role));
        }
        if (normalizedRole === "manager") {
          return activeUsers.filter((user) => MANAGER_ROLES.has(user.role));
        }
        return activeUsers.filter((user) => user.role === normalizedRole);
      }

      const preferred = activeUsers.filter((user) =>
        ASSIGNABLE_ROLES.has(user.role),
      );
      return preferred.length ? preferred : activeUsers;
    },

    async findManagedAgentIds(managerId) {
      if (!managerId) return [];
      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const hasParentId = await hasColumn(schema.usersTable, "parent_id");
        if (hasParentId) {
          const result = await db.query(
            `
              SELECT id
              FROM ${schema.usersTable}
              WHERE COALESCE(parent_id, manager_id) = ?
            `,
            [managerId],
          );
          return result.rows.map((row) => row.id).filter(Boolean);
        }
      }
      const users = await db.findMany(schema.usersTable, {
        manager_id: managerId,
      });
      return users
        .map((row) => row.id)
        .filter(Boolean);
    },

    async findAssignableUserById(userId) {
      if (!userId) return null;
      const [row, roleLookup] = await Promise.all([
        db.findById(schema.usersTable, userId),
        loadRoleLookup(),
      ]);
      if (!row) return null;
      const roleId = row.role_id ?? row.roleId ?? null;
      const roleFromUser = row.role ? String(row.role).toLowerCase() : null;
      const roleFromLookup = roleLookup.get(roleId);
      const roleName =
        roleFromUser || (roleFromLookup ? String(roleFromLookup).toLowerCase() : null);
      return toAssignableUser(row, roleName);
    },

    async findUserDisplayNameById(userId) {
      if (!userId) return null;
      const row = await db.findById(schema.usersTable, userId);
      if (!row) return null;
      return (
        row.full_name ??
        row.fullName ??
        row.name ??
        row.email ??
        null
      );
    },

    async getOpenLeadLoadByUserIds(userIds = []) {
      const idSet = new Set(userIds);
      const load = {};

      userIds.forEach((id) => {
        load[id] = 0;
      });

      if (!idSet.size) {
        return load;
      }

      const openLeads = await db.findMany(schema.tableName, { status: "OPEN" });

      openLeads.forEach((row) => {
        const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
        if (assignedTo && idSet.has(assignedTo)) {
          load[assignedTo] = (load[assignedTo] || 0) + 1;
        }
      });

      return load;
    },

    async findLatestAssignedUserId(userIds = []) {
      const idSet = new Set(userIds);
      if (!idSet.size) {
        return null;
      }

      const rows = await db.findMany(schema.tableName, {});
      const relevant = rows
        .map((row) => ({
          assignedTo: row.assigned_to ?? row.assignedTo ?? null,
          assignedAt: row.assigned_at ?? row.assignedAt ?? null,
        }))
        .filter(
          (row) =>
            row.assignedTo && row.assignedAt && idSet.has(row.assignedTo),
        )
        .sort((a, b) => {
          const left = toDate(a.assignedAt)?.getTime() || 0;
          const right = toDate(b.assignedAt)?.getTime() || 0;
          return right - left;
        });

      return relevant[0]?.assignedTo || null;
    },

    async findUnassignedLeads({ limit = 50, status = "OPEN" } = {}) {
      const normalizedLimit = toPositiveInt(limit, 50);
      const rows = await db.findMany(schema.tableName, { status });

      const list = rows
        .filter((row) => !(row.assigned_to ?? row.assignedTo))
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(list);
    },

    async enqueueLead({ leadId, reason } = {}) {
      if (!leadId) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }

      const payload = {
        lead_id: leadId,
        reason: reason || null,
        queued_at: new Date().toISOString(),
      };

      try {
        return await db.insert(tableName, payload);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return db.findOne(tableName, { lead_id: leadId });
        }
        throw error;
      }
    },

    async listQueuedLeads({ limit = 50 } = {}) {
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return [];
      }
      const normalizedLimit = toPositiveInt(limit, 50);

      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const result = await db.query(
          `SELECT * FROM ${tableName} WHERE processed_at IS NULL ORDER BY queued_at ASC LIMIT ?`,
          [normalizedLimit],
        );
        return result.rows || [];
      }

      const rows = await db.findMany(tableName, {});
      return rows
        .filter((row) => !(row.processed_at ?? row.processedAt))
        .sort((left, right) => {
          const leftTime = toDate(left.queued_at ?? left.queuedAt)?.getTime() || 0;
          const rightTime = toDate(right.queued_at ?? right.queuedAt)?.getTime() || 0;
          return leftTime - rightTime;
        })
        .slice(0, normalizedLimit);
    },

    async markQueuedLeadProcessed(id) {
      if (!id) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }
      return db.update(tableName, id, {
        processed_at: new Date().toISOString(),
      });
    },

    async markQueuedLeadProcessedByLeadId(leadId) {
      if (!leadId) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }
      const existing = await db.findOne(tableName, { lead_id: leadId });
      if (!existing) {
        return null;
      }
      return db.update(tableName, existing.id, {
        processed_at: new Date().toISOString(),
      });
    },

    async findOverdueAssignedLeads({ inactiveMinutes = 15, limit = 50 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 50);
      const minutes = toPositiveInt(inactiveMinutes, 15, 1440);
      const cutoff = Date.now() - minutes * 60 * 1000;

      const [leadRows, activityRows] = await Promise.all([
        db.findMany(schema.tableName, { status: "OPEN" }),
        db.findMany(schema.activitiesTable, {}),
      ]);

      const latestActivityByLeadAndUser = new Map();

      activityRows.forEach((activity) => {
        const leadId = activity.lead_id ?? activity.leadId;
        const userId = activity.user_id ?? activity.userId;
        const createdAt = activity.created_at ?? activity.createdAt;
        if (!leadId || !userId || !createdAt) {
          return;
        }

        const date = toDate(createdAt);
        if (!date) {
          return;
        }

        const key = `${leadId}:${userId}`;
        const existing = latestActivityByLeadAndUser.get(key);
        if (!existing || existing.getTime() < date.getTime()) {
          latestActivityByLeadAndUser.set(key, date);
        }
      });

      const staleLeads = leadRows
        .filter((row) => {
          const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
          const assignedAtRaw = row.assigned_at ?? row.assignedAt ?? null;
          const responseAt = row.response_at ?? row.responseAt ?? null;

          if (!assignedTo || !assignedAtRaw || responseAt) {
            return false;
          }

          const assignedAt = toDate(assignedAtRaw);
          if (!assignedAt || assignedAt.getTime() > cutoff) {
            return false;
          }

          const key = `${row.id}:${assignedTo}`;
          const latestActivity = latestActivityByLeadAndUser.get(key);
          if (!latestActivity) {
            return true;
          }

          return latestActivity.getTime() <= assignedAt.getTime();
        })
        .sort((a, b) => {
          const left = toDate(a.assigned_at ?? a.assignedAt)?.getTime() || 0;
          const right = toDate(b.assigned_at ?? b.assignedAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(staleLeads);
    },

    async findSlaBreachCandidates({ limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      if (db.adapter === "mysql" || db.adapter === "mssql") {
        const result = await db.query(
          `
            SELECT *
            FROM ${schema.tableName}
            WHERE status NOT IN ('CONVERTED', 'LOST')
              AND COALESCE(sla_breached, 0) = 0
              AND response_at IS NULL
              AND response_deadline IS NOT NULL
              AND response_deadline < CURRENT_TIMESTAMP
            ORDER BY response_deadline ASC
            LIMIT ?
          `,
          [normalizedLimit],
        );
        return mapRowsToDomain(result.rows || []);
      }

      const now = Date.now();

      const rows = await db.findMany(schema.tableName, {});

      const breached = rows
        .filter((row) => {
          const status = row.status;
          const responseAt = row.response_at ?? row.responseAt ?? null;
          const responseDeadline =
            row.response_deadline ?? row.responseDeadline ?? null;
          const slaBreached = row.sla_breached ?? row.slaBreached ?? false;

          if (status === "CONVERTED" || status === "LOST") {
            return false;
          }

          if (responseAt || slaBreached) {
            return false;
          }

          const deadline = toDate(responseDeadline);
          if (!deadline) {
            return false;
          }

          return deadline.getTime() < now;
        })
        .sort((a, b) => {
          const left =
            toDate(a.response_deadline ?? a.responseDeadline)?.getTime() || 0;
          const right =
            toDate(b.response_deadline ?? b.responseDeadline)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(breached);
    },

    async findNonResponsiveCandidates({ staleDays = 4, limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const normalizedStaleDays = toPositiveInt(staleDays, 4, 30);
      const cutoff = Date.now() - normalizedStaleDays * 24 * 60 * 60 * 1000;

      const rows = await db.findMany(schema.tableName, {});
      const candidates = rows
        .filter((row) => {
          const status = String(row.status || "").toUpperCase();
          if (["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(status)) {
            return false;
          }

          const responseAt = row.response_at ?? row.responseAt ?? null;
          if (responseAt) {
            return false;
          }

          const markedAt =
            row.non_responsive_marked_at ?? row.nonResponsiveMarkedAt ?? null;
          if (markedAt) {
            return false;
          }

          const createdAt = toDate(row.created_at ?? row.createdAt);
          if (!createdAt || createdAt.getTime() > cutoff) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(candidates);
    },

    async markSlaBreached(id) {
      const row = await db.update(schema.tableName, id, { sla_breached: true });
      return mapRowToDomain(row);
    },

    async create(payload) {
      logger.debug(
        { module: "leads", payload, payloadKeys: Object.keys(payload) },
        "Creating lead - raw payload",
      );

      // Generate lead_code before insert since it's NOT NULL
      if (!payload.lead_code) {
        const serial = await reserveNextLeadCodeSerial();
        payload.lead_code = formatLeadCode(serial);
        logger.debug(
          { module: "leads", leadCode: payload.lead_code, serial },
          "Generated lead_code",
        );
      }

      const sanitized = await sanitizeForTable(schema.tableName, payload);
      logger.debug(
        { module: "leads", finalPayload: sanitized, keys: Object.keys(sanitized) },
        "Final payload before insert",
      );
      const row = await db.insert(schema.tableName, sanitized);
      return mapRowToDomain(row);
    },

    async ensureLeadCode(leadId) {
      return assignLeadCode(leadId);
    },

    async update(id, payload) {
      logger.debug({ module: "leads", id, payload }, "Updating lead");
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.update(schema.tableName, id, sanitized);
      return mapRowToDomain(row);
    },

    upsertLeadDynamicFields,

    async createAssignmentHistory(payload = {}) {
      const tableName = schema.assignmentHistoryTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }
      const sanitized = await sanitizeForTable(tableName, {
        lead_id: payload.leadId,
        previous_assignee_id: payload.previousAssigneeId || null,
        new_assignee_id: payload.newAssigneeId || null,
        assigned_by: payload.assignedBy || null,
        mode: payload.mode || null,
        reason: payload.reason || null,
      });
      if (!Object.keys(sanitized).length) {
        return null;
      }
      return db.insert(tableName, sanitized);
    },

    async createActivity(payload) {
      const createdAt = payload.createdAt ?? payload.created_at ?? null;
      const rawTz = payload.timezone ?? payload.clientTimezone ?? null;
      const timezone =
        normalizeIANATimezone(rawTz) || String(rawTz ?? "").trim() || null;
      if (!createdAt || !timezone) {
        throw new AppError(
          400,
          "createdAt and timezone are required for lead activities",
          "ACTIVITY_WALL_CLOCK_REQUIRED",
        );
      }
      if (typeof db.query === "function") {
        const result = await db.query(
          `
            INSERT INTO \`${schema.activitiesTable}\`
              (lead_id, user_id, activity_type, notes, created_at, timezone)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            payload.leadId,
            payload.userId || null,
            payload.activityType,
            payload.notes || null,
            createdAt,
            timezone,
          ],
        );
        return result?.rows?.[0] || null;
      }
      return db.insert(schema.activitiesTable, {
        lead_id: payload.leadId,
        user_id: payload.userId || null,
        activity_type: payload.activityType,
        notes: payload.notes || null,
        created_at: createdAt,
        timezone,
      });
    },

    async listActivitiesByLeadId(leadId) {
      const id = String(leadId ?? "").trim();
      if (!id) {
        return [];
      }
      if (typeof db.query === "function") {
        const result = await db.query(
          `
            SELECT *
            FROM \`${schema.activitiesTable}\`
            WHERE lead_id = ?
            ORDER BY created_at DESC
          `,
          [id],
        );
        return Array.isArray(result.rows) ? result.rows : [];
      }
      const rows = await db.findMany(schema.activitiesTable, {
        lead_id: id,
      });
      return Array.isArray(rows) ? rows : [];
    },

    async findIdsByAssignee(userId) {
      const normalizedUserId = String(userId ?? "").trim();
      if (!normalizedUserId) {
        return [];
      }

      if (typeof db.query === "function") {
        const result = await db.query(
          `SELECT id FROM \`${schema.tableName}\` WHERE assigned_to = ? AND COALESCE(is_deleted, 0) = 0`,
          [normalizedUserId],
        );
        return (Array.isArray(result?.rows) ? result.rows : [])
          .map((row) => row.id)
          .filter(Boolean);
      }

      const rows = await db.findMany(schema.tableName, {
        assigned_to: normalizedUserId,
      });
      return (Array.isArray(rows) ? rows : [])
        .filter((row) => !(row.is_deleted ?? row.isDeleted))
        .map((row) => row.id)
        .filter(Boolean);
    },

    async createFollowup(payload) {
      const sanitized = await sanitizeForTable(schema.followupsTable, {
        lead_id: payload.leadId,
        user_id: payload.userId || null,
        followup_type: normalizeFollowupType(payload.followupType),
        followup_date: payload.followupDate,
        cadence_code: payload.cadenceCode || null,
        status_snapshot: payload.statusSnapshot || null,
        notes: payload.notes || null,
        created_at: payload.createdAt || payload.created_at || null,
        client_timezone: payload.clientTimezone || null,
        followup_local_at: payload.followupLocalAt || null,
        is_completed: payload.isCompleted ?? false,
        is_schedule_only: payload.isScheduleOnly ?? false,
        counts_toward_compliance: payload.countsTowardCompliance ?? true,
      });
      const row = await db.insert(schema.followupsTable, sanitized);

      return toFollowupDomain(row);
    },

    async updateFollowup(id, payload = {}) {
      if (!id) {
        return null;
      }
      const sanitized = await sanitizeForTable(schema.followupsTable, payload);
      if (!Object.keys(sanitized).length) {
        const existing = await db.findById(schema.followupsTable, id);
        return existing ? toFollowupDomain(existing) : null;
      }
      const row = await db.update(schema.followupsTable, id, sanitized);
      return toFollowupDomain(row);
    },

    async findOverdueFollowups({ limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const now = Date.now();

      const rows = await db.findMany(schema.followupsTable, {});
      const overdue = rows
        .filter((row) => {
          const followup = toFollowupDomain(row);
          if (!followup?.isScheduleOnly || followup.isCompleted) {
            return false;
          }

          const due = toDate(followup.followupDate);
          return due && due.getTime() <= now;
        })
        .sort((a, b) => {
          const left =
            toDate(a.followup_date ?? a.followupDate)?.getTime() || 0;
          const right =
            toDate(b.followup_date ?? b.followupDate)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return overdue.map((row) => toFollowupDomain(row));
    },

    async listFollowupsByLeadId(leadId) {
      const normalizedLeadId = String(leadId ?? "").trim();
      if (!normalizedLeadId) {
        return [];
      }

      let rows;
      if (
        typeof db.query === "function" &&
        (db.adapter === "mysql" || db.adapter === "mssql")
      ) {
        const table = schema.followupsTable;
        const result = await db.query(
          `
            SELECT *
            FROM \`${table}\`
            WHERE lead_id = ?
            ORDER BY followup_date DESC, created_at DESC
          `,
          [normalizedLeadId],
        );
        rows = Array.isArray(result.rows) ? result.rows : [];
      } else {
        rows = await db.findMany(schema.followupsTable, {
          lead_id: normalizedLeadId,
        });
      }

      const followups = rows
        .map((row) => toFollowupDomain(row))
        .filter(Boolean);
      const userMap = await loadUsersByIds(
        followups.map((item) => item.userId),
      );

      return followups.map((item) => ({
        ...item,
        userFullName:
          item.userFullName || userMap.get(item.userId)?.fullName || null,
      }));
    },

    async findPendingScheduleOnlyFollowupByLeadId(
      leadId,
      { referenceDate = new Date().toISOString() } = {},
    ) {
      if (!leadId) {
        return null;
      }

      const rows = await db.findMany(schema.followupsTable, { lead_id: leadId });
      const referenceTime = toDate(referenceDate)?.getTime() ?? Date.now();
      const candidates = rows
        .map((row) => toFollowupDomain(row))
        .filter((item) => item?.isScheduleOnly && !item.isCompleted);

      candidates.sort((left, right) => {
        const leftTime = toDate(left.followupDate)?.getTime() ?? 0;
        const rightTime = toDate(right.followupDate)?.getTime() ?? 0;
        const leftBucket = leftTime <= referenceTime ? 0 : 1;
        const rightBucket = rightTime <= referenceTime ? 0 : 1;

        if (leftBucket !== rightBucket) {
          return leftBucket - rightBucket;
        }

        if (leftBucket === 0) {
          return rightTime - leftTime;
        }

        return leftTime - rightTime;
      });

      return candidates[0] || null;
    },

    async findUpcomingReminderFollowups({
      limit = 100,
      lookaheadMs = 5 * 60 * 1000,
      referenceDate = new Date().toISOString(),
    } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const referenceTime = toDate(referenceDate)?.getTime() ?? Date.now();
      const advanceMs = Math.max(60_000, Number(lookaheadMs) || 5 * 60 * 1000);
      /** Fire once when due time is between (advance-1min] and advance from "now" (≈5 min before due). */
      const bandLowMs = advanceMs - 60 * 1000;
      const bandHighMs = advanceMs;
      const rows = await db.findMany(schema.followupsTable, {});

      const dueSoon = rows
        .map((row) => toFollowupDomain(row))
        .filter((item) => {
          if (!item?.isScheduleOnly || item.isCompleted) {
            return false;
          }
          const dueTime = toDate(item.followupDate)?.getTime();
          if (!Number.isFinite(dueTime)) {
            return false;
          }
          const msUntilDue = dueTime - referenceTime;
          if (msUntilDue <= 0) {
            return false;
          }
          return msUntilDue >= bandLowMs && msUntilDue <= bandHighMs;
        })
        .sort((left, right) => {
          const leftTime = toDate(left.followupDate)?.getTime() || 0;
          const rightTime = toDate(right.followupDate)?.getTime() || 0;
          return leftTime - rightTime;
        })
        .slice(0, normalizedLimit);

      return dueSoon;
    },

    async findFollowupAlertLog({ followupId, alertType, alertDate } = {}) {
      const tableExists = await hasTable(schema.followupAlertLogsTable);
      if (!tableExists || !followupId || !alertType || !alertDate) {
        return null;
      }
      return db.findOne(schema.followupAlertLogsTable, {
        followup_id: followupId,
        alert_type: alertType,
        alert_date: alertDate,
      });
    },

    async createFollowupAlertLog(payload = {}) {
      const tableExists = await hasTable(schema.followupAlertLogsTable);
      if (!tableExists) {
        return null;
      }
      const sanitized = await sanitizeForTable(schema.followupAlertLogsTable, {
        followup_id: payload.followupId,
        alert_type: payload.alertType,
        alert_date: payload.alertDate,
        triggered_at: payload.triggeredAt || new Date().toISOString(),
        metadata: payload.metadata || {},
      });
      if (!Object.keys(sanitized).length) {
        return null;
      }
      return db.insert(schema.followupAlertLogsTable, sanitized);
    },

    async getFollowupComplianceStats(leadId) {
      const rows = await db.findMany(schema.followupsTable, { lead_id: leadId });
      const followups = rows
        .map((row) => toFollowupDomain(row))
        .filter((item) => !item.isScheduleOnly && item.countsTowardCompliance);
      const stats = {
        total: followups.length,
        calls: 0,
        whatsapp: 0,
        finalReminders: 0,
      };

      followups.forEach((item) => {
        const type = String(item.followupType || "").toUpperCase();
        if (type === "CALL") stats.calls += 1;
        if (type === "WHATSAPP") stats.whatsapp += 1;
        if (type === "FINAL_REMINDER") stats.finalReminders += 1;
      });

      return stats;
    },

    async findCadenceCandidates({ staleDays = 4, limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const normalizedStaleDays = toPositiveInt(staleDays, 4, 30);
      const lowerBound = Date.now() - normalizedStaleDays * 3 * 24 * 60 * 60 * 1000;

      const rows = await db.findMany(schema.tableName, {});
      const candidates = rows
        .filter((row) => {
          const status = String(row.status || "").toUpperCase();
          if (["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(status)) {
            return false;
          }
          const responseAt = row.response_at ?? row.responseAt ?? null;
          if (responseAt) {
            return false;
          }

          const createdAt = toDate(row.created_at ?? row.createdAt);
          if (!createdAt) {
            return false;
          }

          return createdAt.getTime() >= lowerBound;
        })
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(candidates);
    },
  });
}

export { createLeadsRepository };

