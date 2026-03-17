import type { HttpClient } from "../api/apiClient";
import type { NotificationItem } from "../types";

export type NotificationsListResponse = NotificationItem[];

export const createNotificationsDatasource = (client: HttpClient) => ({
  list: () => client.get<NotificationsListResponse>("/api/notifications"),
  unreadCount: () => client.get<{ unread: number }>("/api/notifications/unread-count"),
  markRead: (id: string) => client.patch(`/api/notifications/${id}/read`, {}),
  markAllRead: () => client.patch("/api/notifications/read-all", {}),
});

export type NotificationsDatasource = ReturnType<
  typeof createNotificationsDatasource
>;
