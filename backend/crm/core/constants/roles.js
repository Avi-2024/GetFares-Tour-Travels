const DEFAULT_ROLE = "sales_consultant";

function normalizeRoleName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdminRole(value) {
  const normalized = normalizeRoleName(value);
  return normalized === "super_admin" || normalized === "superadmin";
}

function canManageMetaConfiguration(value) {
  const normalized = normalizeRoleName(value);
  return isSuperAdminRole(value) || normalized === "admin";
}

export {
  DEFAULT_ROLE,
  normalizeRoleName,
  isSuperAdminRole,
  canManageMetaConfiguration,
};
