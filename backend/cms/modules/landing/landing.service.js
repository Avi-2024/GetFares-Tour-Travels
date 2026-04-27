import { AppError } from "../../core/middlewares/errorHandler.js";
import {
  findDisplayOrderConflict,
  normalizeDisplayOrderInput,
  normalizeText,
  toBoolean,
  toNumber,
} from "../../core/utils/index.js";

function createLandingService({ repository }) {
  const MAX_ACTIVE_LANDING_PLACES = 4;

  function parseCountryIds(value) {
    if (value === null || value === undefined) return [];

    const source =
      Array.isArray(value) ? value
      : typeof value === "string" ? value.split(",")
      : [];
    return Array.from(
      new Set(
        source
          .map((item) => normalizeText(item))
          .filter((item) => Boolean(item)),
      ),
    );
  }

  function includesCountryId(countryIds, countryId) {
    if (!countryId) return true;
    if (!Array.isArray(countryIds) || countryIds.length === 0) return true;
    return (countryIds || []).some(
      (item) =>
        String(item).trim().toLowerCase() ===
        String(countryId).trim().toLowerCase(),
    );
  }

  function isActiveValue(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1";
    }
    return false;
  }

  async function assertActiveLimit({ excludeId = null, country = null } = {}) {
    const activeRows = await repository.findAll({
      is_active: true,
      ...(country ? { country } : {}),
    });

    const activeCount = activeRows.filter((row) => {
      if (excludeId && row.id === excludeId) return false;
      return isActiveValue(row.is_active);
    }).length;

    if (activeCount >= MAX_ACTIVE_LANDING_PLACES) {
      throw new AppError(
        400,
        `Only ${MAX_ACTIVE_LANDING_PLACES} landing places can be active per country.`,
        "MAX_ACTIVE_LIMIT_REACHED",
      );
    }
  }

  async function reassignDisplayOrderConflict({
    displayOrder,
    excludeId = null,
    country = null,
  }) {
    const normalizedOrder = normalizeDisplayOrderInput(displayOrder, -1);
    if (normalizedOrder < 0) {
      return normalizedOrder;
    }
    const rows = await repository.findAll({
      ...(country ? { country } : {}),
      includeDeleted: true,
    });
    const duplicate = findDisplayOrderConflict(
      normalizedOrder,
      rows,
      excludeId,
    );
    if (duplicate) {
      await repository.update(duplicate.id, { display_order: -1 });
    }
    return normalizedOrder;
  }

  function toLandingPlace(row) {
    if (!row) return null;
    const countryIds = parseCountryIds(row.country_ids);
    return {
      id: row.id,
      title: row.name,
      name: row.name,
      country: row.country ?? null,
      countryIds,
      description: row.tag ?? null,
      tag: row.tag,
      image: row.image_url,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      isActive: row.is_active,
      isDeleted: row.is_deleted,
      is_deleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return Object.freeze({
    async list(filters = {}) {
      const { countryId, countryIds, ...repositoryFilters } = filters;
      const rows = await repository.findAll(repositoryFilters);
      const requestedCountryId =
        normalizeText(countryId) || parseCountryIds(countryIds)[0] || null;
      return rows
        .map(toLandingPlace)
        .filter((row) => includesCountryId(row.countryIds, requestedCountryId))
        .sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async listDeleted(filters = {}) {
      const { countryId, countryIds, ...repositoryFilters } = filters;
      const rows = await repository.findAll({
        ...repositoryFilters,
        is_deleted: true,
      });
      const requestedCountryId =
        normalizeText(countryId) || parseCountryIds(countryIds)[0] || null;
      return rows
        .map(toLandingPlace)
        .filter((row) => includesCountryId(row.countryIds, requestedCountryId))
        .sort((a, b) => a.displayOrder - b.displayOrder);
    },

    async getById(id) {
      const row = await repository.findById(id);
      if (!row) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }
      return toLandingPlace(row);
    },

    async create(data) {
      const country = normalizeText(data.country);
      const countryIds = parseCountryIds(
        data.countryIds ?? data.country_ids ?? data.countryId,
      );
      const supportsCountry = await repository.supportsCountry();
      const supportsCountryIds = await repository.supportsCountryIds();
      if (
        supportsCountry &&
        supportsCountryIds &&
        !country &&
        !countryIds.length
      ) {
        throw new AppError(
          400,
          "At least one country or countryId is required for landing place",
          "COUNTRY_REQUIRED",
        );
      }

      const requestedIsActive = toBoolean(data.isActive, true);
      if (requestedIsActive) {
        await assertActiveLimit({ country });
      }

      const title = normalizeText(data.title ?? data.name);
      if (!title) {
        throw new AppError(400, "Title is required", "TITLE_REQUIRED");
      }

      const imageUrl = normalizeText(data.image ?? data.imageUrl);
      if (!imageUrl) {
        throw new AppError(400, "Image is required", "IMAGE_REQUIRED");
      }

      const existing = await repository.findAll(
        supportsCountry && country ? { country } : {},
      );

      const displayOrder = await reassignDisplayOrderConflict({
        displayOrder: normalizeDisplayOrderInput(data.displayOrder, -1),
        country,
      });

      const row = await repository.create({
        name: title,
        ...(supportsCountry ? { country } : {}),
        ...(supportsCountryIds ? { country_ids: countryIds } : {}),
        tag: normalizeText(data.tag ?? data.subtitle ?? data.description),
        image_url: imageUrl,
        display_order: displayOrder,
        is_active: requestedIsActive,
      });

      return toLandingPlace(row);
    },

    async update(id, data) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      const updates = {};
      const supportsCountry = await repository.supportsCountry();
      const supportsCountryIds = await repository.supportsCountryIds();
      const incomingCountry =
        supportsCountry && data.country !== undefined ?
          normalizeText(data.country)
        : normalizeText(existing.country);
      const incomingCountryIds =
        (
          supportsCountryIds &&
          (data.countryIds !== undefined ||
            data.countryId !== undefined ||
            data.country_ids !== undefined)
        ) ?
          parseCountryIds(data.countryIds ?? data.country_ids ?? data.countryId)
        : parseCountryIds(existing.country_ids);
      const nextIsActive =
        data.isActive !== undefined ?
          toBoolean(data.isActive, true)
        : isActiveValue(existing.is_active);

      if (supportsCountry && data.country !== undefined && !incomingCountry) {
        throw new AppError(400, "Country cannot be empty", "INVALID_COUNTRY");
      }
      if (
        supportsCountryIds &&
        (data.countryIds !== undefined ||
          data.countryId !== undefined ||
          data.country_ids !== undefined) &&
        !incomingCountryIds.length &&
        !incomingCountry
      ) {
        throw new AppError(
          400,
          "At least one countryId is required",
          "INVALID_COUNTRY_IDS",
        );
      }

      if (nextIsActive) {
        await assertActiveLimit({ excludeId: id, country: incomingCountry });
      }

      if (data.name !== undefined || data.title !== undefined) {
        updates.name = normalizeText(data.title ?? data.name);
      }
      if (supportsCountry && data.country !== undefined) {
        updates.country = incomingCountry;
      }
      if (
        supportsCountryIds &&
        (data.countryIds !== undefined ||
          data.countryId !== undefined ||
          data.country_ids !== undefined)
      ) {
        updates.country_ids = incomingCountryIds;
      }
      if (
        data.tag !== undefined ||
        data.subtitle !== undefined ||
        data.description !== undefined
      ) {
        const tag = normalizeText(
          data.tag ?? data.subtitle ?? data.description,
        );
        if (!tag) {
          throw new AppError(400, "Tag cannot be empty", "INVALID_TAG");
        }
        updates.tag = tag;
      }
      if (data.imageUrl !== undefined || data.image !== undefined)
        updates.image_url = normalizeText(data.image ?? data.imageUrl);
      if (data.displayOrder !== undefined) {
        updates.display_order = normalizeDisplayOrderInput(
          data.displayOrder,
          -1,
        );
        updates.display_order = await reassignDisplayOrderConflict({
          displayOrder: updates.display_order,
          excludeId: id,
          country: incomingCountry,
        });
      }
      if (data.isActive !== undefined)
        updates.is_active = toBoolean(data.isActive, true);

      const updated = await repository.update(id, updates);
      return toLandingPlace(updated);
    },

    async updateStatus(id, isActive) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      const nextIsActive = toBoolean(isActive, true);
      if (nextIsActive) {
        await assertActiveLimit({
          excludeId: id,
          country: normalizeText(existing.country),
        });
      }

      const updated = await repository.update(id, {
        is_active: nextIsActive,
      });
      return toLandingPlace(updated);
    },

    async delete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      await repository.delete(id);
      return { success: true };
    },

    async hardDelete(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      await repository.hardDelete(id);
      return { success: true };
    },

    async restore(id) {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new AppError(404, "Landing place not found", "NOT_FOUND");
      }

      await repository.restore(id);
      return { success: true };
    },

    async reorder(items) {
      if (!Array.isArray(items)) {
        throw new AppError(400, "Items must be an array", "INVALID_INPUT");
      }

      await repository.updateOrder(items);
      return { success: true };
    },
  });
}

export { createLandingService };
