import {
  isSuperAdminRole,
  normalizeRoleName,
} from "../../core/constants/index.js";

const DEFAULT_REPORTING_CURRENCY = "USD";

function canReportsScopeConsultantGlobally(role) {
  const name = normalizeRoleName(role);
  return (
    isSuperAdminRole(role) || name === "admin" || name === "accounts"
  );
}

function mergeConsultantScope(filters = {}, context = {}) {
  const unrestricted = canReportsScopeConsultantGlobally(context.user?.role);
  const trimmed =
    filters.userId ?
      String(filters.userId).trim()
    : "";
  const next = { ...filters };

  if (unrestricted) {
    if (trimmed) next.userId = trimmed;
    else delete next.userId;
    return next;
  }

  if (context.user?.id) {
    next.userId = context.user.id;
    return next;
  }

  delete next.userId;
  return next;
}

function createReportsService({ repository, logger, currencyService }) {
  function normalizeCurrency(value, fallback = DEFAULT_REPORTING_CURRENCY) {
    const normalized = String(value || "")
      .trim()
      .toUpperCase();
    return normalized || fallback;
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function roundAmount(value) {
    return Number(toNumber(value, 0).toFixed(2));
  }

  async function loadCurrencyRates() {
    if (!currencyService?.getRates) {
      return null;
    }
    try {
      return (await currencyService.getRates())?.rates || null;
    } catch (error) {
      logger?.warn?.(
        { module: "reports", error: error.message },
        "Unable to preload currency rates for reports",
      );
      return null;
    }
  }

  async function convertAmountToCurrency(amount, fromCurrency, toCurrency, rates = null) {
    const normalizedFrom = normalizeCurrency(fromCurrency);
    const normalizedTo = normalizeCurrency(toCurrency);
    const amountNumber = toNumber(amount, 0);
    if (amountNumber === 0 || normalizedFrom === normalizedTo) {
      return roundAmount(amountNumber);
    }
    if (!currencyService?.convert) {
      throw new Error("currencyService.convert is not available");
    }
    const converted =
      rates && typeof currencyService.convertWithRates === "function"
        ? currencyService.convertWithRates(
            amountNumber,
            normalizedFrom,
            normalizedTo,
            rates,
          )
        : await currencyService.convert(
            amountNumber,
            normalizedFrom,
            normalizedTo,
          );
    return roundAmount(converted);
  }

  async function sumConvertedAmounts(rows = [], amountField, currencyField, targetCurrency, rates = null) {
    const normalizedTarget = normalizeCurrency(targetCurrency);
    const amounts = await Promise.all(rows.map((row) => {
      const amount = toNumber(row?.[amountField], 0);
      const sourceCurrency = normalizeCurrency(row?.[currencyField], normalizedTarget);
      return convertAmountToCurrency(amount, sourceCurrency, normalizedTarget, rates);
    }));
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    return roundAmount(total);
  }

  async function buildPeopleMoney(rows = [], reportingCurrency) {
    const byUser = new Map();
    const countMetrics = new Set([
      "assignedLeads",
      "convertedLeads",
      "bookings",
      "missedFollowups",
    ]);
    for (const row of rows) {
      const userId = row?.user_id || row?.userId;
      const metric = String(row?.metric || "").trim();
      if (!userId || !metric) continue;
      const displayCurrency = normalizeCurrency(reportingCurrency);
      const amountCurrency = normalizeCurrency(
        row?.amount_currency || row?.amountCurrency,
        row?.currency || displayCurrency,
      );
      const userBuckets = byUser.get(userId) || new Map();
      const current = userBuckets.get(displayCurrency) || {
        currency: displayCurrency,
      };
      const amount = countMetrics.has(metric)
        ? toNumber(row?.amount, 0)
        : await convertAmountToCurrency(row?.amount, amountCurrency, displayCurrency);
      current[metric] = roundAmount(toNumber(current[metric], 0) + amount);
      if (metric === "bookingValue") {
        current.bookingValueReporting = roundAmount(
          toNumber(current.bookingValueReporting, 0) + amount,
        );
      }
      userBuckets.set(displayCurrency, current);
      byUser.set(userId, userBuckets);
    }

    const normalizedByUser = new Map();
    for (const [userId, buckets] of byUser.entries()) {
      normalizedByUser.set(
        userId,
        Array.from(buckets.values()).sort(
          (left, right) =>
            toNumber(right.bookingValueReporting, right.bookingValue) -
              toNumber(left.bookingValueReporting, left.bookingValue) ||
            String(left.currency).localeCompare(String(right.currency)),
        ),
      );
    }
    return normalizedByUser;
  }

  function buildPeopleRow(row, money = {}, reportingCurrency = DEFAULT_REPORTING_CURRENCY) {
    const bookingValue = roundAmount(money.bookingValue ?? row.bookingValue);
    const bookingCost = roundAmount(money.bookingCost ?? row.bookingCost);
    const refundAmount = roundAmount(money.refundAmount ?? row.refundAmount);
    const collectedAmount = roundAmount(
      money.collectedAmount ?? row.collectedAmount,
    );
    const quotationValue = roundAmount(
      money.quotationValue ?? row.quotationValue,
    );
    const profit = roundAmount(bookingValue - bookingCost - refundAmount);
    const bookings = toNumber(money.bookings ?? row.bookings, 0);

    return {
      ...row,
      currency: money.currency || reportingCurrency,
      assignedLeads: toNumber(money.assignedLeads ?? row.assignedLeads, 0),
      convertedLeads: toNumber(money.convertedLeads ?? row.convertedLeads, 0),
      bookings,
      missedFollowups: toNumber(
        money.missedFollowups ?? row.missedFollowups,
        0,
      ),
      quotationValue,
      bookingValue,
      bookingValueReporting: roundAmount(
        money.bookingValueReporting ?? bookingValue,
      ),
      averageBookingValue:
        bookings > 0 ? Number((bookingValue / bookings).toFixed(2)) : 0,
      bookingCost,
      collectedAmount,
      outstandingAmount: Number(
        Math.max(bookingValue - collectedAmount - refundAmount, 0).toFixed(2),
      ),
      refundAmount,
      profit,
      averageMarginPercent:
        bookingValue > 0 ? Number(((profit / bookingValue) * 100).toFixed(2)) : 0,
    };
  }

  async function buildRevenueByMonth(rows = [], reportingCurrency) {
    const byMonth = new Map();
    for (const row of rows) {
      const month = String(row?.month || "").trim();
      const metric = String(row?.metric || "").trim();
      if (!month || !["revenue", "cost"].includes(metric)) continue;
      const converted = await convertAmountToCurrency(
        row?.amount,
        row?.currency,
        reportingCurrency,
      );
      const current = byMonth.get(month) || {
        month,
        currency: reportingCurrency,
        revenue: 0,
        cost: 0,
      };
      current[metric] = roundAmount(toNumber(current[metric], 0) + converted);
      byMonth.set(month, current);
    }

    return Array.from(byMonth.values())
      .map((row) => ({
        ...row,
        profit: roundAmount(toNumber(row.revenue, 0) - toNumber(row.cost, 0)),
      }))
      .sort((left, right) => String(left.month).localeCompare(String(right.month)));
  }

  async function buildRevenueByService(rows = [], reportingCurrency) {
    const byService = new Map();
    for (const row of rows) {
      const serviceType = String(row?.serviceType || row?.service_type || "UNKNOWN")
        .trim()
        .toUpperCase();
      const convertedRevenue = await convertAmountToCurrency(
        row?.revenue,
        row?.currency,
        reportingCurrency,
      );
      const current = byService.get(serviceType) || {
        serviceType,
        currency: reportingCurrency,
        totalBookings: 0,
        revenue: 0,
      };
      current.totalBookings += toNumber(row?.totalBookings ?? row?.total_bookings, 0);
      current.revenue = roundAmount(current.revenue + convertedRevenue);
      byService.set(serviceType, current);
    }

    return Array.from(byService.values()).sort(
      (left, right) => toNumber(right.revenue, 0) - toNumber(left.revenue, 0),
    );
  }

  async function applyBookingPerformanceCurrency(data, moneyRows, reportingCurrency) {
    const summary = { ...(data?.summary || {}) };
    for (const metric of ["bookingValue", "bookingCost", "advanceReceived"]) {
      summary[metric] = await sumConvertedAmounts(
        (moneyRows?.summary || []).filter((row) => row.metric === metric),
        "amount",
        "currency",
        reportingCurrency,
      );
    }
    summary.profit = roundAmount(
      toNumber(summary.bookingValue, 0) - toNumber(summary.bookingCost, 0),
    );
    summary.averageBookingValue =
      toNumber(summary.totalBookings, 0) > 0
        ? roundAmount(toNumber(summary.bookingValue, 0) / toNumber(summary.totalBookings, 0))
        : 0;
    summary.marginPercent =
      toNumber(summary.bookingValue, 0) > 0
        ? Number(((toNumber(summary.profit, 0) / toNumber(summary.bookingValue, 0)) * 100).toFixed(2))
        : 0;
    summary.currency = reportingCurrency;

    const byMonth = new Map(
      (data?.byMonth || []).map((row) => [
        String(row.month || ""),
        { ...row, currency: reportingCurrency, value: 0, cost: 0, profit: 0 },
      ]),
    );
    for (const row of moneyRows?.byMonth || []) {
      const month = String(row.month || "").trim();
      if (!month || !["value", "cost"].includes(row.metric)) continue;
      const current = byMonth.get(month) || {
        month,
        bookings: 0,
        currency: reportingCurrency,
        value: 0,
        cost: 0,
        profit: 0,
      };
      current[row.metric] = roundAmount(
        toNumber(current[row.metric], 0) +
          (await convertAmountToCurrency(row.amount, row.currency, reportingCurrency)),
      );
      byMonth.set(month, current);
    }
    const byMonthRows = Array.from(byMonth.values())
      .map((row) => ({
        ...row,
        profit: roundAmount(toNumber(row.value, 0) - toNumber(row.cost, 0)),
      }))
      .sort((left, right) => String(left.month).localeCompare(String(right.month)));

    const byDestination = new Map(
      (data?.byDestination || []).map((row) => [
        String(row.destination || "UNKNOWN"),
        { ...row, currency: reportingCurrency, value: 0, cost: 0, profit: 0 },
      ]),
    );
    for (const row of moneyRows?.byDestination || []) {
      const destination = String(row.destination || "UNKNOWN").trim() || "UNKNOWN";
      if (!["value", "cost"].includes(row.metric)) continue;
      const current = byDestination.get(destination) || {
        destination,
        bookings: 0,
        currency: reportingCurrency,
        value: 0,
        cost: 0,
        profit: 0,
      };
      current[row.metric] = roundAmount(
        toNumber(current[row.metric], 0) +
          (await convertAmountToCurrency(row.amount, row.currency, reportingCurrency)),
      );
      byDestination.set(destination, current);
    }

    return {
      ...data,
      summary,
      byMonth: byMonthRows,
      byDestination: Array.from(byDestination.values())
        .map((row) => ({
          ...row,
          profit: roundAmount(toNumber(row.value, 0) - toNumber(row.cost, 0)),
        }))
        .sort((left, right) => toNumber(right.value, 0) - toNumber(left.value, 0)),
    };
  }

  async function buildRevenueByDestination(rows = [], reportingCurrency) {
    const byDestination = new Map();
    for (const row of rows) {
      const destination = String(row?.destination || "UNKNOWN").trim() || "UNKNOWN";
      const convertedRevenue = await convertAmountToCurrency(
        row?.revenue,
        row?.currency,
        reportingCurrency,
      );
      const current = byDestination.get(destination) || {
        destination,
        currency: reportingCurrency,
        totalBookings: 0,
        revenue: 0,
      };
      current.totalBookings += toNumber(row?.totalBookings ?? row?.total_bookings, 0);
      current.revenue = roundAmount(current.revenue + convertedRevenue);
      byDestination.set(destination, current);
    }

    return Array.from(byDestination.values()).sort(
      (left, right) => toNumber(right.revenue, 0) - toNumber(left.revenue, 0),
    );
  }

  async function convertMoneyFields(row = {}, fields = [], targetCurrency = DEFAULT_REPORTING_CURRENCY) {
    const sourceCurrency = normalizeCurrency(
      row.effectiveCurrency ||
        row.currency ||
        row.clientCurrency ||
        row.leadClientCurrency ||
        row.costCurrency ||
        row.supplierCurrency,
      targetCurrency,
    );
    const converted = {
      ...row,
      sourceCurrency,
      currency: targetCurrency,
    };

    for (const field of fields) {
      converted[field] = await convertAmountToCurrency(
        row[field],
        sourceCurrency,
        targetCurrency,
      );
    }

    return converted;
  }

  async function convertFinanceCostBreakup(result = {}, targetCurrency = DEFAULT_REPORTING_CURRENCY) {
    const moneyFields = [
      "supplierCost",
      "supplierTaxAmount",
      "markupAmount",
      "serviceFeeAmount",
      "gstAmount",
      "tcsAmount",
      "totalSaleValue",
    ];
    const reportingCurrency = normalizeCurrency(targetCurrency);
    const breakdown = [];

    for (const row of result.currencyBreakdown || []) {
      breakdown.push(await convertMoneyFields(row, moneyFields, reportingCurrency));
    }

    const summary = breakdown.reduce(
      (accumulator, row) => {
        accumulator.totalQuotes += toNumber(row.totalQuotes, 0);
        for (const field of moneyFields) {
          accumulator[field] = roundAmount(
            toNumber(accumulator[field], 0) + toNumber(row[field], 0),
          );
        }
        return accumulator;
      },
      {
        totalQuotes: 0,
        supplierCost: 0,
        supplierTaxAmount: 0,
        markupAmount: 0,
        serviceFeeAmount: 0,
        gstAmount: 0,
        tcsAmount: 0,
        totalSaleValue: 0,
      },
    );

    const rows = [];
    for (const row of result.rows || []) {
      rows.push(await convertMoneyFields(row, moneyFields, reportingCurrency));
    }

    return {
      ...result,
      summary,
      currencyBreakdown: breakdown,
      rows,
      currency: reportingCurrency,
    };
  }

  async function attachMonthlySummaryCurrency(
    rows = [],
    moneyRows = [],
    targetCurrency = DEFAULT_REPORTING_CURRENCY,
  ) {
    const reportingCurrency = normalizeCurrency(targetCurrency);
    const byMonth = new Map(
      rows.map((row) => [
        String(row.month || ""),
        {
          ...row,
          revenue: 0,
          cost: 0,
          profit: 0,
          avgBookingValue: 0,
          avgMarginPercent: 0,
          currency: reportingCurrency,
        },
      ]),
    );

    for (const row of moneyRows) {
      const month = String(row?.month || "").trim();
      const metric = String(row?.metric || "").trim();
      if (!month || !["revenue", "cost"].includes(metric)) continue;
      const current = byMonth.get(month) || {
        month,
        totalLeads: 0,
        convertedLeads: 0,
        totalBookings: 0,
        conversionRatePercent: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        avgBookingValue: 0,
        avgMarginPercent: 0,
        currency: reportingCurrency,
      };
      current[metric] = roundAmount(
        toNumber(current[metric], 0) +
          (await convertAmountToCurrency(
            row.amount,
            row.currency,
            reportingCurrency,
          )),
      );
      byMonth.set(month, current);
    }

    return Array.from(byMonth.values())
      .sort((left, right) => String(left.month).localeCompare(String(right.month)))
      .map((row) => {
        const revenue = roundAmount(row.revenue);
        const cost = roundAmount(row.cost);
        const profit = roundAmount(revenue - cost);
        return {
          ...row,
          revenue,
          cost,
          profit,
          avgBookingValue:
            toNumber(row.totalBookings, 0) > 0
              ? Number((revenue / row.totalBookings).toFixed(2))
              : 0,
          avgMarginPercent:
            revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
          currency: reportingCurrency,
        };
      });
  }

  return Object.freeze({
    async leadFilterOptions(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Report lead filter options",
      );
      return repository.getLeadFilterOptions(filters);
    },

    async leadsBySource(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lead source report",
      );
      return repository.getLeadsBySource(scoped);
    },

    async leadsByConsultant(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lead consultant report",
      );
      return repository.getLeadsByConsultant(scoped);
    },

    async peoplePerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "People performance report",
      );
      const rows = await repository.getPeoplePerformance(scoped);
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      if (!currencyService?.convert) {
        throw new Error("Currency conversion service is required for People Performance");
      }

      try {
        const moneyRows =
          (await repository.getPeoplePerformanceMoneyByCurrency(scoped)) || [];
        const moneyByUser = await buildPeopleMoney(
          moneyRows,
          reportingCurrency,
        );

        return rows.flatMap((row) => {
          const buckets = moneyByUser.get(row.userId) || [];
          if (!buckets.length) {
            return [buildPeopleRow(row, {}, reportingCurrency)];
          }
          return buckets.map((money) =>
            buildPeopleRow(row, money, reportingCurrency),
          );
        }).sort(
          (left, right) =>
            toNumber(right.bookingValueReporting, right.bookingValue) -
              toNumber(left.bookingValueReporting, left.bookingValue) ||
            toNumber(right.convertedLeads, 0) - toNumber(left.convertedLeads, 0) ||
            toNumber(right.assignedLeads, 0) - toNumber(left.assignedLeads, 0),
        );
      } catch (error) {
        logger?.error?.(
          {
            module: "reports",
            error: error.message,
          },
          "People performance currency conversion failed",
        );
        throw error;
      }
    },

    async quotationPerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Quotation performance report",
      );
      return repository.getQuotationPerformance(scoped);
    },

    async bookingPerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Booking performance report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      const data = await repository.getBookingPerformance(scoped);
      if (!currencyService?.convert) {
        return {
          ...data,
          summary: { ...(data?.summary || {}), currency: reportingCurrency },
        };
      }
      const moneyRows =
        (await repository.getBookingPerformanceMoneyByCurrency(scoped)) || {};
      return applyBookingPerformanceCurrency(data, moneyRows, reportingCurrency);
    },

    async financeSummary(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Finance summary report",
      );
      return repository.getFinanceSummary(scoped);
    },

    async operationsPerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Operations performance report",
      );
      return repository.getOperationsPerformance(scoped);
    },

    async dealLines(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lead deal-line report",
      );
      return repository.getDealLinesReport(scoped);
    },

    async leadAging(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lead aging report",
      );
      return repository.getLeadAgingReport(scoped);
    },

    async lostLeads(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lost leads report",
      );
      return repository.getLostLeadReport(scoped);
    },

    async revenueByMonth(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Revenue by month report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      if (!currencyService?.convert) {
        return repository.getRevenueByMonth(scoped);
      }

      try {
        const currencyRows =
          (await repository.getRevenueByMonthByCurrency(scoped)) || [];
        return buildRevenueByMonth(currencyRows, reportingCurrency);
      } catch (error) {
        logger?.warn?.(
          { module: "reports", error: error.message },
          "Revenue by month currency conversion failed; returning raw totals",
        );
        return repository.getRevenueByMonth(scoped);
      }
    },

    async revenueByServiceType(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Revenue by service type report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      if (!currencyService?.convert) {
        return repository.getRevenueByServiceType(scoped);
      }

      try {
        const currencyRows =
          (await repository.getRevenueByServiceTypeByCurrency(scoped)) || [];
        return buildRevenueByService(currencyRows, reportingCurrency);
      } catch (error) {
        logger?.warn?.(
          { module: "reports", error: error.message },
          "Revenue by service currency conversion failed; returning raw totals",
        );
        return repository.getRevenueByServiceType(scoped);
      }
    },

    async revenueByDestination(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Revenue by destination report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      if (!currencyService?.convert) {
        return repository.getRevenueByDestination(scoped);
      }

      try {
        const currencyRows =
          (await repository.getRevenueByDestinationByCurrency(scoped)) || [];
        return buildRevenueByDestination(currencyRows, reportingCurrency);
      } catch (error) {
        logger?.warn?.(
          { module: "reports", error: error.message },
          "Revenue by destination currency conversion failed; returning raw totals",
        );
        return repository.getRevenueByDestination(scoped);
      }
    },

    async targetVsAchievement(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Target vs achievement report",
      );
      return repository.getTargetVsAchievement(scoped);
    },

    async outstandingPayments(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Outstanding payments report",
      );
      return repository.getOutstandingPayments(scoped);
    },

    async paymentMode(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Payment mode report",
      );
      return repository.getPaymentModeReport(scoped);
    },

    async profitMargin(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Profit margin report",
      );
      return repository.getProfitMarginReport(scoped);
    },

    async visaSummary(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Visa summary report",
      );
      return repository.getVisaSummary(scoped);
    },

    async followupsToday(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Today follow-ups report",
      );
      return repository.getTodayFollowups(scoped);
    },

    async followupsMissed(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Missed follow-ups report",
      );
      return repository.getMissedFollowups(scoped);
    },

    async callLog(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Call log report",
      );
      return repository.getCallLogReport(scoped);
    },

    async activityFeed(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Lead activity feed (non-call)",
      );
      return repository.getLeadActivityFeed(scoped);
    },

    async monthlySummary(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Monthly summary report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      const rows = await repository.getMonthlySummary(scoped);

      if (!currencyService?.convert) {
        return rows.map((row) => ({
          ...row,
          currency: reportingCurrency,
        }));
      }

      const moneyRows =
        (await repository.getMonthlySummaryMoneyByCurrency(scoped)) || [];
      return attachMonthlySummaryCurrency(rows, moneyRows, reportingCurrency);
    },

    async executiveKpis(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Executive KPI dashboard pack",
      );
      const reportingCurrency = normalizeCurrency(scoped.currency);

      if (!currencyService?.convert) {
        const result = await repository.getExecutiveKpis(scoped);
        return {
          ...result,
          currency: reportingCurrency,
        };
      }

      try {
        const [
          result,
          bookingCurrencyRows,
          bookingCostRows,
          serviceCurrencyRows,
          rates,
        ] = await Promise.all([
          repository.getExecutiveKpis(scoped),
          repository.getExecutiveBookingRevenueByCurrency(scoped),
          repository.getExecutiveBookingCostByCurrency(scoped),
          repository.getExecutiveServiceRevenueByCurrency(scoped),
          loadCurrencyRates(),
        ]);

        const [convertedTotalRevenue, convertedCost, holidayRevenue, visaRevenue] =
          await Promise.all([
            sumConvertedAmounts(
              bookingCurrencyRows || [],
              "revenue",
              "currency",
              reportingCurrency,
              rates,
            ),
            sumConvertedAmounts(
              bookingCostRows || [],
              "cost",
              "currency",
              reportingCurrency,
              rates,
            ),
            sumConvertedAmounts(
              (serviceCurrencyRows || []).filter((row) => row.service_type !== "VISA"),
              "revenue",
              "currency",
              reportingCurrency,
              rates,
            ),
            sumConvertedAmounts(
              (serviceCurrencyRows || []).filter((row) => row.service_type === "VISA"),
              "revenue",
              "currency",
              reportingCurrency,
              rates,
            ),
          ]);

        const convertedProfit = Number(
          (convertedTotalRevenue - convertedCost).toFixed(2),
        );

        const totalBookings = toNumber(result?.totalBookings, 0);

        return {
          ...result,
          revenue: convertedTotalRevenue,
          cost: convertedCost,
          profit: convertedProfit,
          avgBookingValue:
            totalBookings > 0
              ? Number((convertedTotalRevenue / totalBookings).toFixed(2))
              : 0,
          avgMarginPercent:
            convertedTotalRevenue > 0
              ? Number(((convertedProfit / convertedTotalRevenue) * 100).toFixed(2))
              : 0,
          holidayRevenue,
          visaRevenue,
          currency: reportingCurrency,
        };
      } catch (error) {
        logger?.warn?.(
          {
            module: "reports",
            error: error.message,
          },
          "Executive KPI currency conversion failed; returning raw totals",
        );
        const result = await repository.getExecutiveKpis(scoped);
        return {
          ...result,
          currency: reportingCurrency,
        };
      }
    },

    async conversionFunnel(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Conversion funnel report",
      );
      return repository.getConversionFunnel(scoped);
    },

    async marketingPerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Marketing performance report",
      );
      return repository.getMarketingPerformance(scoped);
    },

    async supplierPerformance(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Supplier performance report",
      );
      return repository.getSupplierPerformance(scoped);
    },

    async pipelineForecast(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Pipeline forecast report",
      );
      return repository.getPipelineForecast(scoped);
    },

    async financeCostBreakup(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Finance cost breakup report",
      );
      const reportingCurrency = normalizeCurrency(
        scoped.currency || DEFAULT_REPORTING_CURRENCY,
      );
      const { currency: _targetCurrency, ...repoFilters } = scoped;
      const result = await repository.getFinanceCostBreakup(repoFilters);

      if (!currencyService?.convert) {
        return {
          ...result,
          currency: reportingCurrency,
        };
      }

      return convertFinanceCostBreakup(result, reportingCurrency);
    },

    async financeSupplierServices(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Finance supplier services report",
      );
      return repository.getFinanceSupplierServices(scoped);
    },
  });
}

export { createReportsService };
