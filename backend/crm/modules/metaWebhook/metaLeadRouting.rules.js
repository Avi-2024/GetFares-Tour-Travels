function normalizeMetaId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace(/^[a-z_]+:/i, "");
}

export { normalizeMetaId };
