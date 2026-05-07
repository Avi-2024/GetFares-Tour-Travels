import { z } from "zod";

/**
 * Express query values are strings. z.coerce.boolean() uses Boolean(val), so
 * Boolean("false") === true. Use this for optional boolean query params only.
 */
const optionalQueryBoolean = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
}, z.boolean().optional());

export { optionalQueryBoolean };
