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
const MANDATORY_FOLLOWUP_ATTEMPTS = 5; // FU1..FU4 + final reminder

const AUTOMATION_DEFAULTS = Object.freeze({
  highBudgetThreshold: 150000,
  distributionLimit: 25,
  inactiveMinutes: 15,
  overdueFollowupLimit: 100,
  slaCheckLimit: 100,
});

function createLeadsService({ repository, logger, events }) {
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
    if (["HOLIDAY", "VISA", "BOTH"].includes(normalized)) {
      return normalized;
    }
    return "HOLIDAY";
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
    };
  }

  function buildCreateRecord(payload, options = {}) {
    const customerId = options.customerId || null;
    const useCustomerLinking = Boolean(options.useCustomerLinking);
    const now = new Date();
    const responseDeadline = payload.responseDeadline
      ? new Date(payload.responseDeadline).toISOString()
      : new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const assignedTo = payload.assignedTo || null;
    const temperature = determineLeadTemperature(payload);

    const mapped = {
      full_name: payload.fullName || null,
      phone: normalizePhone(payload.phone),
      email: normalizeEmail(payload.email),
      pan_number: payload.panNumber || null,
      address_line: payload.addressLine || null,
      client_currency: payload.clientCurrency || null,
      destination_id: payload.destinationId || null,
      nationality: payload.nationality || null,
      travel_date: payload.travelDate || null,
      budget: payload.budget ?? null,
      adults_count: payload.adultsCount ?? 1,
      children_count: payload.childrenCount ?? 0,
      visa_required: payload.visaRequired ?? false,
      lead_type: normalizeLeadType(payload.leadType),
      travel_purpose: payload.travelPurpose || null,
      sub_status: payload.subStatus || null,
      temperature,
      source: payload.source || "Manual",
      campaign_id: payload.campaignId || null,
      utm_source: payload.utmSource || null,
      utm_medium: payload.utmMedium || null,
      utm_campaign: payload.utmCampaign || null,
      priority_level:
        payload.priorityLevel ?? mapTemperatureToPriority(temperature),
      is_vip: payload.isVip ?? false,
      status: payload.status || "OPEN",
      assigned_to: assignedTo,
      assigned_at: assignedTo ? now.toISOString() : null,
      response_deadline: responseDeadline,
      qualification_completed: payload.qualificationCompleted ?? false,
      closed_reason: payload.closedReason || null,
      next_followup_date: payload.nextFollowupDate || null,
      followup_attempts: 0,
      final_reminder_at: null,
      non_responsive_marked_at: null,
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
    if (payload.adultsCount !== undefined) {
      mapped.adults_count = payload.adultsCount;
    }
    if (payload.childrenCount !== undefined) {
      mapped.children_count = payload.childrenCount;
    }
    if (payload.visaRequired !== undefined) {
      mapped.visa_required = payload.visaRequired;
    }
    if (payload.leadType !== undefined) {
      mapped.lead_type = normalizeLeadType(payload.leadType);
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
      mapped.status = payload.status;
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

    if (payload.status === "CONTACTED" && !existing.responseAt) {
      mapped.response_at = now;
      if (existing.responseDeadline) {
        mapped.sla_breached =
          new Date(now) > new Date(existing.responseDeadline);
      }
    }

    if (payload.priorityLevel === undefined) {
      const mergedLead = {
        travelDate: payload.travelDate ?? existing.travelDate,
        budget: payload.budget ?? existing.budget,
        status: payload.status ?? existing.status,
        respondedPositively: payload.respondedPositively,
      };
      const nextTemperature = determineLeadTemperature(mergedLead);
      mapped.priority_level = mapTemperatureToPriority(nextTemperature);
      mapped.temperature = nextTemperature;
    }

    return mapped;
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
    let candidates = await repository.findActiveAssignableUsers();

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
    const openLoadByUser = await repository.getOpenLeadLoadByUserIds(poolIds);

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

    const assignee = await selectAssigneeForLead(existing, {
      excludeUserId: payload.excludeUserId,
    });

    if (!assignee) {
      events.emitEscalated({
        leadId: existing.id,
        reason: "NO_ASSIGNABLE_CONSULTANT",
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

    if (!existing.responseDeadline) {
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
      });
    } else {
      events.emitAssigned({
        leadId: lead.id,
        assigneeId: assignee.id,
        mode: payload.mode || "AUTO",
        reason: payload.reason || null,
      });
    }

    return lead;
  }

  async function create(payload, context = {}) {
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
      const leads = await repository.findAll(filters);
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
      const currentAttempts = Number(lead.followupAttempts || 0);
      if (currentAttempts >= MANDATORY_FOLLOWUP_ATTEMPTS) {
        throw new AppError(
          409,
          "Maximum follow-up attempts reached for this lead. Use status update flow.",
          "LEAD_FOLLOWUP_LIMIT_REACHED",
        );
      }

      const nextAttempt = currentAttempts + 1;
      const normalizedType =
        payload.followupType ||
        (nextAttempt >= MANDATORY_FOLLOWUP_ATTEMPTS
          ? "FINAL_REMINDER"
          : "CALL");

      const followup = await repository.createFollowup({
        leadId: lead.id,
        userId: payload.userId || context.user?.id || lead.assignedTo || null,
        followupType: normalizedType,
        followupDate: payload.followupDate,
        notes: payload.notes,
      });

      const followupDate = new Date(followup.followupDate);
      const updatePayload = {
        followup_attempts: nextAttempt,
        sub_status:
          nextAttempt >= MANDATORY_FOLLOWUP_ATTEMPTS
            ? "FINAL_REMINDER"
            : `FOLLOW_UP_${nextAttempt}`,
      };

      if (!Number.isNaN(followupDate.getTime())) {
        updatePayload.next_followup_date = followupDate
          .toISOString()
          .slice(0, 10);
      }

      if (
        normalizedType === "FINAL_REMINDER" ||
        nextAttempt >= MANDATORY_FOLLOWUP_ATTEMPTS
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
      const overdue = await repository.findOverdueFollowups({ limit });

      overdue.forEach((item) => {
        events.emitFollowupOverdue(item);
      });

      return {
        processed: overdue.length,
        followups: overdue,
      };
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
        if (Number(lead.followupAttempts || 0) < MANDATORY_FOLLOWUP_ATTEMPTS) {
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

    async processSlaBreaches(payload = {}, context = {}) {
      const limit = toPositiveInt(
        payload.limit,
        AUTOMATION_DEFAULTS.slaCheckLimit,
      );
      const candidates = await repository.findSlaBreachCandidates({ limit });

      const summary = {
        processed: 0,
        breachedLeadIds: [],
      };

      for (const lead of candidates) {
        await repository.markSlaBreached(lead.id);

        await repository.createActivity({
          leadId: lead.id,
          userId: context.user?.id || null,
          activityType: "SLA_BREACHED",
          notes: "Lead was not responded within SLA deadline",
        });

        events.emitSlaBreached({
          id: lead.id,
          leadId: lead.id,
          assignedTo: lead.assignedTo,
          responseDeadline: lead.responseDeadline,
        });

        events.emitEscalated({
          leadId: lead.id,
          reason: "SLA_BREACH_15_MIN",
        });

        summary.processed += 1;
        summary.breachedLeadIds.push(lead.id);
      }

      return summary;
    },

    async update(id, payload, context = {}) {
      const existing = await getById(id, context);
      if (
        payload.status === "LOST" ||
        payload.status === NON_RESPONSIVE_STATUS
      ) {
        const attempts = Number(existing.followupAttempts || 0);
        if (attempts < MANDATORY_FOLLOWUP_ATTEMPTS) {
          throw new AppError(
            409,
            `Minimum ${MANDATORY_FOLLOWUP_ATTEMPTS} follow-up attempts are required before closing lead.`,
            "LEAD_FOLLOWUP_COMPLIANCE_REQUIRED",
          );
        }
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

      const updated = Object.keys(mapped).length
        ? await repository.update(id, mapped)
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
      events.emitUpdated(lead);
      return lead;
    },
  });
}

export { createLeadsService, LEAD_TEMPERATURE };
