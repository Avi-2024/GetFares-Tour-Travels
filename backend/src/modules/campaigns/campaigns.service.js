const { AppError } = require('../../core/errors');

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    source: filters.source,
    name: filters.name,
    meta_campaign_id: filters.metaCampaignId,
  };
}

function mapCreatePayload(payload) {
  return {
    name: payload.name,
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
    source: entity.source,
    budget: entity.budget,
    actualSpend: entity.actual_spend,
    leadsGenerated: entity.leads_generated,
    revenueGenerated: entity.revenue_generated,
    metaCampaignId: entity.meta_campaign_id,
    metaAdsetId: entity.meta_adset_id,
    metaAdId: entity.meta_ad_id,
    startDate: entity.start_date,
    endDate: entity.end_date,
    createdAt: entity.created_at,
  };
}

function createCampaignsService({ repository, logger, events }) {
  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug({ module: 'campaigns', requestId: context.requestId, filters: mappedFilters }, 'Listing records');
    const rows = await repository.findAll(mappedFilters);
    return rows.map(toCampaign);
  }

  async function getById(id, context = {}) {
    logger.debug({ module: 'campaigns', requestId: context.requestId, id }, 'Getting record by id');
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, 'Campaigns not found', 'CAMPAIGNS_NOT_FOUND');
    }

    return toCampaign(item);
  }

  async function create(payload) {
    const created = await repository.create(mapCreatePayload(payload));
    events.emitCreated(created);
    return toCampaign(created);
  }

  async function update(id, payload, context = {}) {
    await getById(id, context);

    const updated = await repository.update(id, mapUpdatePayload(payload));
    events.emitUpdated(updated);
    return toCampaign(updated);
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
  });
}

module.exports = { createCampaignsService };
