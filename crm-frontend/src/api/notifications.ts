import { apiRequest } from "./apiClient";
import { withQuery } from "./query";
import type { NotificationItem } from "../types";
import type { NotificationStatus } from "../types";

export type NotificationsListQuery = {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
};

export type NotificationsListPayload = {
  items: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type NotificationsListResponse = {
  data: NotificationsListPayload;
};

export type NotificationsUnreadCountResponse = {
  data: {
    unreadCount: number;
  };
};

export const notificationsApi = {
  list: (params?: NotificationsListQuery) =>
    apiRequest<NotificationsListResponse>(withQuery("/api/notifications", params)),
  unreadCount: () =>
    apiRequest<NotificationsUnreadCountResponse>("/api/notifications/unread-count"),
  markRead: (id: string) =>
    apiRequest<{ data: NotificationItem }>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),
  markAllRead: () =>
    apiRequest<{ data: { updated: number } }>("/api/notifications/read-all", {
      method: "PATCH",
    }),
};
