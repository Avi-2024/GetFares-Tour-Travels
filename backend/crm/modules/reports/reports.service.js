import {
  isSuperAdminRole,
  normalizeRoleName,
} from "../../core/constants/index.js";

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
  function normalizeCurrency(value, fallback = "AED") {
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

  async function convertAmountToCurrency(amount, fromCurrency, toCurrency) {
    const normalizedFrom = normalizeCurrency(fromCurrency);
    const normalizedTo = normalizeCurrency(toCurrency);
    const amountNumber = toNumber(amount, 0);
    if (amountNumber === 0 || normalizedFrom === normalizedTo) {
      return roundAmount(amountNumber);
    }
    if (!currencyService?.convert) {
      throw new Error("currencyService.convert is not available");
    }
    const converted = await currencyService.convert(
      amountNumber,
      normalizedFrom,
      normalizedTo,
    );
    return roundAmount(converted);
  }

  async function sumConvertedAmounts(rows = [], amountField, currencyField, targetCurrency) {
    const normalizedTarget = normalizeCurrency(targetCurrency);
    let total = 0;
    for (const row of rows) {
      const amount = toNumber(row?.[amountField], 0);
      const sourceCurrency = normalizeCurrency(row?.[currencyField], normalizedTarget);
      total += await convertAmountToCurrency(amount, sourceCurrency, normalizedTarget);
    }
    return roundAmount(total);
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
      return repository.getPeoplePerformance(scoped);
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
      return repository.getBookingPerformance(scoped);
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
      return repository.getRevenueByMonth(scoped);
    },

    async revenueByServiceType(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Revenue by service type report",
      );
      return repository.getRevenueByServiceType(scoped);
    },

    async revenueByDestination(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Revenue by destination report",
      );
      return repository.getRevenueByDestination(scoped);
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
      return repository.getMonthlySummary(scoped);
    },

    async executiveKpis(filters = {}, context = {}) {
      const scoped = mergeConsultantScope(filters, context);
      logger.debug(
        { module: "reports", requestId: context.requestId, filters: scoped },
        "Executive KPI dashboard pack",
      );
      const result = await repository.getExecutiveKpis(scoped);
      const reportingCurrency = normalizeCurrency(
        currencyService?.baseCurrency || result?.currency || "AED",
      );

      if (!currencyService?.convert) {
        return {
          ...result,
          currency: reportingCurrency,
        };
      }

      try {
        const bookingCurrencyRows =
          (await repository.getExecutiveBookingRevenueByCurrency(scoped)) || [];

        const convertedTotalRevenue = await sumConvertedAmounts(
          bookingCurrencyRows,
          "revenue",
          "currency",
          reportingCurrency,
        );

        const bookingCostRows =
          (await repository.getExecutiveBookingCostByCurrency(scoped)) || [];

        const convertedCost = await sumConvertedAmounts(
          bookingCostRows,
          "cost",
          "currency",
          reportingCurrency,
        );

        const serviceCurrencyRows =
          (await repository.getExecutiveServiceRevenueByCurrency(scoped)) || [];

        const holidayRevenue = await sumConvertedAmounts(
          serviceCurrencyRows.filter((row) => row.service_type !== "VISA"),
          "revenue",
          "currency",
          reportingCurrency,
        );
        const visaRevenue = await sumConvertedAmounts(
          serviceCurrencyRows.filter((row) => row.service_type === "VISA"),
          "revenue",
          "currency",
          reportingCurrency,
        );

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
      return repository.getFinanceCostBreakup(scoped);
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
