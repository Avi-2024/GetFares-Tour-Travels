import { apiRequest } from "./apiClient";
import type { NotificationItem } from "../types";

export const notificationsApi = {
  list: () => apiRequest<NotificationItem[]>("/api/notifications"),
  unreadCount: () => apiRequest<{ unread: number }>("/api/notifications/unread-count"),
  markRead: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiRequest("/api/notifications/read-all", { method: "PATCH" }),
};
