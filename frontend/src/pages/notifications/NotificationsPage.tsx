import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { notificationsApi } from "../api/notifications";
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

export const NotificationsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const [list, unread] = await Promise.all([
        notificationsApi.list({ page: 1, limit: 20 }),
        notificationsApi.unreadCount(),
      ]);

      setNotifications(Array.isArray(list.data?.items) ? list.data.items : []);
      setUnreadCount(Number(unread.data?.unreadCount ?? list.data?.unreadCount ?? 0));
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = async (id: string) => {
    try {
      const response = await notificationsApi.markRead(id);
      const updated = response.data;
      setNotifications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setUnreadCount((count) =>
        updated.status === "READ" ? Math.max(0, count - 1) : count,
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          status: "READ",
          readAt: item.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
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
