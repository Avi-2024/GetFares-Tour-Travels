import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";

const DEFAULT_LANGUAGE = "en_US";

function normalizePhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length ? digits : null;
}

function buildTextPayload(to, text, previewUrl) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: text,
      preview_url: Boolean(previewUrl),
    },
  };
}

function buildTemplatePayload(to, templateName, language, components) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language || DEFAULT_LANGUAGE },
    },
  };

  if (components && components.length) {
    payload.template.components = components;
  }

  return payload;
}

function createWhatsAppService({
  api,
  config,
  logger,
  leadsService,
  quotationsService,
  bookingsService,
  paymentsService,
  refundsService,
  visaService,
} = {}) {
  const verifyToken = config?.verifyToken;
  const appSecret = config?.appSecret;
  const templates = config?.templates || {};
  const templateAliases = {
    leadWelcome: templates.leadWelcome ?? templates.leadFollowup ?? null,
    leadFollowup: templates.leadFollowup ?? templates.leadWelcome ?? null,
    quotationSent: templates.quotationSent ?? templates.quotation ?? null,
    quotationReminder: templates.quotationReminder ?? templates.quotation ?? null,
    preTravel: templates.preTravel ?? templates.booking ?? null,
    postTravel: templates.postTravel ?? templates.booking ?? null,
  };

  function getConfigStatus() {
    const checks = {
      verifyToken: Boolean(config?.verifyToken),
      accessToken: Boolean(config?.accessToken),
      phoneNumberId: Boolean(config?.phoneNumberId),
      appSecret: Boolean(config?.appSecret),
      appId: Boolean(config?.appId),
    };

    const missing = Object.entries(checks)
      .filter(([, isSet]) => !isSet)
      .map(([key]) => key);

    return {
      ready: missing.length === 0,
      checks,
      missing,
      webhook: {
        verifyPath: "/webhook/whatsapp",
        receivePath: "/webhook/whatsapp",
      },
    };
  }

  function verifyWebhook(query = {}) {
    if (!verifyToken) {
      throw new AppError(
        500,
        "WHATSAPP_VERIFY_TOKEN or META_VERIFY_TOKEN is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (!mode || !token) {
      throw new AppError(
        400,
        "Missing webhook verification parameters",
        "WHATSAPP_WEBHOOK_INVALID",
      );
    }

    if (mode !== "subscribe") {
      throw new AppError(400, "Invalid hub.mode", "WHATSAPP_WEBHOOK_INVALID");
    }

    if (token !== verifyToken) {
      throw new AppError(403, "Invalid verify token", "WHATSAPP_WEBHOOK_DENIED");
    }

    if (!challenge) {
      throw new AppError(
        400,
        "Missing hub.challenge",
        "WHATSAPP_WEBHOOK_INVALID",
      );
    }

    return challenge;
  }

  function isValidSignature(rawBody, signatureHeader) {
    if (!appSecret) {
      return true;
    }

    if (!rawBody || !signatureHeader) {
      return false;
    }

    const signature = String(signatureHeader).replace("sha256=", "");
    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }

  function assertSignature(rawBody, signatureHeader) {
    if (!appSecret) {
      return;
    }
    if (!isValidSignature(rawBody, signatureHeader)) {
      throw new AppError(403, "Invalid signature", "WHATSAPP_SIGNATURE_INVALID");
    }
  }

  function extractMessages(payload = {}) {
    const messages = [];
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    entries.forEach((entry) => {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      changes.forEach((change) => {
        const value = change?.value;
        const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
        const profileName = contacts[0]?.profile?.name || null;
        const incoming = Array.isArray(value?.messages) ? value.messages : [];

        incoming.forEach((message) => {
          messages.push({
            id: message?.id || null,
            from: message?.from || null,
            type: message?.type || null,
            text: message?.text?.body || null,
            name: profileName,
          });
        });
      });
    });

    return messages;
  }

  async function resolveLeadPhone(leadId) {
    if (!leadId || !leadsService?.getById) return null;
    const lead = await leadsService.getById(leadId, {});
    return normalizePhone(lead?.phone);
  }

  async function resolveBookingPhone(bookingId) {
    if (!bookingId || !bookingsService?.getById) return null;
    const booking = await bookingsService.getById(bookingId, {});
    return resolveLeadPhone(booking?.leadId);
  }

  async function resolveQuotationDetails(quotationId) {
    if (!quotationId || !quotationsService?.getById) {
      return { quote: null, phone: null };
    }
    const quote = await quotationsService.getById(quotationId, {});
    const phone =
      normalizePhone(quote?.recipientPhone) ||
      (quote?.leadId ? await resolveLeadPhone(quote.leadId) : null);
    return { quote, phone };
  }

  async function resolveVisaPhone(visaId) {
    if (!visaId || !visaService?.getById) return null;
    const visa = await visaService.getById(visaId, {});
    return resolveBookingPhone(visa?.bookingId);
  }

  async function sendTextMessage(payload = {}) {
    const to = normalizePhone(payload.to);
    if (!to) {
      throw new AppError(400, "Invalid recipient phone", "WHATSAPP_INVALID_TO");
    }

    const text = payload.text?.trim();
    if (!text) {
      throw new AppError(400, "Message text is required", "WHATSAPP_TEXT_EMPTY");
    }

    const messagePayload = buildTextPayload(to, text, payload.previewUrl);
    return api.sendMessage(messagePayload);
  }

  async function sendTemplateMessage(payload = {}) {
    const to = normalizePhone(payload.to);
    if (!to) {
      throw new AppError(400, "Invalid recipient phone", "WHATSAPP_INVALID_TO");
    }
    if (!payload.templateName) {
      throw new AppError(
        400,
        "Template name is required",
        "WHATSAPP_TEMPLATE_MISSING",
      );
    }

    const messagePayload = buildTemplatePayload(
      to,
      payload.templateName,
      payload.language,
      payload.components,
    );
    return api.sendMessage(messagePayload);
  }

  async function sendEventMessage({ phone, text, templateName }) {
    if (!phone) return null;
    if (templateName) {
      const components = text
        ? [
            {
              type: "body",
              parameters: [{ type: "text", text }],
            },
          ]
        : undefined;
      return sendTemplateMessage({
        to: phone,
        templateName,
        components,
      });
    }
    return sendTextMessage({ to: phone, text });
  }

  async function handleWebhook(payload, context = {}, signatureHeader) {
    assertSignature(context.rawBody, signatureHeader);

    if (!payload || typeof payload !== "object") {
      throw new AppError(400, "Invalid webhook payload", "WHATSAPP_INVALID_PAYLOAD");
    }

    const messages = extractMessages(payload);
    if (!messages.length) {
      return { processed: 0, leads: [] };
    }

    const results = [];
    for (const message of messages) {
      const phone = normalizePhone(message.from);
      if (!phone || !leadsService?.createOrGetDuplicate) {
        continue;
      }

      const leadPayload = {
        fullName: message.name || `WhatsApp Lead ${phone.slice(-4)}`,
        phone,
        source: "WhatsApp",
        notes: message.text || null,
      };

      const result = await leadsService.createOrGetDuplicate(leadPayload, {
        user: null,
        requestId: context.requestId || null,
        origin: "whatsapp_webhook",
      });

      results.push({
        messageId: message.id,
        lead: result.lead,
        duplicate: result.duplicate,
      });
    }

    return { processed: results.length, leads: results };
  }

  async function notifyLeadWelcome(payload = {}) {
    const leadId = payload.id || payload.leadId;
    const directPhone = normalizePhone(payload.phone);
    const lead =
      !directPhone && leadId && leadsService?.getById
        ? await leadsService.getById(leadId, {})
        : null;
    const phone = directPhone || normalizePhone(lead?.phone);
    if (!phone) return null;

    const name =
      payload.fullName || payload.name || lead?.fullName || "there";
    const text = `Hi ${name}, thanks for reaching out! We have received your travel enquiry and will share options shortly.`;
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.leadWelcome,
    });
  }

  async function notifyFollowupScheduled(payload = {}) {
    const followupType = String(payload.followupType || "").toUpperCase();
    if (!["WHATSAPP", "FINAL_REMINDER"].includes(followupType)) {
      return null;
    }

    const leadId = payload.leadId || null;
    const lead = leadId && leadsService?.getById ?
      await leadsService.getById(leadId, {})
    : null;
    const phone = normalizePhone(payload.phone) || normalizePhone(lead?.phone);
    if (!phone) {
      return null;
    }

    const name = lead?.fullName || "there";
    const fallbackText =
      followupType === "FINAL_REMINDER" ?
        `Hi ${name}, this is our final reminder regarding your travel enquiry. Please reply if you want us to keep this request active.`
      : `Hi ${name}, just checking in on your travel enquiry. Please share a convenient time to connect.`;
    const text = String(payload.notes || "").trim() || fallbackText;

    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.leadFollowup,
    });
  }

  async function notifyQuotationSent(payload = {}) {
    const channel = String(
      payload.channel || payload.deliveryChannel || "",
    ).toUpperCase();
    if (channel && channel !== "WHATSAPP") {
      return null;
    }

    const quotationId = payload.id || payload.quotationId;
    const { quote, phone } = await resolveQuotationDetails(quotationId);
    if (!phone) return null;
    const pdfUrl = quote?.pdfUrl;
    const text = pdfUrl
      ? `Your quotation is ready. Please review it here: ${pdfUrl}`
      : "Your quotation is ready. Please review and let us know.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.quotationSent,
    });
  }

  async function notifyQuotationReminder(payload = {}) {
    const quotationId = payload.quotationId || payload.id;
    const { quote, phone } = await resolveQuotationDetails(quotationId);
    if (!phone) return null;
    const pdfUrl = quote?.pdfUrl;
    const reminderType = payload.reminderType || "REMINDER";
    const reminderText =
      reminderType === "NOT_OPENED_24H"
        ? "Just a reminder to review your quotation."
        : "Following up on the quotation we shared.";
    const text = pdfUrl
      ? `${reminderText} Link: ${pdfUrl}`
      : reminderText;
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.quotationReminder,
    });
  }

  async function notifyPreTravel(payload = {}) {
    const bookingId = payload.bookingId || payload.id;
    const booking =
      bookingId && bookingsService?.getById
        ? await bookingsService.getById(bookingId, {})
        : null;
    const phone = booking?.leadId
      ? await resolveLeadPhone(booking.leadId)
      : null;
    if (!phone) return null;
    const travelDate = booking?.travelStartDate || payload.travelStartDate || null;
    const text = travelDate
      ? `Your trip is coming up on ${travelDate}. Let us know if you need any help before departure.`
      : "Your trip is coming up soon. Let us know if you need any help before departure.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.preTravel,
    });
  }

  async function notifyPostTravel(payload = {}) {
    const bookingId = payload.bookingId || payload.id;
    const booking =
      bookingId && bookingsService?.getById
        ? await bookingsService.getById(bookingId, {})
        : null;
    const phone = booking?.leadId
      ? await resolveLeadPhone(booking.leadId)
      : null;
    if (!phone) return null;
    const travelEnd = booking?.travelEndDate || payload.travelEndDate || null;
    const text = travelEnd
      ? `Hope you had a great trip ending on ${travelEnd}! We would love your feedback.`
      : "Hope you had a great trip! We would love your feedback.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.postTravel,
    });
  }

  return Object.freeze({
    getConfigStatus,
    verifyWebhook,
    handleWebhook,
    sendTextMessage,
    sendTemplateMessage,
    notifyLeadWelcome,
    notifyFollowupScheduled,
    notifyQuotationSent,
    notifyQuotationReminder,
    notifyPreTravel,
    notifyPostTravel,
  });
}

export { createWhatsAppService };
