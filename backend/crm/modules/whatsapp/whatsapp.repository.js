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

  return Object.freeze({
    findActiveChannelByPhoneNumberId,
    findActiveChannelByCountry,
    listActiveChannels,
  });
}

export { createWhatsappRepository };
