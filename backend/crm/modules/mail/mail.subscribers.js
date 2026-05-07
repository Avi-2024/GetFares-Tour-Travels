function normalizeEmail(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const DEFAULT_SYSTEM_DATE_TIME_PREFERENCES = Object.freeze({
  timezone: "Asia/Kolkata",
  locale: "en-IN",
});

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeLocale(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
  }
  try {
    const [resolved] = Intl.DateTimeFormat.supportedLocalesOf([raw]);
    return resolved || DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
  } catch {
    return DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.locale;
  }
}

function normalizeDateTimePreferences(value = {}) {
  const timezoneRaw = String(value.timezone || "").trim();
  return {
    timezone:
      timezoneRaw && isValidTimeZone(timezoneRaw) ?
        timezoneRaw
      : DEFAULT_SYSTEM_DATE_TIME_PREFERENCES.timezone,
    locale: normalizeLocale(value.locale),
  };
}

function formatFollowupDateTime(
  value,
  preferences = DEFAULT_SYSTEM_DATE_TIME_PREFERENCES,
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const normalized = normalizeDateTimePreferences(preferences);
  try {
    return new Intl.DateTimeFormat(normalized.locale, {
      timeZone: normalized.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function registerMailSubscribers({
  eventBus,
  mailService,
  leadsService,
  logger,
}) {
  const subscriptions = [];

  function on(eventName, handler) {
    const wrapped = async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger?.warn({ err: error, eventName }, "Mail handler failed");
      }
    };
    eventBus.on(eventName, wrapped);
    subscriptions.push([eventName, wrapped]);
  }

  async function notifyFollowupByEmail(payload = {}) {
    const followupType = String(payload.followupType || "").toUpperCase();
    if (!["EMAIL", "FINAL_REMINDER"].includes(followupType)) {
      return null;
    }

    const leadId = payload.leadId || null;
    const lead =
      leadId && leadsService?.getById ?
        await leadsService.getById(leadId, {})
      : null;

    const toEmail = normalizeEmail(payload.email) || normalizeEmail(lead?.email);
    if (!toEmail) {
      return null;
    }

    const customerName = String(
      lead?.fullName || payload.fullName || payload.name || "there",
    ).trim();
    const fallbackText =
      followupType === "FINAL_REMINDER" ?
        `This is our final reminder regarding your travel enquiry. Please reply if you want us to keep this request active.`
      : `Just checking in on your travel enquiry. Please share a convenient time to connect.`;
    const body = String(payload.notes || "").trim() || fallbackText;

    const dateTimePreferences = normalizeDateTimePreferences(
      payload.dateTimePreferences || {},
    );
    const eventFollowupLabel =
      typeof payload.followupLabel === "string" ?
        payload.followupLabel.trim()
      : "";
    const followupLabel =
      eventFollowupLabel ||
      formatFollowupDateTime(payload.followupDate, dateTimePreferences);

    const subject =
      followupType === "FINAL_REMINDER" ?
        "Final Reminder: Your travel enquiry"
      : "Follow-up: Your travel enquiry";
    const textLines = [
      `Hi ${customerName || "there"},`,
      "",
      body,
      ...(followupLabel ? ["", `Scheduled follow-up time: ${followupLabel}`] : []),
      "",
      "Thanks,",
      "Get2Vacations Team",
    ];

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${escapeHtml(customerName || "there")},</p>
        <p>${escapeHtml(body)}</p>
        ${
          followupLabel ?
            `<p><strong>Scheduled follow-up time:</strong> ${escapeHtml(followupLabel)}</p>`
          : ""
        }
        <p>Thanks,<br/>Get2Vacations Team</p>
      </div>
    `;

    return mailService.sendMail({
      to: toEmail,
      subject,
      text: textLines.join("\n"),
      html,
    });
  }

  on("leads.followup_overdue", notifyFollowupByEmail);

  return Object.freeze({
    dispose() {
      subscriptions.forEach(([eventName, handler]) => {
        eventBus.off(eventName, handler);
      });
    },
  });
}

export { registerMailSubscribers };
