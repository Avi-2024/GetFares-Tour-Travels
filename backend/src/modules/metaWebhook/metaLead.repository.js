function createMetaLeadRepository({ db, logger }) {
  const tableName = "leads";

  async function findByMetaLeadId(metaLeadId) {
    if (!metaLeadId) {
      return null;
    }

    try {
      return await db.findOne(tableName, { meta_lead_id: metaLeadId });
    } catch (error) {
      logger?.error(
        { err: error, metaLeadId },
        "Failed to look up Meta lead id",
      );
      throw error;
    }
  }

  async function attachMetaLeadId(leadId, metaLeadId) {
    if (!leadId || !metaLeadId) {
      return null;
    }

    try {
      return await db.update(tableName, leadId, { meta_lead_id: metaLeadId });
    } catch (error) {
      logger?.error(
        { err: error, leadId, metaLeadId },
        "Failed to attach Meta lead id",
      );
      throw error;
    }
  }

  return Object.freeze({
    findByMetaLeadId,
    attachMetaLeadId,
  });
}

export { createMetaLeadRepository };
