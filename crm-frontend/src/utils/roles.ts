export function normalizeRole(role?: string) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export function canManageMetaConfiguration(role?: string) {
  const normalized = normalizeRole(role)
  return (
    normalized === 'super_admin' ||
    normalized === 'superadmin' ||
    normalized === 'admin'
  )
}
