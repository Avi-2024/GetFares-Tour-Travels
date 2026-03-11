const { z } = require('zod');
const { NotificationStatus } = require('./notifications.schema');

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      status: z.enum([
        NotificationStatus.PENDING,
        NotificationStatus.DELIVERED,
        NotificationStatus.READ,
        NotificationStatus.FAILED,
      ]).optional(),
    })
    .optional(),
});

const unreadCount = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const markRead = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).optional(),
});

const markAllRead = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  NotificationsValidation: {
    list,
    unreadCount,
    markRead,
    markAllRead,
  },
};
