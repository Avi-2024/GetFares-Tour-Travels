function createNotificationsRepository({ db, logger, schema }) {
  function toNotification(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      eventName: row.event_name ?? row.eventName,
      channel: row.channel,
      entityType: row.entity_type ?? row.entityType ?? null,
      entityId: row.entity_id ?? row.entityId ?? null,
      title: row.title ?? null,
      message: row.message ?? null,
      payload: row.payload || {},
      recipientUserId: row.recipient_user_id ?? row.recipientUserId ?? null,
      recipientRole: row.recipient_role ?? row.recipientRole ?? null,
      recipientTeamId: row.recipient_team_id ?? row.recipientTeamId ?? null,
      status: row.status,
      deliveryAttempts: Number(row.delivery_attempts ?? row.deliveryAttempts ?? 0),
      deliveredAt: row.delivered_at ?? row.deliveredAt ?? null,
      readAt: row.read_at ?? row.readAt ?? null,
      lastError: row.last_error ?? row.lastError ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  function isRecipientMatch(row, identity = {}) {
    if (!row) {
      return false;
    }

    const userId = identity.userId ? String(identity.userId) : null;
    const role = identity.role ? String(identity.role) : null;
    const teamId = identity.teamId ? String(identity.teamId) : null;

    const recipientUserId = row.recipient_user_id || row.recipientUserId || null;
    const recipientRole = row.recipient_role || row.recipientRole || null;
    const recipientTeamId = row.recipient_team_id || row.recipientTeamId || null;

    if (!recipientUserId && !recipientRole && !recipientTeamId) {
      return true;
    }

    if (userId && recipientUserId && String(recipientUserId) === userId) {
      return true;
    }

    if (role && recipientRole && String(recipientRole) === role) {
      return true;
    }

    if (teamId && recipientTeamId && String(recipientTeamId) === teamId) {
      return true;
    }

    return false;
  }

  async function listForUserRaw(identity, query) {
    const sql = `
      SELECT *
      FROM ${schema.tableName}
      WHERE (
        recipient_user_id = $1
        OR ($2::text IS NOT NULL AND recipient_role = $2)
        OR ($3::uuid IS NOT NULL AND recipient_team_id = $3)
        OR (recipient_user_id IS NULL AND recipient_role IS NULL AND recipient_team_id IS NULL)
      )
      AND ($4::text IS NULL OR status = $4)
      ORDER BY created_at DESC
      LIMIT $5 OFFSET $6
    `;

    const params = [
      identity.userId || null,
      identity.role || null,
      identity.teamId || null,
      query.status || null,
      query.limit,
      query.offset,
    ];

    const result = await db.query(sql, params);
    return result.rows.map(toNotification);
  }

  async function countForUserRaw(identity, query) {
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM ${schema.tableName}
      WHERE (
        recipient_user_id = $1
        OR ($2::text IS NOT NULL AND recipient_role = $2)
        OR ($3::uuid IS NOT NULL AND recipient_team_id = $3)
        OR (recipient_user_id IS NULL AND recipient_role IS NULL AND recipient_team_id IS NULL)
      )
      AND ($4::text IS NULL OR status = $4)
    `;

    const params = [
      identity.userId || null,
      identity.role || null,
      identity.teamId || null,
      query.status || null,
    ];

    const result = await db.query(sql, params);
    return Number(result.rows[0]?.total || 0);
  }

  async function markAllReadRaw(identity) {
    const sql = `
      UPDATE ${schema.tableName}
      SET
        status = $4,
        read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE status <> $4
      AND (
        recipient_user_id = $1
        OR ($2::text IS NOT NULL AND recipient_role = $2)
        OR ($3::uuid IS NOT NULL AND recipient_team_id = $3)
        OR (recipient_user_id IS NULL AND recipient_role IS NULL AND recipient_team_id IS NULL)
      )
      RETURNING id
    `;

    const params = [identity.userId || null, identity.role || null, identity.teamId || null, schema.statuses.READ];
    const result = await db.query(sql, params);
    return result.rows.length;
  }

  function canUseRawQuery() {
    return typeof db.query === 'function' && db.pool;
  }

  return Object.freeze({
    toNotification,
    isRecipientMatch,

    async create(payload) {
      logger.debug(
        {
          module: 'notifications',
          eventName: payload.eventName,
          recipientUserId: payload.recipientUserId || null,
          recipientRole: payload.recipientRole || null,
        },
        'Persisting notification event',
      );

      const created = await db.insert(schema.tableName, {
        event_name: payload.eventName,
        channel: payload.channel,
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        title: payload.title || null,
        message: payload.message || null,
        payload: payload.payload || {},
        recipient_user_id: payload.recipientUserId || null,
        recipient_role: payload.recipientRole || null,
        recipient_team_id: payload.recipientTeamId || null,
        status: payload.status || schema.statuses.PENDING,
        delivery_attempts: payload.deliveryAttempts || 0,
        delivered_at: payload.deliveredAt || null,
        read_at: payload.readAt || null,
        last_error: payload.lastError || null,
      });

      return toNotification(created);
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toNotification(row);
    },

    async listForUser(identity, query) {
      if (canUseRawQuery()) {
        return listForUserRaw(identity, query);
      }

      const rows = await db.findMany(schema.tableName, {});
      const filtered = rows
        .filter((row) => isRecipientMatch(row, identity))
        .filter((row) => (query.status ? row.status === query.status : true))
        .sort((left, right) => {
          const leftDate = new Date(left.created_at || left.createdAt || 0).getTime();
          const rightDate = new Date(right.created_at || right.createdAt || 0).getTime();
          return rightDate - leftDate;
        });

      return filtered.slice(query.offset, query.offset + query.limit).map(toNotification);
    },

    async countForUser(identity, query = {}) {
      if (canUseRawQuery()) {
        return countForUserRaw(identity, query);
      }

      const rows = await db.findMany(schema.tableName, {});
      return rows.filter((row) => isRecipientMatch(row, identity)).filter((row) => (query.status ? row.status === query.status : true))
        .length;
    },

    async countUnreadForUser(identity) {
      if (canUseRawQuery()) {
        const sql = `
          SELECT COUNT(*)::int AS total
          FROM ${schema.tableName}
          WHERE status <> $4
          AND (
            recipient_user_id = $1
            OR ($2::text IS NOT NULL AND recipient_role = $2)
            OR ($3::uuid IS NOT NULL AND recipient_team_id = $3)
            OR (recipient_user_id IS NULL AND recipient_role IS NULL AND recipient_team_id IS NULL)
          )
        `;
        const result = await db.query(sql, [identity.userId || null, identity.role || null, identity.teamId || null, schema.statuses.READ]);
        return Number(result.rows[0]?.total || 0);
      }

      const rows = await db.findMany(schema.tableName, {});
      return rows.filter((row) => isRecipientMatch(row, identity)).filter((row) => row.status !== schema.statuses.READ).length;
    },

    async markDeliveryAttempt(id, deliveryResult) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }

      const isDeferredDelivery =
        !deliveryResult.delivered &&
        ['NO_ACTIVE_SOCKET', 'SOCKET_SERVER_NOT_ATTACHED'].includes(deliveryResult.error);

      const nextAttempts = isDeferredDelivery
        ? Number(existing.delivery_attempts || 0)
        : Number(existing.delivery_attempts || 0) + 1;

      const nextStatus = isDeferredDelivery
        ? schema.statuses.PENDING
        : deliveryResult.delivered
          ? schema.statuses.DELIVERED
          : schema.statuses.FAILED;

      const nowIso = new Date().toISOString();

      const updated = await db.update(schema.tableName, id, {
        status: existing.read_at ? schema.statuses.READ : nextStatus,
        delivery_attempts: nextAttempts,
        delivered_at: deliveryResult.delivered ? nowIso : existing.delivered_at || null,
        last_error: isDeferredDelivery ? null : deliveryResult.delivered ? null : deliveryResult.error || 'DELIVERY_FAILED',
        updated_at: nowIso,
      });

      return toNotification(updated);
    },

    async markRead(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const updated = await db.update(schema.tableName, id, {
        status: schema.statuses.READ,
        read_at: existing.read_at || nowIso,
        updated_at: nowIso,
      });

      return toNotification(updated);
    },

    async markAllRead(identity) {
      if (canUseRawQuery()) {
        return markAllReadRaw(identity);
      }

      const rows = await db.findMany(schema.tableName, {});
      let updatedCount = 0;

      for (const row of rows) {
        if (!isRecipientMatch(row, identity)) {
          continue;
        }
        if (row.status === schema.statuses.READ) {
          continue;
        }

        await db.update(schema.tableName, row.id, {
          status: schema.statuses.READ,
          read_at: row.read_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        updatedCount += 1;
      }

      return updatedCount;
    },
  });
}

module.exports = { createNotificationsRepository };
