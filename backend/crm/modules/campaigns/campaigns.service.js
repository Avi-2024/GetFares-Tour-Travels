import { AppError } from "../../core/errors/index.js";

function normalizeCurrency(value, fallback = "AED") {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return normalized || fallback;
}

function normalizeCampaignCountry(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  if (/^india$/i.test(normalized)) {
    return "India";
  }

  if (/^(uae|united arab emirates)$/i.test(normalized)) {
    return "UAE";
  }

  return normalized;
}

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    source: filters.source,
    country: normalizeCampaignCountry(filters.country),
    name: filters.name,
    meta_campaign_id: filters.metaCampaignId,
  };
}

function getRequestedRevenueCurrency(filters = {}, currencyService) {
  return normalizeCurrency(
    filters.targetCurrency || currencyService?.baseCurrency || "AED",
  );
}

function matchesCampaignSearch(entity, search) {
  const term = String(search || "").trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [
    entity?.name,
    entity?.country,
    entity?.source,
    entity?.meta_campaign_id,
  ].some((value) => String(value || "").toLowerCase().includes(term));
}

function getCampaignStatus(entity) {
  const today = new Date().toISOString().slice(0, 10);
  const actualSpend = Number(entity?.actual_spend || 0);
  const leadsGenerated = Number(entity?.leads_generated || 0);
  const revenueGenerated = Number(entity?.revenue_generated || 0);
  const endDate = entity?.end_date ? String(entity.end_date).slice(0, 10) : "";

  if (endDate && endDate < today) {
    return "COMPLETED";
  }

  if (actualSpend > 0 || leadsGenerated > 0 || revenueGenerated > 0) {
    return "ACTIVE";
  }

  return "DRAFT";
}

function matchesCampaignDateRange(entity, filters = {}) {
  const startDate = filters.startDate ? String(filters.startDate).slice(0, 10) : "";
  const endDate = filters.endDate ? String(filters.endDate).slice(0, 10) : "";
  const campaignStartDate = entity?.start_date ? String(entity.start_date).slice(0, 10) : "";
  const campaignEndDate = entity?.end_date ? String(entity.end_date).slice(0, 10) : "";

  if (startDate && (!campaignStartDate || campaignStartDate < startDate)) {
    return false;
  }

  if (endDate && (!campaignEndDate || campaignEndDate > endDate)) {
    return false;
  }

  return true;
}

function matchesCampaignFilters(entity, filters = {}) {
  if (!matchesCampaignSearch(entity, filters.search)) {
    return false;
  }

  if (!matchesCampaignDateRange(entity, filters)) {
    return false;
  }

  if (filters.status && getCampaignStatus(entity) !== filters.status) {
    return false;
  }

  return true;
}

function buildSummary(rows = [], revenueCurrency = "AED") {
  return rows.reduce(
    (acc, item) => ({
      campaignsCount: acc.campaignsCount + 1,
      budget: acc.budget + Number(item?.budget || 0),
      actualSpend: acc.actualSpend + Number(item?.actual_spend || 0),
      leadsGenerated: acc.leadsGenerated + Number(item?.leads_generated || 0),
      revenueGenerated: acc.revenueGenerated + Number(item?.revenue_generated || 0),
      revenueCurrency: acc.revenueCurrency,
    }),
    {
      campaignsCount: 0,
      budget: 0,
      actualSpend: 0,
      leadsGenerated: 0,
      revenueGenerated: 0,
      revenueCurrency,
    },
  );
}

async function convertCampaignRevenue(
  amount,
  fromCurrency,
  toCurrency,
  currencyService,
  logger,
  rates,
) {
  const normalizedFrom = normalizeCurrency(fromCurrency, toCurrency);
  const normalizedTo = normalizeCurrency(toCurrency, "AED");
  const amountNumber = Number(amount || 0);

  if (!amountNumber) {
    return 0;
  }

  if (
    !currencyService ||
    typeof currencyService.convert !== "function" ||
    normalizedFrom === normalizedTo
  ) {
    return amountNumber;
  }

  try {
    if (
      rates &&
      currencyService &&
      typeof currencyService.convertWithRates === "function"
    ) {
      return currencyService.convertWithRates(
        amountNumber,
        normalizedFrom,
        normalizedTo,
        rates,
      );
    }

    return await currencyService.convert(
      amountNumber,
      normalizedFrom,
      normalizedTo,
    );
  } catch (error) {
    logger?.warn?.(
      {
        module: "campaigns",
        amount: amountNumber,
        fromCurrency: normalizedFrom,
        toCurrency: normalizedTo,
        error: error.message,
      },
      "Currency conversion failed for campaign revenue",
    );
    return amountNumber;
  }
}

async function getCampaignRevenueRates(currencyService, logger) {
  if (
    !currencyService ||
    typeof currencyService.getRates !== "function" ||
    typeof currencyService.convertWithRates !== "function"
  ) {
    return null;
  }

  try {
    const result = await currencyService.getRates();
    return result?.rates || null;
  } catch (error) {
    logger?.warn?.(
      { module: "campaigns", error: error.message },
      "Failed to preload currency rates for campaign revenue",
    );
    return null;
  }
}

async function hydrateCampaignRevenue(
  repository,
  currencyService,
  logger,
  rows = [],
  targetCurrency = "AED",
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const revenueCurrency = normalizeCurrency(targetCurrency, "AED");
  const rates = await getCampaignRevenueRates(currencyService, logger);
  const revenueBuckets = await repository.findRevenueBucketsByCampaignIds(
    rows.map((item) => item?.id).filter(Boolean),
  );
  const revenueByCampaignId = new Map();

  for (const bucket of revenueBuckets) {
    const campaignId = String(bucket?.campaign_id || "");
    if (!campaignId) {
      continue;
    }

    const convertedAmount = await convertCampaignRevenue(
      bucket?.revenue_generated,
      bucket?.revenue_currency,
      revenueCurrency,
      currencyService,
      logger,
      rates,
    );

    revenueByCampaignId.set(
      campaignId,
      Number(revenueByCampaignId.get(campaignId) || 0) + Number(convertedAmount || 0),
    );
  }

  return rows.map((item) => ({
    ...item,
    revenue_generated: revenueByCampaignId.get(String(item.id)) ?? Number(item?.revenue_generated || 0),
    revenue_currency: revenueCurrency,
  }));
}

function mapCreatePayload(payload) {
  return {
    name: payload.name,
    country: normalizeCampaignCountry(payload.country),
    source: payload.source,
    budget: payload.budget,
    actual_spend: payload.actualSpend,
    leads_generated: payload.leadsGenerated,
    revenue_generated: payload.revenueGenerated,
    meta_campaign_id: payload.metaCampaignId,
    meta_adset_id: payload.metaAdsetId,
    meta_ad_id: payload.metaAdId,
    start_date: payload.startDate,
    end_date: payload.endDate,
  };
}

function mapUpdatePayload(payload) {
  return {
    name: payload.name,
    country: normalizeCampaignCountry(payload.country),
    source: payload.source,
    budget: payload.budget,
    actual_spend: payload.actualSpend,
    leads_generated: payload.leadsGenerated,
    revenue_generated: payload.revenueGenerated,
    meta_campaign_id: payload.metaCampaignId,
    meta_adset_id: payload.metaAdsetId,
    meta_ad_id: payload.metaAdId,
    start_date: payload.startDate,
    end_date: payload.endDate,
  };
}

function toCampaign(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    name: entity.name,
    country: normalizeCampaignCountry(entity.country) || "Other",
    source: entity.source,
    budget: entity.budget,
    actualSpend: entity.actual_spend,
    leadsGenerated: entity.leads_generated,
    revenueGenerated: entity.revenue_generated,
    revenueCurrency: normalizeCurrency(entity.revenue_currency || "AED"),
    metaCampaignId: entity.meta_campaign_id,
    metaAdsetId: entity.meta_adset_id,
    metaAdId: entity.meta_ad_id,
    startDate: entity.start_date,
    endDate: entity.end_date,
    createdAt: entity.created_at,
  };
}

function createCampaignsService({ repository, leadsRepository, logger, events, currencyService }) {
  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      {
        module: "campaigns",
        requestId: context.requestId,
        filters: mappedFilters,
      },
      "Listing records",
    );
    const rows = await repository.findAll(mappedFilters);
    const hydratedRows = await hydrateCampaignRevenue(
      repository,
      currencyService,
      logger,
      rows,
      getRequestedRevenueCurrency(filters, currencyService),
    );
    return hydratedRows.map(toCampaign);
  }

  async function summary(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      {
        module: "campaigns",
        requestId: context.requestId,
        filters: mappedFilters,
        summaryFilters: {
          search: filters.search || null,
          status: filters.status || null,
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
        },
      },
      "Calculating campaign summary",
    );

    const rows = await repository.findAll(mappedFilters);
    const hydratedRows = await hydrateCampaignRevenue(
      repository,
      currencyService,
      logger,
      rows,
      getRequestedRevenueCurrency(filters, currencyService),
    );
    const filteredRows = hydratedRows.filter((item) =>
      matchesCampaignFilters(item, filters),
    );
    return buildSummary(
      filteredRows,
      getRequestedRevenueCurrency(filters, currencyService),
    );
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "campaigns", requestId: context.requestId, id },
      "Getting record by id",
    );
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, "Campaigns not found", "CAMPAIGNS_NOT_FOUND");
    }

    const [hydratedItem] = await hydrateCampaignRevenue(
      repository,
      currencyService,
      logger,
      [item],
      getRequestedRevenueCurrency({}, currencyService),
    );
    return toCampaign(hydratedItem || item);
  }

  async function create(payload) {
    const created = await repository.create(mapCreatePayload(payload));
    events.emitCreated(created);
    return toCampaign(created);
  }

  async function duplicate(id, context = {}) {
    const item = await getById(id, context);
    return create({
      name: `${item.name} (Copy)`,
      source: item.source,
      budget: item.budget,
      actualSpend: 0,
      leadsGenerated: 0,
      revenueGenerated: 0,
      startDate: item.startDate,
      endDate: item.endDate,
    });
  }

  async function update(id, payload, context = {}) {
    await getById(id, context);

    const updated = await repository.update(id, mapUpdatePayload(payload));
    events.emitUpdated(updated);
    return toCampaign(updated);
  }

  async function remove(id, context = {}) {
    await getById(id, context);
    await repository.remove(id);
    return { id };
  }

  return Object.freeze({
    list,
    summary,
    getById,
    create,
    duplicate,
    update,
    remove,
  });
}

export { createCampaignsService };
