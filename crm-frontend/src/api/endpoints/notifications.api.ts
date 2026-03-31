import { apiClient, withQuery } from '../core';

export const notificationsEndpoints = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get(withQuery('/api/notifications', params)),
  unreadCount: () => apiClient.get('/api/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/api/notifications/read-all'),
};
