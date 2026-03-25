import { AppError } from "../../core/errors/index.js";

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
const FOLLOWUP_COMPLIANCE_RULES = Object.freeze({
  requiredCalls: 4,
  requiredWhatsapp: 2,
  requiredFinalReminders: 1,
});
const FOLLOWUP_TOTAL_REQUIRED =
  FOLLOWUP_COMPLIANCE_RULES.requiredCalls +
  FOLLOWUP_COMPLIANCE_RULES.requiredWhatsapp +
  FOLLOWUP_COMPLIANCE_RULES.requiredFinalReminders;
const DOC_STATUS_TO_CANONICAL = Object.freeze({
  NEW: "OPEN",
  OPEN: "OPEN",
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

function createLeadsService({ repository, logger, events }) {
  function normalizeCategory(value) {
    if (!value) return null;
    return String(value).trim().toLowerCase();
  }

  function normalizeAgentType(value) {
    if (!value) return null;
    const normalized = String(value).trim().toUpperCase();
    if (normalized.includes("VISA")) return "VISA";
    if (normalized.includes("HOLIDAY")) return "HOLIDAY";
    if (normalized === "BOTH") return "BOTH";
    return normalized;
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
      allowUnlimitedWhatsapp: callsDisabled,
      maxFollowups: callsDisabled ? null : 12,
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
    const hasDestination = Boolean(
      input.destinationId || input.destinationName || input.destination,
    );
    if (!hasDestination) {
      missing.push("destination");
    }
    if (!input.travelDate) {
      missing.push("travelDate");
    }
    if (input.adultsCount === undefined || input.childrenCount === undefined) {
      missing.push("paxSplit(adultsCount,childrenCount)");
    }
    if (input.budget === undefined || input.budget === null) {
      missing.push("budget");
    }
    if (typeof input.visaRequired !== "boolean") {
      missing.push("visaRequired");
    }
    if (!normalizeHotelCategory(input.preferredHotelCategory)) {
      missing.push("preferredHotelCategory");
    }
    if (!input.travelPurpose) {
      missing.push("travelPurpose");
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

    const mapped = {
      full_name: payload.fullName || null,
      phone: normalizePhone(payload.phone),
      email: normalizeEmail(payload.email),
      pan_number: payload.panNumber || null,
      address_line: payload.addressLine || null,
      client_currency: payload.clientCurrency || null,
      destination_id: payload.destinationId || null,
      nationality: payload.nationality || null,
      lead_country: leadCountry,
      travel_date: payload.travelDate || null,
      budget: payload.budget ?? null,
      adults_count: payload.adultsCount ?? 1,
      children_count: payload.childrenCount ?? 0,
      visa_required: payload.visaRequired ?? false,
      lead_type: normalizeLeadType(payload.leadType ?? payload.type),
      preferred_hotel_category: normalizeHotelCategory(
        payload.preferredHotelCategory,
      ),
      travel_purpose: payload.travelPurpose || null,
      sub_status: payload.subStatus || null,
      temperature,
      source: payload.source || "Manual",
      campaign_id: payload.campaignId || null,
      utm_source: payload.utmSource || null,
      utm_medium: payload.utmMedium || null,
      utm_campaign: payload.utmCampaign || null,
      meta_lead_id: payload.metaLeadId || null,
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
    }
    if (payload.email !== undefined) {
      mapped.email = normalizeEmail(payload.email);
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
    if (payload.leadCountry !== undefined || payload.country !== undefined) {
      mapped.lead_country = payload.leadCountry ?? payload.country ?? null;
    }
    if (payload.nationality !== undefined) {
      mapped.nationality = payload.nationality;
    }
    if (payload.travelDate !== undefined) {
      mapped.travel_date = payload.travelDate;
    }
    if (payload.budget !== undefined) {
      mapped.budget = payload.budget;
    }
    if (payload.source !== undefined) {
      mapped.source = payload.source;
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
    if (payload.adultsCount !== undefined) {
      mapped.adults_count = payload.adultsCount;
    }
    if (payload.childrenCount !== undefined) {
      mapped.children_count = payload.childrenCount;
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
    if (payload.nextFollowupDate !== undefined) {
      mapped.next_followup_date = payload.nextFollowupDate;
    }
    if (payload.callsDisabled !== undefined) {
      mapped.calls_disabled = payload.callsDisabled;
    }

    if (mapped.status && POSITIVE_RESPONSE_STATUSES.has(mapped.status) && !existing.responseAt) {
      mapped.response_at = now;
      if (existing.responseDeadline) {
        mapped.sla_breached = isAfterResponseDeadline(
          now,
          existing.responseDeadline,
        );
      }
    }

    if (payload.priorityLevel === undefined) {
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

    return withTemperature(item);
  }

  async function selectAssigneeForLead(lead, options = {}) {
    const roleName = options.roleName ?
      String(options.roleName).trim().toLowerCase()
    : null;
    const roundRobinOnly =
      options.roundRobinOnly === true ||
      roleName === ASSIGNMENT_ROLES.AGENT ||
      roleName === ASSIGNMENT_ROLES.MANAGER;
    let candidates = await repository.findActiveAssignableUsers(roleName);

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

    if (roleName === ASSIGNMENT_ROLES.AGENT) {
      const leadCountry = normalizeCategory(
        lead.leadCountry ?? lead.country ?? null,
      );
      const leadType = normalizeAgentType(lead.leadType ?? lead.type ?? null);
      const requiredLeadType = leadType === "BOTH" ? null : leadType;

      if (leadCountry || requiredLeadType) {
        const scoped = candidates.filter((candidate) => {
          const agentCountry = normalizeCategory(candidate.country);
          const agentType = normalizeAgentType(candidate.agentType);

          if (leadCountry && (!agentCountry || agentCountry !== leadCountry)) {
            return false;
          }
          if (
            requiredLeadType &&
            (!agentType || (agentType !== requiredLeadType && agentType !== "BOTH"))
          ) {
            return false;
          }
          return true;
        });

        if (!scoped.length) {
          return null;
        }
        candidates = scoped;
      }
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

    const roundRobinPool = [...pool].sort((left, right) =>
      String(left.id).localeCompare(String(right.id)),
    );
    const lastAssignedUserId =
      await repository.findLatestAssignedUserId(poolIds);

    if (!lastAssignedUserId) {
      return roundRobinPool[0];
    }

    const lastIndex = roundRobinPool.findIndex(
      (candidate) => candidate.id === lastAssignedUserId,
    );
    if (lastIndex === -1 || lastIndex === roundRobinPool.length - 1) {
      return roundRobinPool[0];
    }

    return roundRobinPool[lastIndex + 1];
  }

  async function assignLead(leadId, payload = {}, context = {}) {
    const existing = await getById(leadId, context);

    if (CLOSED_STATUSES.has(existing.status)) {
      return existing;
    }

    if (existing.assignedTo && !payload.force) {
      return existing;
    }

    const roleName = payload.roleName ?
      String(payload.roleName).trim().toLowerCase()
    : ASSIGNMENT_ROLES.AGENT;

    const assignee = await selectAssigneeForLead(existing, {
      excludeUserId: payload.excludeUserId,
      roleName,
    });

    if (!assignee) {
      const reason =
        roleName === ASSIGNMENT_ROLES.MANAGER ?
          "NO_ASSIGNABLE_MANAGER"
        : "NO_ASSIGNABLE_AGENT";
      events.emitEscalated({
        leadId: existing.id,
        reason,
        role: roleName,
        roles: roleName === ASSIGNMENT_ROLES.MANAGER ? ["manager"] : undefined,
      });
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

    await repository.createActivity({
      leadId: existing.id,
      userId: context.user?.id || null,
      activityType: isReassign ? "LEAD_REASSIGNED" : "LEAD_ASSIGNED",
      notes: payload.reason || null,
    });

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
      });
    } else {
      events.emitAssigned({
        leadId: lead.id,
        assigneeId: assignee.id,
        mode: payload.mode || "AUTO",
        reason: payload.reason || null,
        role: roleName,
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
    if (
      payload.qualificationCompleted === true ||
      STATUS_REQUIRING_QUALIFICATION.has(normalizedStatus)
    ) {
      assertQualificationCaptured(payload);
      payload.qualificationCompleted = true;
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

    if (duplicate) {
      throw new AppError(409, "Duplicate lead detected", "LEAD_DUPLICATE", {
        existingLeadId: duplicate.id,
      });
    }

    let customer = null;
    if (useCustomerLinking) {
      customer = await repository.findOrCreateCustomer({
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        panNumber: payload.panNumber,
        addressLine: payload.addressLine,
        clientCurrency: payload.clientCurrency,
      });
    }

    const created = await repository.create(
      buildCreateRecord(payload, {
        customerId: customer?.id,
        useCustomerLinking,
      }),
    );

    if (payload.notes) {
      await repository.createActivity({
        leadId: created.id,
        userId: context.user?.id,
        activityType: "LEAD_CREATED",
        notes: payload.notes,
      });
    }

    let lead = withTemperature(created, {
      respondedPositively: payload.respondedPositively,
    });
    events.emitCreated(lead);

    if (
      payload.autoAssign !== false &&
      !lead.assignedTo &&
      !CLOSED_STATUSES.has(lead.status)
    ) {
      lead = await assignLead(
        lead.id,
        {
          force: true,
          mode: "AUTO_CREATE",
          reason: "AUTO_ASSIGN_ON_CREATE",
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
      const mappedFilters = {
        ...filters,
        status:
          filters.status ? normalizeLeadStatus(filters.status) : undefined,
      };
      const leads = await repository.findAll(mappedFilters);
      return leads.map((lead) => withTemperature(lead));
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

      const compliance = await repository.getFollowupComplianceStats(lead.id);
      const nextAttempt = compliance.total + 1;
      let normalizedType = requestedType;
      if (!normalizedType) {
        if (policy.totalRequired && nextAttempt === policy.totalRequired) {
          normalizedType = "FINAL_REMINDER";
        } else {
          normalizedType = policy.callsDisabled ? "WHATSAPP" : "CALL";
        }
      }

      if (policy.callsDisabled && normalizedType === "CALL") {
        normalizedType = "WHATSAPP";
      }

      const allowUnlimitedWhatsapp =
        policy.allowUnlimitedWhatsapp && normalizedType === "WHATSAPP";
      if (!allowUnlimitedWhatsapp && isFollowupComplianceSatisfied(compliance, policy)) {
        throw new AppError(
          409,
          "Follow-up compliance already achieved for this lead. Use status update flow.",
          "LEAD_FOLLOWUP_LIMIT_REACHED",
        );
      }
      if (!allowUnlimitedWhatsapp && policy.maxFollowups && compliance.total >= policy.maxFollowups) {
        throw new AppError(
          409,
          "Maximum follow-up attempts reached for this lead. Use status update flow.",
          "LEAD_FOLLOWUP_LIMIT_REACHED",
        );
      }

      const followup = await repository.createFollowup({
        leadId: lead.id,
        userId: payload.userId || context.user?.id || lead.assignedTo || null,
        followupType: normalizedType,
        followupDate: payload.followupDate,
        cadenceCode: payload.cadenceCode || null,
        notes: payload.notes,
      });

      const followupDate = new Date(followup.followupDate);
      const updatePayload = {
        followup_attempts: nextAttempt,
        status: "FOLLOW_UP",
        sub_status:
          normalizedType === "FINAL_REMINDER" ? "FINAL_REMINDER" : (
            `FOLLOW_UP_${Math.min(nextAttempt, 4)}`
          ),
      };

      if (!Number.isNaN(followupDate.getTime())) {
        updatePayload.next_followup_date = followupDate
          .toISOString()
          .slice(0, 10);
      }

      if (
        normalizedType === "FINAL_REMINDER" ||
        (policy.totalRequired && nextAttempt === policy.totalRequired)
      ) {
        updatePayload.final_reminder_at = new Date().toISOString();
      }

      await repository.update(lead.id, updatePayload);

      await repository.createActivity({
        leadId: lead.id,
        userId: context.user?.id || null,
        activityType: "FOLLOWUP_SCHEDULED",
        notes: payload.notes || null,
      });

      events.emitFollowupCreated(followup);
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

      await repository.createActivity({
        leadId: lead.id,
        userId: context.user?.id || null,
        activityType: disabled ? "CALLS_DISABLED" : "CALLS_ENABLED",
        notes: payload.notes || null,
      });

      const mapped = withTemperature(updated);
      events.emitUpdated(mapped);
      return mapped;
    },

    async listFollowups(leadId, context = {}) {
      const lead = await getById(leadId, context);
      return repository.listFollowupsByLeadId(lead.id);
    },

    async listOverdueFollowups(filters = {}) {
      const limit = toPositiveInt(
        filters.limit,
        AUTOMATION_DEFAULTS.overdueFollowupLimit,
      );
      return repository.findOverdueFollowups({ limit });
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
      const alertDate = toDateOnly(referenceDate);
      const summary = {
        processed: overdue.length,
        triggered: 0,
        skipped: 0,
        followups: [],
      };

      for (const item of overdue) {
        const existing = await repository.findFollowupAlertLog({
          followupId: item.id,
          alertType: "FOLLOWUP_OVERDUE",
          alertDate,
        });
        if (existing) {
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
          },
        });
        events.emitFollowupOverdue(item);
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

        await repository.createActivity({
          leadId: lead.id,
          userId: context.user?.id || null,
          activityType: "LEAD_NON_RESPONSIVE",
          notes: `Auto-marked NON_RESPONSIVE after ${staleDays} day(s) and follow-up compliance`,
        });

        events.emitEscalated({
          leadId: lead.id,
          reason: "AUTO_NON_RESPONSIVE",
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

          await repository.createFollowup({
            leadId: lead.id,
            userId: lead.assignedTo || context.user?.id || null,
            followupType: slot.type,
            followupDate: slot.followupDate.toISOString(),
            cadenceCode: slot.code,
            notes: `AUTO_CADENCE:${slot.code}`,
            isCompleted: false,
          });
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

        await repository.createActivity({
          leadId: lead.id,
          userId: context.user?.id || null,
          activityType: "SLA_BREACHED",
          notes: "Lead was not first-contacted within the 15-minute response SLA.",
        });

        const reassigned = await assignLead(
          lead.id,
          {
            force: true,
            excludeUserId: previousAssigneeId,
            mode: "SLA_ESCALATION",
            reason: "AGENT_ACCEPT_TIMEOUT",
            roleName: ASSIGNMENT_ROLES.MANAGER,
          },
          context,
        );

        events.emitSlaBreached({
          id: lead.id,
          leadId: lead.id,
          assignedTo: lead.assignedTo,
          previousAssigneeId,
          escalatedTo: reassigned?.assignedTo || null,
          responseDeadline: lead.responseDeadline,
          message:
            "Lead SLA breached: first contact was not completed within 15 minutes. Escalating to manager.",
          roles: ["manager"],
        });

        events.emitEscalated({
          leadId: lead.id,
          reason: "SLA_BREACH_15_MIN",
          previousAssigneeId,
          escalatedTo: reassigned?.assignedTo || null,
          message:
            "Lead was not first-contacted within 15 minutes. Manager assigned for escalation.",
          roles: ["manager"],
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
      const nextStatus =
        payload.status ? normalizeLeadStatus(payload.status) : existing.status;
      payload.status = nextStatus;

      if (
        payload.qualificationCompleted === true ||
        STATUS_REQUIRING_QUALIFICATION.has(nextStatus)
      ) {
        assertQualificationCaptured({
          destinationId: payload.destinationId ?? existing.destinationId,
          destinationName: payload.destinationName ?? existing.destinationName,
          travelDate: payload.travelDate ?? existing.travelDate,
          adultsCount: payload.adultsCount ?? existing.adultsCount,
          childrenCount: payload.childrenCount ?? existing.childrenCount,
          budget: payload.budget ?? existing.budget,
          visaRequired: payload.visaRequired ?? existing.visaRequired,
          preferredHotelCategory:
            payload.preferredHotelCategory ?? existing.preferredHotelCategory,
          travelPurpose: payload.travelPurpose ?? existing.travelPurpose,
        });
        payload.qualificationCompleted = true;
      }

      if (nextStatus === "LOST" || nextStatus === NON_RESPONSIVE_STATUS) {
        const compliance = await repository.getFollowupComplianceStats(id);
        const policy = getFollowupPolicy(existing);
        assertFollowupCompliance(compliance, policy);
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
      });

      const updated =
        Object.keys(mapped).length ?
          await repository.update(id, mapped)
        : await repository.findById(id);

      if (payload.notes) {
        await repository.createActivity({
          leadId: id,
          userId: context.user?.id,
          activityType: "LEAD_UPDATED",
          notes: payload.notes,
        });
      }

      const lead = withTemperature(updated, {
        respondedPositively: payload.respondedPositively,
      });

      if (lead.slaBreached && !existing.slaBreached) {
        events.emitSlaBreached({
          id: lead.id,
          leadId: lead.id,
          assignedTo: lead.assignedTo,
          responseDeadline: lead.responseDeadline,
          message:
            "Lead SLA breached: contact happened after 15-minute response window.",
          roles: ["manager"],
        });
        events.emitEscalated({
          leadId: lead.id,
          reason: "SLA_BREACH_15_MIN",
          message:
            "Lead SLA breach auto-alert to manager due to delayed first contact.",
          roles: ["manager"],
        });
      }
      events.emitUpdated(lead);
      return lead;
    },
  });
}

export { createLeadsService, LEAD_TEMPERATURE };
