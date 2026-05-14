function toChannelConfig(row, country = null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    phoneNumberId: row.phone_number_id ?? row.phoneNumberId ?? null,
    displayPhoneNumber:
      row.display_phone_number ?? row.displayPhoneNumber ?? null,
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
    accessToken: row.access_token ?? row.accessToken ?? null,
    appSecret: row.app_secret ?? row.appSecret ?? null,
    verifyToken: row.verify_token ?? row.verifyToken ?? null,
    appId: row.app_id ?? row.appId ?? null,
    apiBaseUrl: row.api_base_url ?? row.apiBaseUrl ?? null,
    apiVersion: row.api_version ?? row.apiVersion ?? null,
    sourceLabel: row.source_label ?? row.sourceLabel ?? null,
    isActive: row.is_active ?? row.isActive ?? true,
  };
}

function createWhatsappRepository({ db, logger }) {
  const channelsTableName = "whatsapp_channel_configs";
  const countriesTableName = "countries";
  const messagesTableName = "whatsapp_conversation_messages";

  function isMissingTableError(error) {
    return String(error?.code || "").toUpperCase() === "ER_NO_SUCH_TABLE";
  }

  async function hydrateChannel(row) {
    if (!row) {
      return null;
    }

    const countryId = row.country_id ?? row.countryId ?? null;
    const country = countryId ? await db.findById(countriesTableName, countryId) : null;
    return toChannelConfig(row, country);
  }

  async function findActiveChannelByPhoneNumberId(phoneNumberId) {
    if (!phoneNumberId) {
      return null;
    }

    try {
      const row = await db.findOne(channelsTableName, {
        phone_number_id: String(phoneNumberId),
        is_active: true,
      });
      return hydrateChannel(row);
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: channelsTableName, phoneNumberId },
          "WhatsApp channel config table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, phoneNumberId },
        "Failed to look up WhatsApp channel by phone number id",
      );
      throw error;
    }
  }

  async function findActiveChannelByCountry({
    countryId,
    countryCode,
    countryName,
  } = {}) {
    const normalizedCountryId = String(countryId || "").trim();
    const normalizedCountryCode = String(countryCode || "")
      .trim()
      .toUpperCase();
    const normalizedCountryName = String(countryName || "")
      .trim()
      .toLowerCase();

    try {
      if (normalizedCountryId) {
        const row = await db.findOne(channelsTableName, {
          country_id: normalizedCountryId,
          is_active: true,
        });
        const channel = await hydrateChannel(row);
        if (channel) {
          return channel;
        }
      }

      if (normalizedCountryCode) {
        const row = await db.findOne(channelsTableName, {
          country_code: normalizedCountryCode,
          is_active: true,
        });
        const channel = await hydrateChannel(row);
        if (channel) {
          return channel;
        }
      }

      if (normalizedCountryName) {
        const countryRows = await db.findMany(countriesTableName, {});
        const match = countryRows.find(
          (row) =>
            String(row.name ?? "")
              .trim()
              .toLowerCase() === normalizedCountryName,
        );
        if (match?.id) {
          const row = await db.findOne(channelsTableName, {
            country_id: match.id,
            is_active: true,
          });
          const channel = await hydrateChannel(row);
          if (channel) {
            return channel;
          }
        }
      }

      return null;
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: channelsTableName, countryId, countryCode, countryName },
          "WhatsApp channel config table is missing",
        );
        return null;
      }
      logger?.error(
        { err: error, countryId, countryCode, countryName },
        "Failed to look up WhatsApp channel by country",
      );
      throw error;
    }
  }

  async function listActiveChannels() {
    try {
      const rows = await db.findMany(channelsTableName, {
        is_active: true,
      });
      const hydrated = [];
      for (const row of rows) {
        hydrated.push(await hydrateChannel(row));
      }
      return hydrated.filter(Boolean);
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: channelsTableName },
          "WhatsApp channel config table is missing",
        );
        return [];
      }
      logger?.error({ err: error }, "Failed to list active WhatsApp channels");
      throw error;
    }
  }

  async function insertConversationMessage(payload = {}) {
    if (!db?.query) {
      return null;
    }
    const id = String(payload.id || "").trim();
    const leadId = String(payload.leadId || payload.lead_id || "").trim();
    if (!id || !leadId) {
      return null;
    }
    const direction =
      String(payload.direction || "").toLowerCase() === "outbound" ?
        "outbound"
      : "inbound";
    const body = payload.body != null ? String(payload.body) : null;
    const waMessageId = payload.waMessageId ?? payload.wa_message_id ?? null;
    const phoneNumberId =
      payload.phoneNumberId ?? payload.phone_number_id ?? null;
    const displayPhoneNumber =
      payload.displayPhoneNumber ?? payload.display_phone_number ?? null;
    const peerPhone = String(payload.peerPhone ?? payload.peer_phone ?? "").trim();
    if (!peerPhone) {
      return null;
    }
    const waTimestampMs =
      payload.waTimestampMs ?? payload.wa_timestamp_ms ?? null;
    try {
      const sql = `
        INSERT INTO ${messagesTableName}
          (id, lead_id, direction, body, wa_message_id, phone_number_id, display_phone_number, peer_phone, wa_timestamp_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE id = id
      `;
      await db.query(sql, [
        id,
        leadId,
        direction,
        body,
        waMessageId,
        phoneNumberId,
        displayPhoneNumber,
        peerPhone,
        waTimestampMs,
      ]);
      return { id, leadId };
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: messagesTableName },
          "WhatsApp conversation messages table is missing",
        );
        return null;
      }
      logger?.error({ err: error }, "Failed to insert WhatsApp conversation message");
      throw error;
    }
  }

  async function listConversationMessages(leadId, { phoneNumberIds } = {}) {
    if (!db?.query || !leadId) {
      return [];
    }
    const params = [String(leadId).trim()];
    let extraWhere = "";
    if (Array.isArray(phoneNumberIds) && phoneNumberIds.length) {
      const placeholders = phoneNumberIds.map(() => "?").join(", ");
      extraWhere = ` AND phone_number_id IN (${placeholders})`;
      params.push(...phoneNumberIds.map((x) => String(x).trim()).filter(Boolean));
    }
    const sql = `
      SELECT *
      FROM ${messagesTableName}
      WHERE lead_id = ?${extraWhere}
      ORDER BY
        COALESCE(wa_timestamp_ms, UNIX_TIMESTAMP(created_at) * 1000) ASC,
        created_at ASC
    `;
    try {
      const { rows } = await db.query(sql, params);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: messagesTableName },
          "WhatsApp conversation messages table is missing",
        );
        return [];
      }
      logger?.error({ err: error, leadId }, "Failed to list WhatsApp conversation messages");
      throw error;
    }
  }

  async function countConversationThreads({ search, phoneNumberIds } = {}) {
    if (!db?.query) {
      return 0;
    }
    const phoneIds = Array.isArray(phoneNumberIds)
      ? phoneNumberIds.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const outerPhone =
      phoneIds.length ?
        ` AND w.phone_number_id IN (${phoneIds.map(() => "?").join(", ")}) `
      : "";
    const term = String(search || "").trim();
    let searchClause = "";
    const params = [];
    if (phoneIds.length) {
      params.push(...phoneIds);
    }
    if (term) {
      const like = `%${term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      searchClause =
        " AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.lead_code LIKE ? OR CAST(w.lead_id AS CHAR) LIKE ?) ";
      params.push(like, like, like, like);
    }
    const sql = `
      SELECT COUNT(*) AS thread_count
      FROM (
        SELECT w.lead_id
        FROM ${messagesTableName} w
        LEFT JOIN leads l ON l.id COLLATE utf8mb4_0900_ai_ci = w.lead_id COLLATE utf8mb4_0900_ai_ci
        WHERE 1 = 1 ${outerPhone}
        ${searchClause}
        GROUP BY w.lead_id
      ) t
    `;
    try {
      const { rows } = await db.query(sql, params);
      const row = rows?.[0];
      const n = Number(row?.thread_count ?? row?.THREAD_COUNT ?? 0);
      return Number.isFinite(n) ? n : 0;
    } catch (error) {
      if (isMissingTableError(error)) {
        return 0;
      }
      logger?.error({ err: error }, "Failed to count WhatsApp conversation threads");
      throw error;
    }
  }

  async function listConversationThreads({
    limit = 50,
    offset = 0,
    search,
    phoneNumberIds,
  } = {}) {
    if (!db?.query) {
      return [];
    }
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const off = Math.max(Number(offset) || 0, 0);
    const phoneIds = Array.isArray(phoneNumberIds)
      ? phoneNumberIds.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const outerPhone =
      phoneIds.length ?
        ` AND w.phone_number_id IN (${phoneIds.map(() => "?").join(", ")}) `
      : "";
    const subPhone =
      phoneIds.length ?
        ` AND w3.phone_number_id IN (${phoneIds.map(() => "?").join(", ")}) `
      : "";
    const term = String(search || "").trim();
    let searchClause = "";
    const params = [];
    if (phoneIds.length) {
      params.push(...phoneIds);
    }
    if (term) {
      const like = `%${term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      searchClause =
        " AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.lead_code LIKE ? OR CAST(w.lead_id AS CHAR) LIKE ?) ";
      params.push(like, like, like, like);
    }
    if (phoneIds.length) {
      params.push(...phoneIds);
    }
    params.push(lim, off);
    const sql = `
      SELECT
        w.lead_id AS lead_id,
        MAX(w.created_at) AS last_message_at,
        MAX(COALESCE(w.wa_timestamp_ms, UNIX_TIMESTAMP(w.created_at) * 1000)) AS last_sort_ms,
        (
          SELECT w3.body
          FROM ${messagesTableName} w3
          WHERE w3.lead_id = w.lead_id
          ${subPhone}
          ORDER BY COALESCE(w3.wa_timestamp_ms, UNIX_TIMESTAMP(w3.created_at) * 1000) DESC,
            w3.created_at DESC
          LIMIT 1
        ) AS last_body,
        MAX(l.full_name) AS full_name,
        MAX(l.phone) AS phone,
        MAX(l.lead_code) AS lead_code
      FROM ${messagesTableName} w
      LEFT JOIN leads l ON l.id COLLATE utf8mb4_0900_ai_ci = w.lead_id COLLATE utf8mb4_0900_ai_ci
      WHERE 1 = 1 ${outerPhone}
      ${searchClause}
      GROUP BY w.lead_id
      ORDER BY last_sort_ms DESC
      LIMIT ? OFFSET ?
    `;
    try {
      const { rows } = await db.query(sql, params);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      if (isMissingTableError(error)) {
        logger?.warn(
          { tableName: messagesTableName },
          "WhatsApp conversation messages table is missing",
        );
        return [];
      }
      logger?.error({ err: error }, "Failed to list WhatsApp conversation threads");
      throw error;
    }
  }

  return Object.freeze({
    findActiveChannelByPhoneNumberId,
    findActiveChannelByCountry,
    listActiveChannels,
    insertConversationMessage,
    listConversationMessages,
    countConversationThreads,
    listConversationThreads,
  });
}

export { createWhatsappRepository };
