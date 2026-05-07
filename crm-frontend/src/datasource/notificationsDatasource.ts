import type { HttpClient } from "../api/apiClient";
import type { NotificationItem, NotificationStatus } from "../types";

export type NotificationsListResponse = {
  data: {
    items: NotificationItem[];
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
};

export type NotificationsListQuery = {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
};

export const createNotificationsDatasource = (client: HttpClient) => ({
  list: (params?: NotificationsListQuery) =>
    client.get<NotificationsListResponse>("/api/notifications", { params }),
  unreadCount: () =>
    client.get<{ data: { unreadCount: number } }>("/api/notifications/unread-count"),
  markRead: (id: string) =>
    client.patch<{ data: NotificationItem }>(`/api/notifications/${id}/read`, {}),
  markAllRead: () =>
    client.patch<{ data: { updated: number } }>("/api/notifications/read-all", {}),
});

export type NotificationsDatasource = ReturnType<
  typeof createNotificationsDatasource
>;
