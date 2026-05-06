function createCampaignsRepository({ db, logger, schema }) {
  async function queryRevenueBuckets(uniqueIds, currencyExpression) {
    const placeholders = uniqueIds.map(() => "?").join(", ");
    const sql = `
      SELECT
        c.id AS campaign_id,
        ${currencyExpression} AS revenue_currency,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE(b.status, '')) <> 'CANCELLED'
              THEN COALESCE(b.total_amount, 0)
              ELSE 0
            END
          ),
          0
        ) AS revenue_generated
      FROM ${schema.tableName} c
      LEFT JOIN leads l
        ON l.campaign_id = c.id
        OR (
          l.campaign_id IS NULL
          AND c.meta_campaign_id IS NOT NULL
          AND l.meta_campaign_id = c.meta_campaign_id
        )
      LEFT JOIN quotations q
        ON q.lead_id = l.id
      LEFT JOIN bookings b
        ON b.quotation_id = q.id
      WHERE c.id IN (${placeholders})
      GROUP BY
        c.id,
        ${currencyExpression}
    `;

    const result = await db.query(sql, uniqueIds);
    return Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : [];
  }

  async function findAll(filters = {}) {
    return db.findMany(schema.tableName, filters);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function findRevenueBucketsByCampaignIds(campaignIds = []) {
    const uniqueIds = [...new Set(campaignIds.filter(Boolean).map((id) => String(id)))];
    if (!uniqueIds.length) {
      return [];
    }

    const currencyExpressions = [
      "UPPER(COALESCE(NULLIF(b.client_currency, ''), 'INR'))",
      "UPPER(COALESCE(NULLIF(b.currency, ''), 'INR'))",
      "UPPER(COALESCE(NULLIF(q.client_currency, ''), 'INR'))",
      "'INR'",
    ];

    let lastError = null;

    for (const currencyExpression of currencyExpressions) {
      try {
        return await queryRevenueBuckets(uniqueIds, currencyExpression);
      } catch (error) {
        lastError = error;
        if (!/unknown column/i.test(String(error?.message || ""))) {
          throw error;
        }
        logger?.warn?.(
          {
            module: "campaigns",
            currencyExpression,
            error: error.message,
          },
          "Revenue currency expression failed",
        );
      }
    }

    if (lastError) {
      throw lastError;
    }

    return [];
  }

  async function findConvertedLeadBucketsByCampaignIds(campaignIds = []) {
    const uniqueIds = [...new Set(campaignIds.filter(Boolean).map((id) => String(id)))];
    if (!uniqueIds.length) {
      return [];
    }

    const placeholders = uniqueIds.map(() => "?").join(", ");
    const sql = `
      SELECT
        c.id AS campaign_id,
        COUNT(DISTINCT l.id) AS converted_leads
      FROM ${schema.tableName} c
      LEFT JOIN leads l
        ON l.campaign_id = c.id
        OR (
          l.campaign_id IS NULL
          AND c.meta_campaign_id IS NOT NULL
          AND l.meta_campaign_id = c.meta_campaign_id
        )
      WHERE c.id IN (${placeholders})
        AND UPPER(COALESCE(l.status, '')) = 'CONVERTED'
      GROUP BY c.id
    `;

    const result = await db.query(sql, uniqueIds);
    return Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : [];
  }

  async function create(payload) {
    logger.debug({ module: "campaigns", payload }, "Creating record");
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: "campaigns", id, payload }, "Updating record");
    return db.update(schema.tableName, id, payload);
  }

  async function remove(id) {
    logger.debug({ module: "campaigns", id }, "Deleting record");
    await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
    return { id };
  }

  return Object.freeze({
    findAll,
    findById,
    findRevenueBucketsByCampaignIds,
    findConvertedLeadBucketsByCampaignIds,
    create,
    update,
    remove,
  });
}

export { createCampaignsRepository };
