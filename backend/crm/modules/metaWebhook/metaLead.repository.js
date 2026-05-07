function toPageConfig(row, country = null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pageId: row.page_id ?? row.pageId ?? null,
    pageName: row.page_name ?? row.pageName ?? null,
    countryId: row.country_id ?? row.countryId ?? null,
    countryCode:
      country?.code ??
      row.country_code ??
      row.countryCode ??
      null,
    countryName:
      country?.name ??
      row.country_name ??
      row.countryName ??
      null,
    sourceLabel: row.source_label ?? row.sourceLabel ?? null,
    accessToken: row.access_token ?? row.accessToken ?? null,
    appSecret: row.app_secret ?? row.appSecret ?? null,
    verifyToken: row.verify_token ?? row.verifyToken ?? null,
    graphVersion: row.graph_version ?? row.graphVersion ?? null,
    isActive: row.is_active ?? row.isActive ?? true,
  };
}

function createMetaLeadRepository({ db, logger }) {
  const leadsTableName = "leads";
  const pageConfigsTableName = "meta_page_configs";
  const eventsTableName = "meta_webhook_events";
  const countriesTableName = "countries";
  const campaignsTableName = "campaigns";

  function isMissingTableError(error) {
    return String(error?.code || "").toUpperCase() === "ER_NO_SUCH_TABLE";
  }

  async function hydratePageConfig(row) {
    if (!row) {
      return null;
    }

    const countryId = row.country_id ?? row.countryId ?? null;
    const country = countryId ? await db.findById(countriesTableName, countryId) : null;
    return toPageConfig(row, country);
  }

  async function findByMetaLeadId(metaLeadId) {
    if (!metaLeadId) {
      return null;
    }

    try {
      return await db.findOne(leadsTableName, { meta_lead_id: metaLeadId });
    } catch (error) {
      logger?.error(
        { err: error, metaLeadId },
        "Failed to look up Meta lead id",
      );
      throw error;
    }
  }

  async function attachMetaLeadId(leadId, metaLeadId) {
    if (!leadId || !metaLeadId) return null;

    try {
      return await db.update(leadsTableName, leadId, { meta_lead_id: metaLeadId });
    } catch (error) {
      logger?.error(
        { err: error, leadId, metaLeadId },
        "Failed to attach Meta lead id",
      );
      throw error;
    }
  }

  async function attachMetaAttributes(leadId, payload = {}) {
    if (!leadId) {
      return null;
    }

    try {
      return await db.update(leadsTableName, leadId, {
        meta_lead_id: payload.metaLeadId || null,
        meta_page_id: payload.metaPageId || null,
        meta_form_id: payload.metaFormId || null,
        meta_ad_id: payload.metaAdId || null,
        meta_adset_id: payload.metaAdsetId || null,
        meta_campaign_id: payload.metaCampaignId || null,
      });
    } catch (error) {
      logger?.error(
        { err: error, leadId, payload },
        "Failed to attach Meta attributes",
      );
      throw error;
    }
  }

  async function findPageConfigByPageId(pageId) {
    if (!pageId) {
      return null;
    }

    try {
      const row = await db.findOne(pageConfigsTableName, {
        page_id: String(pageId),
        is_active: true,
      });
      return hydratePageConfig(row);
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: pageConfigsTableName, pageId },
          "Meta page config table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, pageId },
        "Failed to look up Meta page config",
      );
      throw error;
    }
  }

  async function listActivePageConfigs() {
    try {
      const rows = await db.findMany(pageConfigsTableName, { is_active: true });
      const hydrated = [];
      for (const row of rows) {
        hydrated.push(await hydratePageConfig(row));
      }
      return hydrated.filter(Boolean);
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: pageConfigsTableName },
          "Meta page config table is missing",
        );
        return [];
      }
      logger?.error({ err: error }, "Failed to list Meta page configs");
      throw error;
    }
  }

  async function findCampaignByMetaCampaignId(metaCampaignId) {
    if (!metaCampaignId) {
      return null;
    }

    try {
      return await db.findOne(campaignsTableName, {
        meta_campaign_id: String(metaCampaignId),
      });
    } catch (error) {
      logger?.warn(
        { err: error, metaCampaignId },
        "Failed to look up campaign by Meta campaign id",
      );
      return null;
    }
  }

  async function createCampaign(payload = {}) {
    try {
      return await db.insert(campaignsTableName, {
        name: payload.name || null,
        country: payload.country || null,
        source: payload.source || null,
        budget: payload.budget ?? 0,
        actual_spend: payload.actualSpend ?? 0,
        leads_generated: payload.leadsGenerated ?? 0,
        revenue_generated: payload.revenueGenerated ?? 0,
        meta_campaign_id: payload.metaCampaignId || null,
        meta_adset_id: payload.metaAdsetId || null,
        meta_ad_id: payload.metaAdId || null,
        start_date: payload.startDate || null,
        end_date: payload.endDate || null,
      });
    } catch (error) {
      logger?.error(
        { err: error, payload },
        "Failed to create campaign from Meta webhook",
      );
      throw error;
    }
  }

  async function updateCampaign(id, payload = {}) {
    if (!id) {
      return null;
    }

    try {
      return await db.update(campaignsTableName, id, {
        name: payload.name,
        country: payload.country,
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
      });
    } catch (error) {
      logger?.error(
        { err: error, id, payload },
        "Failed to update campaign from Meta webhook",
      );
      throw error;
    }
  }

  async function findWebhookEventByKey(eventKey) {
    if (!eventKey) {
      return null;
    }

    try {
      return await db.findOne(eventsTableName, { event_key: String(eventKey) });
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: eventsTableName, eventKey },
          "Meta webhook events table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, eventKey },
        "Failed to find Meta webhook event",
      );
      throw error;
    }
  }

  async function createWebhookEvent(payload = {}) {
    try {
      return await db.insert(eventsTableName, {
        page_id: payload.pageId || null,
        leadgen_id: payload.leadgenId || null,
        event_key: payload.eventKey,
        status: payload.status || "RECEIVED",
        error_code: payload.errorCode || null,
        error_message: payload.errorMessage || null,
        payload_json: payload.payloadJson || null,
        processed_at: payload.processedAt || null,
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: eventsTableName, payload },
          "Meta webhook events table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, payload },
        "Failed to create Meta webhook event",
      );
      throw error;
    }
  }

  async function updateWebhookEvent(id, payload = {}) {
    if (!id) {
      return null;
    }

    try {
      return await db.update(eventsTableName, id, {
        status: payload.status,
        error_code: payload.errorCode || null,
        error_message: payload.errorMessage || null,
        processed_at: payload.processedAt || null,
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: eventsTableName, id, payload },
          "Meta webhook events table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, id, payload },
        "Failed to update Meta webhook event",
      );
      throw error;
    }
  }

  return Object.freeze({
    attachMetaAttributes,
    attachMetaLeadId,
    createWebhookEvent,
    findByMetaLeadId,
    createCampaign,
    updateCampaign,
    findCampaignByMetaCampaignId,
    findPageConfigByPageId,
    findWebhookEventByKey,
    listActivePageConfigs,
    updateWebhookEvent,
  });
}

export { createMetaLeadRepository };
