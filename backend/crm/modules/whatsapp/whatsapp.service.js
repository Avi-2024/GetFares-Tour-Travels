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

function summarizeChannel(channel = {}) {
  if (!channel) {
    return null;
  }

  return {
    phoneNumberId: channel.phoneNumberId || null,
    displayPhoneNumber: channel.displayPhoneNumber || null,
    countryId: channel.countryId || null,
    countryCode: channel.countryCode || null,
    countryName: channel.countryName || null,
    sourceLabel: channel.sourceLabel || null,
  };
}

function mergeByKey(items = [], key) {
  const mapped = new Map();

  items.filter(Boolean).forEach((item) => {
    const itemKey = String(item?.[key] || "").trim();
    if (itemKey) {
      mapped.set(itemKey, item);
    }
  });

  return [...mapped.values()];
}

function createWhatsAppService({
  api,
  repository,
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
  const allowInsecureWebhooks = config?.allowInsecureWebhooks === true;
  const templates = config?.templates || {};
  const envChannels = Array.isArray(config?.channels) ? config.channels : [];
  const defaultChannel = Object.freeze({
    phoneNumberId: config?.phoneNumberId || null,
    accessToken: config?.accessToken || null,
    appSecret: config?.appSecret || null,
    verifyToken: config?.verifyToken || null,
    appId: config?.appId || null,
    apiBaseUrl: config?.apiBaseUrl || null,
    apiVersion: config?.apiVersion || null,
    sourceLabel: "WhatsApp",
    countryId: null,
    countryCode: null,
    countryName: null,
  });
  const templateAliases = {
    leadWelcome: templates.leadWelcome ?? templates.leadFollowup ?? null,
    leadFollowup: templates.leadFollowup ?? templates.leadWelcome ?? null,
    quotationSent: templates.quotationSent ?? templates.quotation ?? null,
    quotationReminder:
      templates.quotationReminder ?? templates.quotation ?? null,
    preTravel: templates.preTravel ?? templates.booking ?? null,
    postTravel: templates.postTravel ?? templates.booking ?? null,
  };

  async function getConfigStatus() {
    const channels = await listConfiguredChannels();
    const checks = {
      verifyToken:
        Boolean(config?.verifyToken) || channels.some((item) => item?.verifyToken),
      accessToken:
        Boolean(config?.accessToken) || channels.some((item) => item?.accessToken),
      phoneNumberId:
        Boolean(config?.phoneNumberId) || channels.some((item) => item?.phoneNumberId),
      appSecret: Boolean(config?.appSecret) || channels.some((item) => item?.appSecret),
      appId: Boolean(config?.appId) || channels.some((item) => item?.appId),
      allowInsecureWebhooks,
    };

    const missing = Object.entries(checks)
      .filter(([, isSet]) => !isSet)
      .map(([key]) => key);

    return {
      ready: missing.length === 0,
      checks,
      missing,
      multiChannel: channels.length > 1,
      channels: channels.map((channel) => summarizeChannel(channel)),
      webhook: {
        verifyPath: "/webhook/whatsapp",
        receivePath: "/webhook/whatsapp",
      },
    };
  }

  function hasDefaultChannelConfig() {
    return Boolean(
      defaultChannel.verifyToken ||
        defaultChannel.accessToken ||
        defaultChannel.phoneNumberId,
    );
  }

  function normalizeCountryCode(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized || null;
  }

  function normalizeCountryName(value) {
    const normalized = String(value || "").trim();
    return normalized || null;
  }

  function buildApiChannel(channel = {}) {
    return {
      accessToken: channel.accessToken || null,
      phoneNumberId: channel.phoneNumberId || null,
      apiBaseUrl: channel.apiBaseUrl || null,
      apiVersion: channel.apiVersion || null,
    };
  }

  function buildCountryContext(payload = {}) {
    return {
      countryId: String(payload.countryId || "").trim() || null,
      countryCode: normalizeCountryCode(payload.countryCode),
      countryName: normalizeCountryName(
        payload.countryName || payload.country || payload.leadCountry,
      ),
    };
  }

  function extractPhoneNumberIds(payload = {}) {
    const ids = new Set();
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    entries.forEach((entry) => {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      changes.forEach((change) => {
        const metadataId = change?.value?.metadata?.phone_number_id;
        if (metadataId) {
          ids.add(String(metadataId));
        }
      });
    });

    return [...ids];
  }

  async function listConfiguredChannels() {
    const channels = [];

    if (hasDefaultChannelConfig()) {
      channels.push(defaultChannel);
    }

    envChannels.forEach((channel) => {
      channels.push(channel);
    });

    if (!repository?.listActiveChannels) {
      return mergeByKey(channels, "phoneNumberId");
    }

    const activeChannels = await repository.listActiveChannels();
    return mergeByKey([...channels, ...activeChannels], "phoneNumberId");
  }

  async function verifyWebhook(query = {}) {
    if (!verifyToken && !repository?.listActiveChannels) {
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

    const tokens = new Set();
    if (verifyToken) {
      tokens.add(String(verifyToken));
    }

    const channels = await listConfiguredChannels();
    channels.forEach((channel) => {
      if (channel?.verifyToken) {
        tokens.add(String(channel.verifyToken));
      }
    });

    if (!tokens.size) {
      throw new AppError(
        500,
        "WHATSAPP_VERIFY_TOKEN or META_VERIFY_TOKEN is not configured",
        "WHATSAPP_CONFIG_MISSING",
      );
    }

    if (!tokens.has(String(token))) {
      throw new AppError(
        403,
        "Invalid verify token",
        "WHATSAPP_WEBHOOK_DENIED",
      );
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

  function isValidSignature(rawBody, signatureHeader, secrets = []) {
    if (!secrets.length) {
      return true;
    }

    if (!rawBody || !signatureHeader) {
      return false;
    }

    const signature = String(signatureHeader).replace("sha256=", "");

    return secrets.some((secret) => {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (signature.length !== expected.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    });
  }

  async function getSignatureSecrets(payload = {}) {
    const secrets = new Set();

    if (appSecret) {
      secrets.add(String(appSecret));
    }

    const phoneNumberIds = extractPhoneNumberIds(payload);
    if (phoneNumberIds.length && repository?.findActiveChannelByPhoneNumberId) {
      for (const phoneNumberId of phoneNumberIds) {
        const channel =
          await repository.findActiveChannelByPhoneNumberId(phoneNumberId);
        if (channel?.appSecret) {
          secrets.add(String(channel.appSecret));
        }
      }
    }

    if (!phoneNumberIds.length || !secrets.size) {
      const channels = await listConfiguredChannels();
      channels.forEach((channel) => {
        if (channel?.appSecret) {
          secrets.add(String(channel.appSecret));
        }
      });
    }

    return [...secrets];
  }

  async function assertSignature(rawBody, signatureHeader, payload = {}) {
    if (allowInsecureWebhooks) {
      return;
    }

    const secrets = await getSignatureSecrets(payload);
    if (!secrets.length) {
      return;
    }

    if (!isValidSignature(rawBody, signatureHeader, secrets)) {
      throw new AppError(
        403,
        "Invalid signature",
        "WHATSAPP_SIGNATURE_INVALID",
      );
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
          const type = message?.type || null;
          let text = message?.text?.body || null;
          if (!text && type && type !== "text") {
            text = `[${String(type)}]`;
          }
          const ts = message?.timestamp;
          const timestampMs =
            ts !== undefined && ts !== null && String(ts).trim() !== "" ?
              Number(ts) * 1000
            : null;
          messages.push({
            id: message?.id || null,
            from: message?.from || null,
            type,
            text,
            name: profileName,
            phoneNumberId: value?.metadata?.phone_number_id || null,
            displayPhoneNumber: value?.metadata?.display_phone_number || null,
            timestampMs: Number.isFinite(timestampMs) ? timestampMs : null,
          });
        });
      });
    });

    return messages;
  }

  async function resolveInboundChannel(message = {}) {
    const phoneNumberId = String(message.phoneNumberId || "").trim();
    if (phoneNumberId) {
      const channels = await listConfiguredChannels();
      const channel =
        channels.find(
          (item) => String(item?.phoneNumberId || "").trim() === phoneNumberId,
        ) || null;
      if (channel) {
        return channel;
      }
    }

    return hasDefaultChannelConfig() ? defaultChannel : null;
  }

  async function resolveOutboundChannel(payload = {}) {
    const explicitPhoneNumberId = String(payload.phoneNumberId || "").trim();
    if (explicitPhoneNumberId) {
      const channels = await listConfiguredChannels();
      const explicitChannel =
        channels.find(
          (item) =>
            String(item?.phoneNumberId || "").trim() === explicitPhoneNumberId,
        ) || null;
      if (explicitChannel) {
        return explicitChannel;
      }
    }

    const countryContext = buildCountryContext({
      countryId: payload.countryId ?? payload.lead?.countryId,
      countryCode: payload.countryCode,
      countryName:
        payload.countryName ??
        payload.country ??
        payload.leadCountry ??
        payload.lead?.leadCountry ??
        payload.lead?.country,
    });

    if (
      (countryContext.countryId ||
        countryContext.countryCode ||
        countryContext.countryName)
    ) {
      const channels = await listConfiguredChannels();
      const countryChannel =
        channels.find((item) => {
          if (
            countryContext.countryId &&
            String(item?.countryId || "").trim() === countryContext.countryId
          ) {
            return true;
          }
          if (
            countryContext.countryCode &&
            String(item?.countryCode || "").trim().toUpperCase() ===
              countryContext.countryCode
          ) {
            return true;
          }
          if (
            countryContext.countryName &&
            String(item?.countryName || "").trim().toLowerCase() ===
              countryContext.countryName.toLowerCase()
          ) {
            return true;
          }
          return false;
        }) || null;
      if (countryChannel) {
        return countryChannel;
      }
    }

    return hasDefaultChannelConfig() ? defaultChannel : null;
  }

  async function resolveLeadRecord(leadId) {
    if (!leadId || !leadsService?.getById) return null;
    return leadsService.getById(leadId, {});
  }

  async function resolveLeadPhone(leadId) {
    const lead = await resolveLeadRecord(leadId);
    return normalizePhone(lead?.phone);
  }

  async function resolveBookingPhone(bookingId) {
    if (!bookingId || !bookingsService?.getById) return null;
    const booking = await bookingsService.getById(bookingId, {});
    return resolveLeadPhone(booking?.leadId);
  }

  async function resolveQuotationDetails(quotationId) {
    if (!quotationId || !quotationsService?.getById) {
      return { quote: null, lead: null, phone: null };
    }
    const quote = await quotationsService.getById(quotationId, {});
    const lead = quote?.leadId ? await resolveLeadRecord(quote.leadId) : null;
    const phone =
      normalizePhone(quote?.recipientPhone) ||
      normalizePhone(lead?.phone);
    return { quote, lead, phone };
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
      throw new AppError(
        400,
        "Message text is required",
        "WHATSAPP_TEXT_EMPTY",
      );
    }

    const messagePayload = buildTextPayload(to, text, payload.previewUrl);
    let outboundPayload = { ...payload };
    const leadIdForLog = String(payload.leadId || "").trim();
    if (leadIdForLog && !payload.lead) {
      const leadRow = await resolveLeadRecord(leadIdForLog);
      if (leadRow) {
        outboundPayload = { ...payload, lead: leadRow };
      }
    }
    const channel = await resolveOutboundChannel(outboundPayload);
    if (!channel) {
      throw new AppError(
        500,
        "No WhatsApp channel configured",
        "WHATSAPP_CHANNEL_NOT_CONFIGURED",
      );
    }
    logger?.info(
      {
        to,
        channel: summarizeChannel(channel),
      },
      "WhatsApp outbound text resolved channel",
    );
    const data = await api.sendMessage(
      messagePayload,
      buildApiChannel(channel),
    );
    if (leadIdForLog && repository?.insertConversationMessage) {
      const waId = data?.messages?.[0]?.id ?? null;
      await repository.insertConversationMessage({
        id: crypto.randomUUID(),
        leadId: leadIdForLog,
        direction: "outbound",
        body: text,
        waMessageId: waId,
        phoneNumberId: channel?.phoneNumberId ?? null,
        displayPhoneNumber: channel?.displayPhoneNumber ?? null,
        peerPhone: to,
        waTimestampMs: Date.now(),
      });
    }
    return data;
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
    const channel = await resolveOutboundChannel(payload);
    if (!channel) {
      throw new AppError(
        500,
        "No WhatsApp channel configured",
        "WHATSAPP_CHANNEL_NOT_CONFIGURED",
      );
    }
    logger?.info(
      {
        to,
        templateName: payload.templateName,
        channel: summarizeChannel(channel),
      },
      "WhatsApp outbound template resolved channel",
    );
    return api.sendMessage(messagePayload, buildApiChannel(channel));
  }

  async function sendEventMessage({
    phone,
    text,
    templateName,
    lead,
    phoneNumberId,
    countryId,
    countryCode,
    countryName,
  }) {
    if (!phone) return null;
    if (templateName) {
      const components =
        text ?
          [
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
        lead,
        phoneNumberId,
        countryId,
        countryCode,
        countryName,
      });
    }
    return sendTextMessage({
      to: phone,
      text,
      lead,
      phoneNumberId,
      countryId,
      countryCode,
      countryName,
    });
  }

  async function handleWebhook(payload, context = {}, signatureHeader) {
    await assertSignature(context.rawBody, signatureHeader, payload);

    if (!payload || typeof payload !== "object") {
      throw new AppError(
        400,
        "Invalid webhook payload",
        "WHATSAPP_INVALID_PAYLOAD",
      );
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

      const channel = await resolveInboundChannel(message);
      logger?.info(
        {
          messageId: message.id || null,
          from: phone,
          inboundPhoneNumberId: message.phoneNumberId || null,
          channel: summarizeChannel(channel),
        },
        "WhatsApp inbound message resolved channel",
      );
      const leadPayload = {
        fullName: message.name || `WhatsApp Lead ${phone.slice(-4)}`,
        phone,
        source: channel?.sourceLabel || "WhatsApp",
        leadCountry: channel?.countryName || null,
        country: channel?.countryName || null,
        countryId: channel?.countryId || null,
        notes: message.text || null,
        allowDuplicate: true,
      };

      const result = await leadsService.createOrGetDuplicate(leadPayload, {
        user: null,
        requestId: context.requestId || null,
        origin: "whatsapp_webhook",
      });

      const leadRow = result?.lead;
      if (leadRow?.id && repository?.insertConversationMessage) {
        await repository.insertConversationMessage({
          id: crypto.randomUUID(),
          leadId: leadRow.id,
          direction: "inbound",
          body: message.text || null,
          waMessageId: message.id || null,
          phoneNumberId: message.phoneNumberId || null,
          displayPhoneNumber: message.displayPhoneNumber || null,
          peerPhone: phone,
          waTimestampMs: message.timestampMs ?? null,
        });
      }

      results.push({
        messageId: message.id,
        phoneNumberId: message.phoneNumberId,
        countryId: channel?.countryId || null,
        countryName: channel?.countryName || null,
        lead: leadRow,
        duplicate: result.duplicate,
      });
    }

    return { processed: results.length, leads: results };
  }

  function channelMatchesRegion(channel, regionNorm) {
    const code = String(channel?.countryCode || "").trim().toLowerCase();
    const name = String(channel?.countryName || "").trim().toLowerCase();
    if (regionNorm === "in" || regionNorm === "india") {
      return code === "in" || name === "india";
    }
    if (regionNorm === "uae" || regionNorm === "ae") {
      return code === "ae" || name === "uae" || name === "united arab emirates";
    }
    return false;
  }

  function mapConversationRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      leadId: row.lead_id ?? row.leadId,
      direction: row.direction,
      body: row.body,
      waMessageId: row.wa_message_id ?? row.waMessageId,
      phoneNumberId: row.phone_number_id ?? row.phoneNumberId,
      displayPhoneNumber:
        row.display_phone_number ?? row.displayPhoneNumber ?? null,
      peerPhone: row.peer_phone ?? row.peerPhone,
      waTimestampMs: row.wa_timestamp_ms ?? row.waTimestampMs ?? null,
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  async function listConversationMessages({ leadId, region } = {}) {
    const id = String(leadId || "").trim();
    if (!id) {
      throw new AppError(400, "leadId is required", "WHATSAPP_LEAD_ID_MISSING");
    }
    const lead = await resolveLeadRecord(id);
    if (!lead) {
      throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    }

    let regionNorm = String(region || "all").trim().toLowerCase() || "all";
    const allowedRegion = new Set(["all", "in", "india", "uae", "ae"]);
    if (!allowedRegion.has(regionNorm)) {
      regionNorm = "all";
    }
    let phoneNumberIds = null;
    if (regionNorm !== "all") {
      const channels = await listConfiguredChannels();
      phoneNumberIds = channels
        .filter((c) => channelMatchesRegion(c, regionNorm))
        .map((c) => c.phoneNumberId)
        .filter(Boolean);
      if (!phoneNumberIds.length) {
        phoneNumberIds = null;
      }
    }

    if (!repository?.listConversationMessages) {
      return { lead, messages: [], region: regionNorm };
    }

    const rows = await repository.listConversationMessages(id, {
      phoneNumberIds,
    });
    return {
      lead,
      messages: rows.map(mapConversationRow).filter(Boolean),
      region: regionNorm,
    };
  }

  function mapThreadRow(row) {
    if (!row) return null;
    return {
      leadId: row.lead_id ?? row.leadId,
      lastMessageAt: row.last_message_at ?? row.lastMessageAt,
      lastSortMs: row.last_sort_ms ?? row.lastSortMs,
      lastBody: row.last_body ?? row.lastBody,
      fullName: row.full_name ?? row.fullName,
      phone: row.phone,
      leadCode: row.lead_code ?? row.leadCode,
    };
  }

  async function listConversationThreads({ page, limit, q, region } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const pg = Math.max(Number(page) || 1, 1);
    const offset = (pg - 1) * lim;

    let regionNorm = String(region || "all").trim().toLowerCase() || "all";
    const allowedRegion = new Set(["all", "in", "india", "uae", "ae"]);
    if (!allowedRegion.has(regionNorm)) {
      regionNorm = "all";
    }
    let phoneNumberIds = null;
    if (regionNorm !== "all") {
      const channels = await listConfiguredChannels();
      phoneNumberIds = channels
        .filter((c) => channelMatchesRegion(c, regionNorm))
        .map((c) => c.phoneNumberId)
        .filter(Boolean);
      if (!phoneNumberIds.length) {
        phoneNumberIds = null;
      }
    }

    if (!repository?.listConversationThreads) {
      return { items: [], page: pg, limit: lim, total: 0, region: regionNorm };
    }

    const [items, total] = await Promise.all([
      repository.listConversationThreads({
        limit: lim,
        offset,
        search: q,
        phoneNumberIds,
      }),
      repository.countConversationThreads({ search: q, phoneNumberIds }),
    ]);

    return {
      items: items.map(mapThreadRow).filter(Boolean),
      page: pg,
      limit: lim,
      total,
      region: regionNorm,
    };
  }

  async function notifyLeadWelcome(payload = {}) {
    const leadId = payload.id || payload.leadId;
    const directPhone = normalizePhone(payload.phone);
    const lead =
      !directPhone && leadId ?
        await resolveLeadRecord(leadId)
      : null;
    const phone = directPhone || normalizePhone(lead?.phone);
    if (!phone) return null;

    const name = payload.fullName || payload.name || lead?.fullName || "there";
    const text = `Hi ${name}, thanks for reaching out! We have received your travel enquiry and will share options shortly.`;
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.leadWelcome,
      lead,
    });
  }

  async function notifyFollowupScheduled(payload = {}) {
    const followupType = String(payload.followupType || "").toUpperCase();
    if (!["WHATSAPP", "FINAL_REMINDER"].includes(followupType)) {
      return null;
    }

    const leadId = payload.leadId || null;
    const lead =
      leadId ?
        await resolveLeadRecord(leadId)
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
      lead,
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
    const { quote, lead, phone } = await resolveQuotationDetails(quotationId);
    if (!phone) return null;
    const pdfUrl = quote?.pdfUrl;
    const text =
      pdfUrl ?
        `Your quotation is ready. Please review it here: ${pdfUrl}`
      : "Your quotation is ready. Please review and let us know.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.quotationSent,
      lead,
    });
  }

  async function notifyQuotationReminder(payload = {}) {
    const quotationId = payload.quotationId || payload.id;
    const { quote, lead, phone } = await resolveQuotationDetails(quotationId);
    if (!phone) return null;
    const pdfUrl = quote?.pdfUrl;
    const reminderType = payload.reminderType || "REMINDER";
    const reminderText =
      reminderType === "NOT_OPENED_24H" ?
        "Just a reminder to review your quotation."
      : "Following up on the quotation we shared.";
    const text = pdfUrl ? `${reminderText} Link: ${pdfUrl}` : reminderText;
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.quotationReminder,
      lead,
    });
  }

  async function notifyPreTravel(payload = {}) {
    const bookingId = payload.bookingId || payload.id;
    const booking =
      bookingId && bookingsService?.getById ?
        await bookingsService.getById(bookingId, {})
      : null;
    const lead = booking?.leadId ? await resolveLeadRecord(booking.leadId) : null;
    const phone = normalizePhone(lead?.phone);
    if (!phone) return null;
    const travelDate =
      booking?.travelStartDate || payload.travelStartDate || null;
    const text =
      travelDate ?
        `Your trip is coming up on ${travelDate}. Let us know if you need any help before departure.`
      : "Your trip is coming up soon. Let us know if you need any help before departure.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.preTravel,
      lead,
    });
  }

  async function notifyPostTravel(payload = {}) {
    const bookingId = payload.bookingId || payload.id;
    const booking =
      bookingId && bookingsService?.getById ?
        await bookingsService.getById(bookingId, {})
      : null;
    const lead = booking?.leadId ? await resolveLeadRecord(booking.leadId) : null;
    const phone = normalizePhone(lead?.phone);
    if (!phone) return null;
    const travelEnd = booking?.travelEndDate || payload.travelEndDate || null;
    const text =
      travelEnd ?
        `Hope you had a great trip ending on ${travelEnd}! We would love your feedback.`
      : "Hope you had a great trip! We would love your feedback.";
    return sendEventMessage({
      phone,
      text,
      templateName: templateAliases.postTravel,
      lead,
    });
  }

  return Object.freeze({
    getConfigStatus,
    verifyWebhook,
    handleWebhook,
    sendTextMessage,
    sendTemplateMessage,
    listConversationMessages,
    listConversationThreads,
    notifyLeadWelcome,
    notifyFollowupScheduled,
    notifyQuotationSent,
    notifyQuotationReminder,
    notifyPreTravel,
    notifyPostTravel,
  });
}

export { createWhatsAppService };
