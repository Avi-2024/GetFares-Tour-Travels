import { AppError } from "../../core/errors/index.js";

function createDestinationsService({ repository, logger, events }) {
  function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  function toIsoDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  function toDestination(row, currentPricing = null) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      country: row.country ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      createdAt: row.created_at ?? row.createdAt ?? null,
      currentPricing,
    };
  }

  function toPricing(row) {
    if (!row) return null;

    return {
      id: row.id,
      destinationId: row.destination_id ?? row.destinationId ?? null,
      baseCost: Number(row.base_cost ?? row.baseCost ?? 0),
      minProfitPercent: Number(
        row.min_profit_percent ?? row.minProfitPercent ?? 0,
      ),
      recommendedProfitPercent:
        row.recommended_profit_percent !== undefined &&
        row.recommended_profit_percent !== null
          ? Number(
              row.recommended_profit_percent ?? row.recommendedProfitPercent ?? 0,
            )
          : null,
      taxPercent: Number(row.tax_percent ?? row.taxPercent ?? 0),
      validFrom: row.valid_from ?? row.validFrom ?? null,
      validTo: row.valid_to ?? row.validTo ?? null,
      createdBy: row.created_by ?? row.createdBy ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function comparePricingRowsDesc(left, right) {
    const leftFrom = new Date(left.valid_from ?? left.validFrom ?? 0).getTime() || 0;
    const rightFrom =
      new Date(right.valid_from ?? right.validFrom ?? 0).getTime() || 0;

    if (leftFrom !== rightFrom) {
      return rightFrom - leftFrom;
    }

    const leftCreated =
      new Date(left.created_at ?? left.createdAt ?? 0).getTime() || 0;
    const rightCreated =
      new Date(right.created_at ?? right.createdAt ?? 0).getTime() || 0;

    return rightCreated - leftCreated;
  }

  function pickCurrentPricing(pricingRows = []) {
    if (!pricingRows.length) {
      return null;
    }

    const rows = [...pricingRows].sort(comparePricingRowsDesc);
    const today = new Date().toISOString().slice(0, 10);
    const active = rows.find((row) => {
      const validFrom = row.valid_from ?? row.validFrom ?? null;
      const validTo = row.valid_to ?? row.validTo ?? null;

      if (!validFrom && !validTo) return true;
      if (validFrom && validFrom > today) return false;
      if (validTo && validTo < today) return false;
      return true;
    });

    return toPricing(active || rows[0]);
  }

  function ensureValidDateRange(validFrom, validTo) {
    if (!validFrom || !validTo) return;
    if (validFrom > validTo) {
      throw new AppError(
        400,
        "validFrom must be on or before validTo",
        "DESTINATION_PRICING_INVALID_DATE_RANGE",
      );
    }
  }

  async function requireDestination(id, context = {}) {
    logger.debug(
      { module: "destinations", requestId: context.requestId, id },
      "Loading destination by id",
    );
    const destination = await repository.findDestinationById(id);
    if (!destination) {
      throw new AppError(404, "Destination not found", "DESTINATION_NOT_FOUND");
    }
    return destination;
  }

  return Object.freeze({
    async list(filters = {}, context = {}) {
      logger.debug(
        { module: "destinations", requestId: context.requestId, filters },
        "Listing destinations",
      );

      const rows = await repository.findDestinations({
        isActive: filters.isActive,
      });

      const search = normalizeText(filters.search)?.toLowerCase();
      const filtered = search
        ? rows.filter((row) => {
            const name = String(row.name || "").toLowerCase();
            const country = String(row.country || "").toLowerCase();
            return name.includes(search) || country.includes(search);
          })
        : rows;

      const sorted = [...filtered].sort((left, right) =>
        String(left.name || "").localeCompare(String(right.name || "")),
      );

      const pricingRows = await repository.findPricingForDestinationIds(
        sorted.map((item) => item.id),
      );
      const groupedPricing = new Map();

      pricingRows.forEach((row) => {
        const destinationId = row.destination_id ?? row.destinationId;
        if (!destinationId) return;
        const existing = groupedPricing.get(destinationId) || [];
        existing.push(row);
        groupedPricing.set(destinationId, existing);
      });

      return sorted.map((row) =>
        toDestination(row, pickCurrentPricing(groupedPricing.get(row.id) || [])),
      );
    },

    async getById(id, { includePricing = true } = {}, context = {}) {
      const destination = await requireDestination(id, context);

      if (!includePricing) {
        return toDestination(destination);
      }

      const pricingRows = await repository.findPricingByDestinationId(id);
      const pricing = [...pricingRows]
        .sort(comparePricingRowsDesc)
        .map((row) => toPricing(row));

      return {
        ...toDestination(destination, pricing[0] || null),
        pricing,
      };
    },

    async createDestination(payload, context = {}) {
      const name = normalizeText(payload.name);
      if (!name) {
        throw new AppError(
          400,
          "Destination name is required",
          "DESTINATION_NAME_REQUIRED",
        );
      }

      const existingRows = await repository.findDestinations({});
      const duplicate = existingRows.find(
        (item) => String(item.name || "").toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        throw new AppError(
          409,
          "Destination with this name already exists",
          "DESTINATION_DUPLICATE",
        );
      }

      const created = await repository.createDestination({
        name,
        country: normalizeText(payload.country),
        is_active: payload.isActive ?? true,
      });

      const result = toDestination(created);
      events.emitCreated(result);
      return result;
    },

    async updateDestination(id, payload, context = {}) {
      const existing = await requireDestination(id, context);

      if (payload.name !== undefined) {
        const name = normalizeText(payload.name);
        if (!name) {
          throw new AppError(
            400,
            "Destination name cannot be empty",
            "DESTINATION_NAME_REQUIRED",
          );
        }

        const allRows = await repository.findDestinations({});
        const duplicate = allRows.find(
          (item) =>
            item.id !== id &&
            String(item.name || "").toLowerCase() === name.toLowerCase(),
        );
        if (duplicate) {
          throw new AppError(
            409,
            "Destination with this name already exists",
            "DESTINATION_DUPLICATE",
          );
        }
      }

      const updatePayload = {};
      if (payload.name !== undefined) {
        updatePayload.name = normalizeText(payload.name);
      }
      if (payload.country !== undefined) {
        updatePayload.country = normalizeText(payload.country);
      }
      if (payload.isActive !== undefined) {
        updatePayload.is_active = payload.isActive;
      }

      if (!Object.keys(updatePayload).length) {
        return toDestination(existing);
      }

      const updated = await repository.updateDestination(id, updatePayload);
      const result = toDestination(updated || existing);
      events.emitUpdated(result);
      return result;
    },

    async listPricing(destinationId, context = {}) {
      await requireDestination(destinationId, context);
      const rows = await repository.findPricingByDestinationId(destinationId);
      return [...rows].sort(comparePricingRowsDesc).map((row) => toPricing(row));
    },

    async createPricing(destinationId, payload, context = {}) {
      await requireDestination(destinationId, context);

      const validFrom = toIsoDate(payload.validFrom);
      const validTo = toIsoDate(payload.validTo);
      ensureValidDateRange(validFrom, validTo);

      const created = await repository.createPricing({
        destination_id: destinationId,
        base_cost: payload.baseCost,
        min_profit_percent: payload.minProfitPercent,
        recommended_profit_percent: payload.recommendedProfitPercent ?? null,
        tax_percent: payload.taxPercent ?? 0,
        valid_from: validFrom,
        valid_to: validTo,
        created_by: context.user?.id || null,
      });

      const result = toPricing(created);
      events.emitPricingCreated(result);
      return result;
    },

    async updatePricing(pricingId, payload, context = {}) {
      const existing = await repository.findPricingById(pricingId);
      if (!existing) {
        throw new AppError(
          404,
          "Destination pricing not found",
          "DESTINATION_PRICING_NOT_FOUND",
        );
      }

      const validFrom =
        payload.validFrom !== undefined
          ? toIsoDate(payload.validFrom)
          : existing.valid_from ?? existing.validFrom ?? null;
      const validTo =
        payload.validTo !== undefined
          ? toIsoDate(payload.validTo)
          : existing.valid_to ?? existing.validTo ?? null;
      ensureValidDateRange(validFrom, validTo);

      const updatePayload = {};
      if (payload.baseCost !== undefined) {
        updatePayload.base_cost = payload.baseCost;
      }
      if (payload.minProfitPercent !== undefined) {
        updatePayload.min_profit_percent = payload.minProfitPercent;
      }
      if (payload.recommendedProfitPercent !== undefined) {
        updatePayload.recommended_profit_percent = payload.recommendedProfitPercent;
      }
      if (payload.taxPercent !== undefined) {
        updatePayload.tax_percent = payload.taxPercent;
      }
      if (payload.validFrom !== undefined) {
        updatePayload.valid_from = validFrom;
      }
      if (payload.validTo !== undefined) {
        updatePayload.valid_to = validTo;
      }

      if (!Object.keys(updatePayload).length) {
        return toPricing(existing);
      }

      const updated = await repository.updatePricing(pricingId, updatePayload);
      const result = toPricing(updated || existing);
      events.emitPricingUpdated({
        ...result,
        updatedBy: context.user?.id || null,
      });
      return result;
    },
  });
}

export { createDestinationsService };
