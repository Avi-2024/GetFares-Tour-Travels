/**
 * Notifications Service
 * Business logic layer for notification management
 */

import { notificationsEndpoints } from '../endpoints/notifications.api';

export class NotificationsService {
  async list(params?: { page?: number; limit?: number; status?: string }) {
    const response = await notificationsEndpoints.list(params);
    return response;
  }

  async unreadCount() {
    const response = await notificationsEndpoints.unreadCount();
    return (response as any).data.unreadCount;
  }

  async markRead(id: string) {
    await notificationsEndpoints.markRead(id);
  }

  async markAllRead() {
    await notificationsEndpoints.markAllRead();
  }

  // Helper methods
  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      LEAD: '👤',
      BOOKING: '📅',
      PAYMENT: '💰',
      QUOTATION: '📄',
      VISA: '🛂',
      SYSTEM: '⚙️',
      ALERT: '⚠️',
    };
    return iconMap[type.toUpperCase()] || '📢';
  }

  getTypeColor(type: string): string {
    const colorMap: Record<string, string> = {
      LEAD: 'blue',
      BOOKING: 'green',
      PAYMENT: 'yellow',
      QUOTATION: 'purple',
      VISA: 'orange',
      SYSTEM: 'gray',
      ALERT: 'red',
    };
    return colorMap[type.toUpperCase()] || 'gray';
  }

  getPriorityColor(priority: string): string {
    const priorityMap: Record<string, string> = {
      HIGH: 'red',
      MEDIUM: 'yellow',
      LOW: 'blue',
    };
    return priorityMap[priority.toUpperCase()] || 'gray';
  }

  formatTimeAgo(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  }

  groupByDate(notifications: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups.Today.push(notification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notification);
      } else if (notifDate >= weekAgo) {
        groups['This Week'].push(notification);
      } else {
        groups.Older.push(notification);
      }
    });

    return groups;
  }

  filterUnread(notifications: any[]): any[] {
    return notifications.filter(n => n.status === 'UNREAD');
  }

  filterByType(notifications: any[], type: string): any[] {
    return notifications.filter(n => n.type === type);
  }
}

export const notificationsService = new NotificationsService();
