function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function toSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return Boolean(value);
}

function pagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Validates that display_order is unique among the given rows
 * @param {number} displayOrder - The display order to validate
 * @param {Array} rows - Array of existing rows to check against
 * @param {string|null} excludeId - ID to exclude from validation (for updates)
 * @returns {boolean} - Returns true if unique, false otherwise
 */
function isDisplayOrderUnique(displayOrder, rows, excludeId = null) {
  if (displayOrder === null || displayOrder === undefined) {
    return true;
  }
  const normalizedOrder = toNumber(displayOrder, null);
  if (normalizedOrder === null) {
    return true;
  }
  return !rows.some((row) => {
    if (excludeId && row.id === excludeId) {
      return false;
    }
    return toNumber(row.display_order, null) === normalizedOrder;
  });
}

function normalizeDisplayOrderInput(value, fallback = -1) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalizedOrder = toNumber(value, fallback);
  return normalizedOrder >= 0 ? normalizedOrder : -1;
}

function findDisplayOrderConflict(displayOrder, rows, excludeId = null) {
  const normalizedOrder = normalizeDisplayOrderInput(displayOrder, -1);
  if (normalizedOrder < 0) {
    return null;
  }
  return (
    rows.find((row) => {
      if (excludeId && row.id === excludeId) {
        return false;
      }
      return toNumber(row.display_order, -1) === normalizedOrder;
    }) || null
  );
}

export {
  asyncHandler,
  toSlug,
  normalizeText,
  toDateOnly,
  toNumber,
  toBoolean,
  pagination,
  isDisplayOrderUnique,
  normalizeDisplayOrderInput,
  findDisplayOrderConflict,
};
