function normalizeMetaId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace(/^[a-z_]+:/i, "");
}

const META_LEAD_ROUTING_RULES = Object.freeze([
  {
    name: "GETFARES_VISA_UAE_FORM",
    match: {
      metaPageId: "958886697315918",
      metaFormId: "964456066326392",
      metaAdId: "120245301739500369",
    },
    assign: {
      source: "Getfares",
      leadType: "VISA",
    },
  },
]);

function resolveMetaLeadRoutingRule(input = {}) {
  const pageId = normalizeMetaId(input.metaPageId);
  const formId = normalizeMetaId(input.metaFormId);
  const adId = normalizeMetaId(input.metaAdId);

  for (const rule of META_LEAD_ROUTING_RULES) {
    const match = rule.match || {};
    if (
      normalizeMetaId(match.metaPageId) === pageId &&
      normalizeMetaId(match.metaFormId) === formId &&
      normalizeMetaId(match.metaAdId) === adId
    ) {
      return rule;
    }
  }

  return null;
}

export { resolveMetaLeadRoutingRule, normalizeMetaId };
