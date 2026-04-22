function deriveFullName(payload) {
  if (payload.fullName) {
    return payload.fullName;
  }

  if (payload.name) {
    return payload.name;
  }

  if (payload.email) {
    return payload.email.split("@")[0];
  }

  return `Lead ${Date.now()}`;
}

function buildLeadPayload(payload, defaultSource) {
  const notes = [
    payload.subject ? `Subject: ${payload.subject}` : null,
    payload.message ? `Message: ${payload.message}` : null,
    payload.pagePath ? `Path: ${payload.pagePath}` : null,
    payload.pageUrl ? `URL: ${payload.pageUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fullName: deriveFullName(payload),
    phone: payload.phone,
    email: payload.email,
    destinationName: payload.destinationName || payload.destination,
    destination: payload.destination,
    nationality: payload.nationality,
    leadCountry: payload.leadCountry || payload.country,
    country: payload.country || payload.leadCountry,
    panNumber: payload.panNumber,
    addressLine: payload.addressLine,
    clientCurrency: payload.clientCurrency,
    budget: payload.budget,
    travelDate: payload.travelDate,
    travelEndDate: payload.travelEndDate,
    adultsCount: payload.adultsCount || payload.numberOfTravellers,
    leadType: payload.leadType,
    notes: notes || undefined,
    clientCreatedAt: payload.clientCreatedAt,
    clientTimezone: payload.clientTimezone,
    campaignId: payload.campaignId,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    source: payload.source || defaultSource,
    status: "OPEN",
  };
}

function createWebhooksService({ leadsService, events, schema }) {
  async function captureLead(payload, provider) {
    const source = schema.providers[provider];
    const leadPayload = buildLeadPayload(payload, source);

    const result = await leadsService.createOrGetDuplicate(leadPayload, {
      user: null,
      requestId: null,
      origin: "webhook",
    });

    const response = {
      provider,
      source: leadPayload.source,
      duplicate: result.duplicate,
      lead: result.lead,
    };

    events.emitCaptured(response);
    return response;
  }

  return Object.freeze({
    captureMetaLead(payload) {
      return captureLead(payload, "meta");
    },
    captureWebsiteEnquiry(payload) {
      return captureLead(payload, "website");
    },
    captureWhatsappEnquiry(payload) {
      return captureLead(payload, "whatsapp");
    },
  });
}

export { createWebhooksService };
