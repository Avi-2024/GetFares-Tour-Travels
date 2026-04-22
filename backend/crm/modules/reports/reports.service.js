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
    async leadsBySource(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Lead source report",
      );
      return repository.getLeadsBySource(filters);
    },

    async leadsByConsultant(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Lead consultant report",
      );
      return repository.getLeadsByConsultant(filters);
    },

    async leadAging(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Lead aging report",
      );
      return repository.getLeadAgingReport(filters);
    },

    async lostLeads(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Lost leads report",
      );
      return repository.getLostLeadReport(filters);
    },

    async revenueByMonth(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Revenue by month report",
      );
      return repository.getRevenueByMonth(filters);
    },

    async revenueByServiceType(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Revenue by service type report",
      );
      return repository.getRevenueByServiceType(filters);
    },

    async revenueByDestination(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Revenue by destination report",
      );
      return repository.getRevenueByDestination(filters);
    },

    async targetVsAchievement(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Target vs achievement report",
      );
      return repository.getTargetVsAchievement(filters);
    },

    async outstandingPayments(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Outstanding payments report",
      );
      return repository.getOutstandingPayments(filters);
    },

    async paymentMode(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Payment mode report",
      );
      return repository.getPaymentModeReport(filters);
    },

    async profitMargin(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Profit margin report",
      );
      return repository.getProfitMarginReport(filters);
    },

    async visaSummary(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Visa summary report",
      );
      return repository.getVisaSummary(filters);
    },

    async followupsToday(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Today follow-ups report",
      );
      return repository.getTodayFollowups(filters);
    },

    async followupsMissed(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Missed follow-ups report",
      );
      return repository.getMissedFollowups(filters);
    },

    async callLog(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Call log report",
      );
      return repository.getCallLogReport(filters);
    },

    async monthlySummary(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Monthly summary report",
      );
      return repository.getMonthlySummary(filters);
    },

    async executiveKpis(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Executive KPI dashboard pack",
      );
      const enrichedFilters = {
        ...filters,
        userId: context.user?.id,
      };
      const result = await repository.getExecutiveKpis(enrichedFilters);
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
          (await repository.getExecutiveBookingRevenueByCurrency(
            enrichedFilters,
          )) || [];

        const convertedTotalRevenue = await sumConvertedAmounts(
          bookingCurrencyRows,
          "revenue",
          "currency",
          reportingCurrency,
        );

        const serviceCurrencyRows =
          (await repository.getExecutiveServiceRevenueByCurrency(
            enrichedFilters,
          )) || [];

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

        const convertedCost = await convertAmountToCurrency(
          toNumber(result?.cost, 0),
          normalizeCurrency(result?.currency, reportingCurrency),
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
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Conversion funnel report",
      );
      return repository.getConversionFunnel(filters);
    },

    async marketingPerformance(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Marketing performance report",
      );
      return repository.getMarketingPerformance(filters);
    },

    async supplierPerformance(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Supplier performance report",
      );
      return repository.getSupplierPerformance(filters);
    },

    async pipelineForecast(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Pipeline forecast report",
      );
      return repository.getPipelineForecast(filters);
    },

    async financeCostBreakup(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Finance cost breakup report",
      );
      return repository.getFinanceCostBreakup(filters);
    },

    async financeSupplierServices(filters = {}, context = {}) {
      logger.debug(
        { module: "reports", requestId: context.requestId, filters },
        "Finance supplier services report",
      );
      return repository.getFinanceSupplierServices(filters);
    },
  });
}

export { createReportsService };
