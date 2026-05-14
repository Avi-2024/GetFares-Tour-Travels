import { createAutomationScheduler } from "./scheduler.js";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(baseDate, days) {
  const copy = new Date(baseDate.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function safeNumber(value, fallback, max = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  const floored = Math.floor(parsed);
  if (max !== null) {
    return Math.min(floored, max);
  }
  return floored;
}

function createAutomationRuntime({ container, modules }) {
  const logger = container?.logger;
  const config = container?.config?.automation || {};
  const intervals = config.intervalsMs || {};
  const leadCadencePaused = true;
  const quotationRemindersPaused = true;
  const supplierPayableAlertsPaused = true;

  const leadsService = modules?.leads?.service;
  const quotationsService = modules?.quotations?.service;
  const bookingsService = modules?.bookings?.service;
  const suppliersService = modules?.suppliers?.service;

  const jobs = [];

  if (typeof leadsService?.processSlaBreaches === "function") {
    jobs.push({
      name: "lead_sla_breaches",
      intervalMs: intervals.leadSla,
      run: async () => leadsService.processSlaBreaches({}, {}),
    });
  }

  if (typeof leadsService?.processUpcomingFollowupReminders === "function") {
    jobs.push({
      name: "lead_followup_reminders",
      intervalMs: intervals.leadFollowupReminder,
      run: async () => leadsService.processUpcomingFollowupReminders({}, {}),
    });
  }

  if (
    typeof leadsService?.processOverdueFollowups === "function" &&
    typeof leadsService?.processCadenceAutomation === "function" &&
    typeof leadsService?.processNonResponsive === "function"
  ) {
    jobs.push({
      name: "lead_followup_automation",
      intervalMs: intervals.leadFollowup,
      run: async () => {
        const [overdue, cadence, nonResponsive] = await Promise.all([
          leadsService.processOverdueFollowups({}, {}),
          leadCadencePaused ?
            Promise.resolve({ processed: 0, skipped: true, reason: "PAUSED_IN_BACKEND" })
          : leadsService.processCadenceAutomation({}, {}),
          leadsService.processNonResponsive({}, {}),
        ]);

        const overdueProcessed = Number(overdue?.processed || 0);
        const cadenceProcessed = Number(cadence?.processed || 0);
        const nonResponsiveProcessed = Number(nonResponsive?.processed || 0);

        return {
          processed:
            overdueProcessed + cadenceProcessed + nonResponsiveProcessed,
          overdue: overdue || {},
          cadence: cadence || {},
          nonResponsive: nonResponsive || {},
        };
      },
    });
  }

  if (typeof leadsService?.processQueuedLeads === "function") {
    jobs.push({
      name: "lead_queue_distribution",
      intervalMs: intervals.leadQueue,
      run: async () => leadsService.processQueuedLeads({}, {}),
    });
  }

  if (typeof quotationsService?.runReminderAutomation === "function") {
    jobs.push({
      name: "quotation_reminders",
      intervalMs: intervals.quotationReminders,
      run: async () =>
        quotationRemindersPaused ?
          { processed: 0, skipped: true, reason: "PAUSED_IN_BACKEND" }
        : quotationsService.runReminderAutomation({}, {}),
    });
  }

  if (typeof bookingsService?.runTravelReminders === "function") {
    jobs.push({
      name: "booking_travel_reminders",
      intervalMs: intervals.bookingTravelReminders,
      run: async () => {
        const backfillDays = safeNumber(config.bookingTravelBackfillDays, 1, 7);
        const now = new Date();
        let processed = 0;
        const runs = [];

        for (let offset = 0; offset <= backfillDays; offset += 1) {
          const referenceDate = addDays(now, -offset);
          const result = await bookingsService.runTravelReminders(
            {
              referenceDate: toDateOnly(referenceDate),
            },
            {},
          );
          const preCount = Number(result?.preTravel?.count || 0);
          const postCount = Number(result?.postTravel?.count || 0);
          processed += preCount + postCount;
          runs.push({
            referenceDate: toDateOnly(referenceDate),
            preTravelCount: preCount,
            postTravelCount: postCount,
          });
        }

        return {
          processed,
          runs,
        };
      },
    });
  }

  if (typeof bookingsService?.processDeadlineAlerts === "function") {
    jobs.push({
      name: "booking_deadline_alerts",
      intervalMs: intervals.bookingDeadlines,
      run: async () =>
        bookingsService.processDeadlineAlerts(
          {
            lookaheadHours: safeNumber(config.deadlineLookaheadHours, 24, 240),
          },
          {},
        ),
    });
  }

  if (typeof suppliersService?.processPayableDeadlineAlerts === "function") {
    jobs.push({
      name: "supplier_payable_deadline_alerts",
      intervalMs: intervals.supplierPayables,
      run: async () =>
        supplierPayableAlertsPaused ?
          { processed: 0, skipped: true, reason: "PAUSED_IN_BACKEND" }
        : suppliersService.processPayableDeadlineAlerts(
            {
              lookaheadDays: safeNumber(config.supplierLookaheadDays, 2, 60),
            },
            {},
          ),
    });
  }

  const scheduler = createAutomationScheduler({
    logger,
    db: container?.db,
    metricsStore: container?.metricsStore,
    jobs,
    config: {
      enabled: config.enabled,
      startupDelayMs: config.startupDelayMs,
      lockTimeoutSec: config.lockTimeoutSec,
    },
  });

  return Object.freeze({
    start() {
      scheduler.start();
    },
    stop() {
      scheduler.stop();
    },
    snapshot() {
      return scheduler.snapshot();
    },
  });
}

export { createAutomationRuntime };
