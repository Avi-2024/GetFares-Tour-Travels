import { randomUUID, createHash } from "node:crypto";

function createPushRepository({ db, logger, schema }) {
  function toEndpointHash(endpoint) {
    return createHash("sha256").update(String(endpoint || "")).digest("hex");
  }

  function toSubscription(row) {
    if (!row) return null;
    let subscription = row.subscription;
    if (typeof subscription === "string") {
      try {
        subscription = JSON.parse(subscription);
      } catch {
        subscription = null;
      }
    }
    return {
      id: row.id,
      userId: row.user_id ?? row.userId,
      endpoint: row.endpoint,
      subscription,
      userAgent: row.user_agent ?? row.userAgent ?? null,
      lastSeenAt: row.last_seen_at ?? row.lastSeenAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  async function listByUserIdRaw(userId) {
    const sql = `
      SELECT *
      FROM ${schema.tableName}
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows.map(toSubscription).filter(Boolean);
  }

  async function listByUserId(userId) {
    try {
      if (typeof db.query === "function") {
        return await listByUserIdRaw(userId);
      }
      const rows = await db.findMany(schema.tableName, { user_id: userId });
      return rows.map(toSubscription).filter(Boolean);
    } catch (error) {
      logger.warn({ err: error, module: "push" }, "Failed to list subscriptions");
      return [];
    }
  }

  async function upsertSubscription({ userId, endpoint, subscription, userAgent }) {
    const nowIso = new Date().toISOString();
    const endpointHash = toEndpointHash(endpoint);

    // Try update first (works across adapters).
    try {
      if (typeof db.query === "function") {
        await db.query(
          `
          UPDATE ${schema.tableName}
          SET
            subscription = ?,
            user_agent = ?,
            last_seen_at = COALESCE(last_seen_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND endpoint_hash = ?
        `,
          [JSON.stringify(subscription), userAgent || null, userId, endpointHash],
        );
      }
    } catch (error) {
      logger.debug(
        { err: error, module: "push" },
        "Push subscription update failed, will insert",
      );
    }

    // Insert, ignore duplicates.
    try {
      const created = await db.insert(schema.tableName, {
        id: randomUUID(),
        user_id: userId,
        endpoint,
        endpoint_hash: endpointHash,
        subscription,
        user_agent: userAgent || null,
        last_seen_at: nowIso,
      });
      return toSubscription(created);
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        // Duplicate key. Return latest row.
        const rows = await listByUserId(userId);
        return rows.find((row) => row.endpoint === endpoint) || null;
      }
      throw error;
    }
  }

  async function deleteByEndpoint({ userId, endpoint }) {
    if (typeof db.query !== "function") {
      // In-memory adapter: best-effort no-op.
      return 0;
    }
    const endpointHash = toEndpointHash(endpoint);
    const result = await db.query(
      `DELETE FROM ${schema.tableName} WHERE user_id = ? AND endpoint_hash = ?`,
      [userId, endpointHash],
    );
    return Number(result.rowCount || 0);
  }

  return Object.freeze({
    toSubscription,
    listByUserId,
    upsertSubscription,
    deleteByEndpoint,
  });
}

export { createPushRepository };

