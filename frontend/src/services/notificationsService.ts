import type { NotificationsDatasource } from "../datasource/notificationsDatasource";

export const createNotificationsService = (datasource: NotificationsDatasource) => ({
  list: () => datasource.list(),
  unreadCount: () => datasource.unreadCount(),
  markRead: (id: string) => datasource.markRead(id),
  markAllRead: () => datasource.markAllRead(),
});

export type NotificationsService = ReturnType<typeof createNotificationsService>;
