import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNotificationsService } from "../hooks/useNotificationsService";
import type { NotificationItem } from "../types";
import { useAuth } from "./AuthContext";

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const fallbackNotifications: NotificationItem[] = [
  {
    id: "ntf-1",
    title: "New lead assigned",
    module: "Leads",
    time: "Today, 11:20 AM",
    isRead: false,
  },
  {
    id: "ntf-2",
    title: "Quotation approved",
    module: "Quotations",
    time: "Today, 9:05 AM",
    isRead: false,
  },
  {
    id: "ntf-3",
    title: "Payment verification pending",
    module: "Payments",
    time: "Yesterday, 6:30 PM",
    isRead: true,
  },
];

export const NotificationsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notificationsService = useNotificationsService();
  const { token } = useAuth();

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!token) {
      setNotifications(fallbackNotifications);
      setUnreadCount(
        fallbackNotifications.filter((item) => !item.isRead).length,
      );
      setLoading(false);
      return;
    }
    try {
      const [list, unread] = await Promise.all([
        notificationsService.list(),
        notificationsService.unreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(unread.unread);
    } catch {
      setNotifications(fallbackNotifications);
      setUnreadCount(
        fallbackNotifications.filter((item) => !item.isRead).length,
      );
    } finally {
      setLoading(false);
    }
  }, [notificationsService, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = async (id: string) => {
    try {
      await notificationsService.markRead(id);
    } catch {
      // fallback local update if API is unavailable
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead();
    } catch {
      // fallback local update if API is unavailable
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
    setUnreadCount(0);
  };

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const value = useContext(NotificationsContext);
  if (!value)
    throw new Error(
      "useNotifications must be used inside NotificationsProvider.",
    );
  return value;
};
