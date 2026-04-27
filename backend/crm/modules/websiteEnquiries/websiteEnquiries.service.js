function deriveFullName(payload = {}) {
  if (payload.fullName && String(payload.fullName).trim()) {
    return String(payload.fullName).trim();
  }
  if (payload.name && String(payload.name).trim()) {
    return String(payload.name).trim();
  }
  if (payload.email && String(payload.email).trim()) {
    return String(payload.email).split("@")[0];
  }
  if (payload.phone && String(payload.phone).trim()) {
    return `Lead ${String(payload.phone).trim()}`;
  }
  return `Lead ${Date.now()}`;
}

function normalizeLeadType(payload = {}) {
  const explicit = String(payload.leadType || "").trim().toUpperCase();
  if (explicit === "VISA" || explicit === "HOLIDAY" || explicit === "BOTH") {
    return explicit;
  }

  const source = String(payload.source || payload.sourcePage || "").toLowerCase();
  const subject = String(payload.subject || "").toLowerCase();
  const pagePath = String(payload.pagePath || payload.pageUrl || "").toLowerCase();
  const looksVisa =
    source.includes("visa") ||
    subject.includes("visa") ||
    pagePath.includes("/visa-services");
  return looksVisa ? "VISA" : "HOLIDAY";
}

function computeTravelEndDate(travelDate, numberOfDays) {
  const days = Number(numberOfDays);
  if (!travelDate || !Number.isInteger(days) || days < 1) {
    return undefined;
  }
  const start = new Date(`${travelDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return undefined;
  }
  start.setDate(start.getDate() + Math.max(0, days - 1));
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeCurrency(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || undefined;
}

function resolveClientCurrency(payload = {}) {
  const explicitCurrency = normalizeCurrency(payload.clientCurrency);
  if (explicitCurrency) {
    return explicitCurrency;
  }

  const countryHint = String(
    payload.country || payload.leadCountry || payload.source || payload.sourcePage || "",
  )
    .trim()
    .toLowerCase();

  if (countryHint.includes("uae") || countryHint.includes("united arab emirates")) {
    return "AED";
  }

  if (countryHint.includes("india") || countryHint.includes("ind")) {
    return "INR";
  }

  return undefined;
}

function buildNotes(payload = {}) {
  const parts = [];
  const subject = String(payload.subject || "").trim();
  const message = String(payload.message || "").trim();
  const sourcePage = String(payload.sourcePage || "").trim();
  const pagePath = String(payload.pagePath || "").trim();
  const pageUrl = String(payload.pageUrl || "").trim();
  const days = Number(payload.numberOfDays);
  const travellers = Number(payload.numberOfTravellers);

  if (subject) parts.push(`Subject: ${subject}`);
  if (message) parts.push(`Message: ${message}`);
  if (sourcePage) parts.push(`Source Page: ${sourcePage}`);
  if (pagePath) parts.push(`Path: ${pagePath}`);
  if (pageUrl) parts.push(`URL: ${pageUrl}`);
  if (Number.isFinite(days) && days > 0) parts.push(`Number of Days: ${days}`);
  if (Number.isFinite(travellers) && travellers > 0) {
    parts.push(`Number of Travellers: ${travellers}`);
  }

  if (!parts.length) {
    return undefined;
  }
  return parts.join("\n").slice(0, 2000);
}

function buildLeadPayload(payload = {}) {
  const fullName = deriveFullName(payload);
  const numberOfTravellers = Number(payload.numberOfTravellers);
  const notes = buildNotes(payload);
  const leadType = normalizeLeadType(payload);
  const destination = payload.destinationName || payload.destination || undefined;
  const travelDate = payload.travelDate || undefined;
  const clientCurrency = resolveClientCurrency(payload);

  return {
    fullName,
    phone: payload.phone || undefined,
    email: payload.email || undefined,
    clientCurrency,
    destinationName: destination,
    destination,
    nationality: payload.nationality || undefined,
    leadCountry: payload.leadCountry || payload.country || undefined,
    country: payload.country || payload.leadCountry || undefined,
    travelDate,
    travelEndDate: computeTravelEndDate(travelDate, payload.numberOfDays),
    budget: payload.budget,
    adultsCount:
      Number.isFinite(numberOfTravellers) && numberOfTravellers > 0
        ? numberOfTravellers
        : undefined,
    leadType,
    source:
      payload.source ||
      payload.sourcePage ||
      (leadType === "VISA" ? "Website Visa Form" : "Website Enquiry Form"),
    utmSource: payload.utmSource || "website",
    utmMedium: payload.utmMedium || "web_form",
    utmCampaign: payload.utmCampaign || undefined,
    status: "OPEN",
    notes,
    clientCreatedAt: payload.clientCreatedAt || undefined,
    clientTimezone: payload.clientTimezone || undefined,
    allowDuplicate: true,
    autoAssign: true,
  };
}

function createWebsiteEnquiriesService({ leadsService }) {
  return Object.freeze({
    async capture(payload) {
      const leadPayload = buildLeadPayload(payload);
      const result = await leadsService.createOrGetDuplicate(leadPayload, {
        user: null,
        requestId: null,
        origin: "website-form",
      });

      return {
        duplicate: result.duplicate,
        lead: result.lead,
      };
    },
  });
}

export { createWebsiteEnquiriesService };
