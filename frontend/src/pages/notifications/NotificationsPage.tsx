import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSync,
} from "react-icons/fa";
import {
  notificationsApi,
  type NotificationsListQuery,
} from "../../api/notifications";
import { getApiErrorMessage } from "../../api/apiClient";
import { useNotifications } from "../../context/NotificationsContext";
import type { NotificationItem, NotificationStatus } from "../../types";

const STATUS_OPTIONS: Array<{ label: string; value: "" | NotificationStatus }> = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Read", value: "READ" },
  { label: "Failed", value: "FAILED" },
];

const LIMIT_OPTIONS = [10, 20, 50];

const toPlainText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [
      record.title,
      record.name,
      record.message,
      record.label,
      record.id,
    ]
      .map((item) => toPlainText(item))
      .find(Boolean);
    if (preferred) return preferred;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const toTitle = (notification: NotificationItem) => {
  const title = toPlainText(notification.title);
  if (title) return title;
  return toPlainText(notification.eventName, "Notification")
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toModule = (notification: NotificationItem) => {
  const eventName = toPlainText(notification.eventName);
  const source =
    toPlainText(notification.entityType) || eventName.split(".")[0] || "general";
  return source
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDateTime = (value?: string | null) => {
  const text = toPlainText(value, "Unknown time");
  if (!text || text === "Unknown time") return "Unknown time";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStatusTone = (status: NotificationStatus) => {
  if (status === "READ") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (status === "FAILED") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (status === "DELIVERED") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
};

const NotificationsPage: React.FC = () => {
  const { refresh: refreshGlobalNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [actionLoadingAll, setActionLoadingAll] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | NotificationStatus>("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const loadNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      const isSilent = options?.silent === true;
      if (isSilent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const params: NotificationsListQuery = {
          page,
          limit,
          status: statusFilter || undefined,
        };
        const [listResponse, unreadResponse] = await Promise.all([
          notificationsApi.list(params),
          notificationsApi.unreadCount(),
        ]);

        setNotifications(
          Array.isArray(listResponse.data?.items) ? listResponse.data.items : [],
        );
        setUnreadCount(
          Number(
            unreadResponse.data?.unreadCount ?? listResponse.data?.unreadCount ?? 0,
          ),
        );
        setTotal(Number(listResponse.data?.pagination?.total ?? 0));
      } catch (err) {
        setNotifications([]);
        setUnreadCount(0);
        setTotal(0);
        setError(getApiErrorMessage(err, "Failed to load notifications."));
      } finally {
        if (isSilent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [limit, page, statusFilter],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadNotifications({ silent: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const modules = useMemo(
    () => Array.from(new Set(notifications.map((item) => toModule(item)))).sort(),
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesModule = !moduleFilter || toModule(notification) === moduleFilter;
      const searchValue = searchTerm.trim().toLowerCase();
      if (!searchValue) return matchesModule;

      const haystack = [
        toTitle(notification),
        toPlainText(notification.message),
        toPlainText(notification.entityType),
        toPlainText(notification.entityId),
        toPlainText(notification.eventName),
        toPlainText(notification.channel),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesModule && haystack.includes(searchValue);
    });
  }, [moduleFilter, notifications, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleRefresh = async () => {
    await loadNotifications({ silent: true });
    await refreshGlobalNotifications();
  };

  const handleMarkRead = async (id: string) => {
    setActionLoadingId(id);
    try {
      await notificationsApi.markRead(id);
      await Promise.all([loadNotifications({ silent: true }), refreshGlobalNotifications()]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark notification as read."));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoadingAll(true);
    try {
      await notificationsApi.markAllRead();
      await Promise.all([loadNotifications({ silent: true }), refreshGlobalNotifications()]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark all notifications as read."));
    } finally {
      setActionLoadingAll(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-9xl px-0 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FaBell className="text-2xl text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                Notifications
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Powered by `/api/notifications`, `/unread-count`, `/read`, and `/read-all`
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="flex items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              <FaBell className="text-xs" />
              {unreadCount} unread
            </span>
            <button
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSync className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => void handleMarkAllRead()}
              disabled={loading || actionLoadingAll || unreadCount === 0}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaCheckDouble />
              Mark all read
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input
                type="text"
                placeholder="Search title, message, entity, event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "" | NotificationStatus);
                  setPage(1);
                }}
                className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="min-w-[150px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">All Modules</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>

              <select
                value={String(limit)}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <FaBell className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mb-2 text-base font-medium text-gray-900 dark:text-gray-100 sm:text-lg">
                {searchTerm || moduleFilter
                  ? "No matching notifications"
                  : "No notifications found"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || moduleFilter
                  ? "Try adjusting your search or module filter."
                  : "No notifications are available for the selected status yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => {
                const isRead = notification.status === "READ";
                const module = toModule(notification);
                const title = toTitle(notification);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 sm:p-6 ${
                      !isRead ? "border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {module}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 font-medium ${getStatusTone(
                              notification.status,
                            )}`}
                          >
                            {notification.status}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDateTime(notification.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {title}
                        </h3>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {toPlainText(notification.message, "No message available.")}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Event: {toPlainText(notification.eventName, "Unknown")}</span>
                          <span>Channel: {toPlainText(notification.channel, "Unknown")}</span>
                          {toPlainText(notification.entityId) ? (
                            <span>Entity ID: {toPlainText(notification.entityId)}</span>
                          ) : null}
                          {notification.lastError ? (
                            <span className="text-red-600 dark:text-red-300">
                              Error: {toPlainText(notification.lastError)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {!isRead ? (
                        <button
                          onClick={() => void handleMarkRead(notification.id)}
                          disabled={actionLoadingId === notification.id}
                          className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        >
                          <FaCheck />
                          {actionLoadingId === notification.id ? "Updating..." : "Mark read"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {total}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {unreadCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Unread</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {Math.max(0, total - unreadCount)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Processed</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {modules.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Modules</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <FaChevronLeft />
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotificationsPage;
