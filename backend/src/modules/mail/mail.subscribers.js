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

    const followupDate = payload.followupDate ? new Date(payload.followupDate) : null;
    const followupLabel =
      followupDate && !Number.isNaN(followupDate.getTime()) ?
        followupDate.toLocaleString("en-IN", { hour12: true })
      : null;

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
