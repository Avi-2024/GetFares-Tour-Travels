import webpush from "web-push";
import { AppError } from "../../core/errors/index.js";

function createPushService({ repository, logger, config }) {
  function ensureUser(context) {
    if (!context.user?.id) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }
    return context.user;
  }

  function isPushConfigured() {
    return Boolean(
      config?.push?.enabled &&
        config?.push?.vapidPublicKey &&
        config?.push?.vapidPrivateKey,
    );
  }

  function requirePushConfigured() {
    if (!isPushConfigured()) {
      throw new AppError(
        501,
        "Push notifications not configured",
        "PUSH_NOT_CONFIGURED",
      );
    }
  }

  function configureWebPushOnce() {
    if (!isPushConfigured()) return;
    webpush.setVapidDetails(
      config.push.vapidSubject || "mailto:admin@example.com",
      config.push.vapidPublicKey,
      config.push.vapidPrivateKey,
    );
  }

  configureWebPushOnce();

  async function listMine(context = {}) {
    const user = ensureUser(context);
    const items = await repository.listByUserId(String(user.id));
    return { items };
  }

  async function getPublicKey() {
    requirePushConfigured();
    return {
      publicKey: config.push.vapidPublicKey,
    };
  }

  async function subscribe(payload = {}, context = {}) {
    requirePushConfigured();
    const user = ensureUser(context);

    const subscription = payload.subscription;
    const endpoint = subscription?.endpoint;
    if (!endpoint) {
      throw new AppError(400, "Missing subscription endpoint", "BAD_REQUEST");
    }

    const record = await repository.upsertSubscription({
      userId: String(user.id),
      endpoint: String(endpoint),
      subscription,
      userAgent: payload.userAgent,
    });

    return { subscribed: true, item: record };
  }

  async function unsubscribe(payload = {}, context = {}) {
    const user = ensureUser(context);
    const endpoint = payload.endpoint;
    if (!endpoint) {
      throw new AppError(400, "Missing endpoint", "BAD_REQUEST");
    }
    const deleted = await repository.deleteByEndpoint({
      userId: String(user.id),
      endpoint: String(endpoint),
    });
    return { unsubscribed: true, deleted };
  }

  async function sendLeadAssignedPush({ assigneeId, leadId, leadName } = {}) {
    if (!isPushConfigured()) {
      return { sent: 0, skipped: true, reason: "NOT_CONFIGURED" };
    }
    if (!assigneeId) {
      return { sent: 0, skipped: true, reason: "NO_ASSIGNEE" };
    }

    const userId = String(assigneeId);
    const subscriptions = await repository.listByUserId(userId);
    if (!subscriptions.length) {
      return { sent: 0, skipped: true, reason: "NO_SUBSCRIPTIONS" };
    }

    const title = "New lead assigned";
    const body = leadName ? `Lead: ${leadName}` : `Lead ID: ${leadId}`;
    const url = leadId ? `/leads/${leadId}` : "/leads";

    let sent = 0;
    for (const item of subscriptions) {
      if (!item?.subscription) continue;
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            type: "leads.assigned",
            title,
            body,
            url,
            leadId: leadId || null,
          }),
        );
        sent += 1;
      } catch (error) {
        const statusCode = Number(error?.statusCode || error?.status || 0);
        const code = String(error?.body?.code || error?.code || "");
        logger.warn(
          {
            err: error,
            module: "push",
            userId,
            endpoint: item.endpoint,
            statusCode,
            code,
          },
          "Push send failed",
        );

        // Cleanup invalid subscriptions.
        if (statusCode === 404 || statusCode === 410) {
          try {
            await repository.deleteByEndpoint({
              userId,
              endpoint: item.endpoint,
            });
          } catch (cleanupError) {
            logger.debug(
              { err: cleanupError, module: "push" },
              "Push subscription cleanup failed",
            );
          }
        }
      }
    }

    return { sent };
  }

  return Object.freeze({
    listMine,
    getPublicKey,
    subscribe,
    unsubscribe,
    sendLeadAssignedPush,
  });
}

export { createPushService };

