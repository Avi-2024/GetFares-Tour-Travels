const { AppError } = require('../../core/errors');
const { toPagination } = require('../../core/utils');
const { NotificationStatus } = require('./notifications.schema');

const ROLE_BY_DOMAIN = Object.freeze({
  leads: ['manager'],
  quotations: ['manager', 'sales_consultant'],
  bookings: ['manager', 'sales_consultant'],
  payments: ['accounts', 'manager'],
  refunds: ['accounts', 'manager'],
  visa: ['visa_executive', 'manager'],
  campaigns: ['marketing', 'manager'],
  customers: ['sales_consultant', 'manager'],
  complaints: ['support', 'manager'],
  auth: ['admin', 'manager'],
  webhooks: ['marketing', 'manager'],
});

const USER_ID_HINT_KEYS = Object.freeze([
  'userId',
  'assigneeId',
  'assignedTo',
  'createdBy',
  'updatedBy',
  'sentBy',
  'approvedBy',
  'triggeredBy',
  'verifiedBy',
  'managerId',
  'consultantId',
]);

function createNotificationsService({ repository, logger, events, eventPublisher }) {
  function ensureUser(context) {
    if (!context.user?.id) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    return context.user;
  }

  function unique(values = []) {
    return [...new Set(values.filter(Boolean).map((item) => String(item)))];
  }

  function normalizeRecipients(payload = {}) {
    return {
      userIds: unique(payload.userIds),
      roles: unique(payload.roles),
      teamIds: unique(payload.teamIds),
    };
  }

  function buildRecipientTargets(recipients) {
    const targets = [];

    recipients.userIds.forEach((userId) => {
      targets.push({ recipientUserId: userId, recipientRole: null, recipientTeamId: null });
    });

    recipients.roles.forEach((role) => {
      targets.push({ recipientUserId: null, recipientRole: role, recipientTeamId: null });
    });

    recipients.teamIds.forEach((teamId) => {
      targets.push({ recipientUserId: null, recipientRole: null, recipientTeamId: teamId });
    });

    if (!targets.length) {
      targets.push({ recipientUserId: null, recipientRole: null, recipientTeamId: null });
    }

    return targets;
  }

  function toTitle(eventName) {
    return String(eventName || 'notification.event')
      .split('.')
      .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
      .join(' ');
  }

  function toDomain(eventName) {
    return String(eventName || '')
      .split('.')[0]
      .trim();
  }

  function extractEntityId(payload = {}) {
    return (
      payload.id ||
      payload.leadId ||
      payload.quotationId ||
      payload.bookingId ||
      payload.paymentId ||
      payload.refundId ||
      payload.campaignId ||
      payload.customerId ||
      payload.complaintId ||
      null
    );
  }

  function extractUsersFromPayload(payload = {}) {
    const userIds = [];
    USER_ID_HINT_KEYS.forEach((key) => {
      if (payload[key]) {
        userIds.push(payload[key]);
      }
    });
    return unique(userIds);
  }

  function buildNotificationMessage(eventName, payload = {}) {
    if (payload.message) {
      return String(payload.message);
    }

    const domain = toDomain(eventName);
    const entityId = extractEntityId(payload);
    if (!entityId) {
      return `${toTitle(eventName)} event triggered`;
    }

    return `${domain} event for ${entityId}`;
  }

  async function publishOne(target, payload) {
    const record = await repository.create({
      eventName: payload.eventName,
      channel: payload.channel || 'SOCKET_IO',
      entityType: payload.entityType || toDomain(payload.eventName),
      entityId: payload.entityId || null,
      title: payload.title || toTitle(payload.eventName),
      message: payload.message || buildNotificationMessage(payload.eventName, payload.payload),
      payload: payload.payload || {},
      recipientUserId: target.recipientUserId,
      recipientRole: target.recipientRole,
      recipientTeamId: target.recipientTeamId,
      status: NotificationStatus.PENDING,
    });

    events.emitCreated(record);

    const delivery = await eventPublisher.publish({
      id: record.id,
      eventName: record.eventName,
      title: record.title,
      message: record.message,
      entityType: record.entityType,
      entityId: record.entityId,
      payload: {
        ...record.payload,
        notificationId: record.id,
      },
      recipients: {
        userIds: target.recipientUserId ? [target.recipientUserId] : [],
        roles: target.recipientRole ? [target.recipientRole] : [],
        teamIds: target.recipientTeamId ? [target.recipientTeamId] : [],
      },
      ackRequired: payload.ackRequired === true,
      timeoutMs: payload.timeoutMs,
    });

    const updated = await repository.markDeliveryAttempt(record.id, delivery);
    if (updated) {
      events.emitDeliveryUpdated({
        id: updated.id,
        status: updated.status,
        deliveryAttempts: updated.deliveryAttempts,
        lastError: updated.lastError,
      });
    }

    return updated || record;
  }

  async function publish(payload = {}) {
    const recipients = normalizeRecipients(payload.recipients || {});
    const targets = buildRecipientTargets(recipients);
    const created = [];

    for (const target of targets) {
      try {
        const item = await publishOne(target, payload);
        created.push(item);
      } catch (error) {
        logger.error(
          {
            err: error,
            module: 'notifications',
            eventName: payload.eventName,
            target,
          },
          'Failed to publish notification target',
        );
      }
    }

    return {
      totalTargets: targets.length,
      created: created.length,
      items: created,
    };
  }

  function buildDomainRecipients(eventName, payload = {}) {
    const domain = toDomain(eventName);
    const roles = ROLE_BY_DOMAIN[domain] || ['manager'];
    const userIds = extractUsersFromPayload(payload);

    return normalizeRecipients({
      userIds,
      roles,
      teamIds: payload.teamId ? [payload.teamId] : [],
    });
  }

  async function captureDomainEvent({ eventName, payload = {} }) {
    return publish({
      eventName,
      entityType: toDomain(eventName),
      entityId: extractEntityId(payload),
      title: toTitle(eventName),
      message: buildNotificationMessage(eventName, payload),
      payload,
      recipients: buildDomainRecipients(eventName, payload),
      ackRequired: false,
    });
  }

  return Object.freeze({
    publish,
    captureDomainEvent,

    async listMine(filters = {}, context = {}) {
      const user = ensureUser(context);
      const pagination = toPagination(filters);
      const status = filters.status || undefined;

      const identity = {
        userId: user.id,
        role: user.role || null,
        teamId: user.teamId || null,
      };

      const [items, total, unreadCount] = await Promise.all([
        repository.listForUser(identity, {
          status,
          ...pagination,
        }),
        repository.countForUser(identity, { status }),
        repository.countUnreadForUser(identity),
      ]);

      return {
        items,
        unreadCount,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
        },
      };
    },

    async getUnreadCount(context = {}) {
      const user = ensureUser(context);
      const unreadCount = await repository.countUnreadForUser({
        userId: user.id,
        role: user.role || null,
        teamId: user.teamId || null,
      });

      return {
        unreadCount,
      };
    },

    async markRead(notificationId, context = {}) {
      const user = ensureUser(context);
      const existing = await repository.findById(notificationId);

      if (!existing) {
        throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
      }

      const canRead = repository.isRecipientMatch(
        {
          recipient_user_id: existing.recipientUserId,
          recipient_role: existing.recipientRole,
          recipient_team_id: existing.recipientTeamId,
        },
        {
          userId: user.id,
          role: user.role || null,
          teamId: user.teamId || null,
        },
      );

      if (!canRead) {
        throw new AppError(403, 'Not allowed to access this notification', 'NOTIFICATION_FORBIDDEN');
      }

      if (existing.status === NotificationStatus.READ) {
        return existing;
      }

      const updated = await repository.markRead(notificationId);
      events.emitRead(updated);
      return updated;
    },

    async markAllRead(context = {}) {
      const user = ensureUser(context);
      const updated = await repository.markAllRead({
        userId: user.id,
        role: user.role || null,
        teamId: user.teamId || null,
      });

      events.emitReadAll({
        userId: user.id,
        count: updated,
      });

      return {
        updated,
      };
    },
  });
}

module.exports = { createNotificationsService };
