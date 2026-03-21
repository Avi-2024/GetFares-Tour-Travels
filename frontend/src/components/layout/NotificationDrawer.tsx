import { FaBell, FaCheckDouble, FaXmark } from "react-icons/fa6";
import { useNotifications } from "../../context/NotificationsContext";
import StatusBadge from "../ui/StatusBadge";

type Props = {
  open: boolean;
  onClose: () => void;
};

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

const toTitle = (eventName?: string | null, title?: string | null) => {
  const safeTitle = toPlainText(title);
  if (safeTitle) return safeTitle;
  return toPlainText(eventName, "notification")
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toModule = (entityType?: string | null, eventName?: string | null) => {
  const source =
    toPlainText(entityType) || toPlainText(eventName).split(".")[0] || "general";
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

const NotificationDrawer = ({ open, onClose }: Props) => {
  const { notifications, markRead, markAllRead } = useNotifications();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed left-1/2 top-16 -translate-x-1/2 w-[min(1100px,calc(100vw-32px))] max-h-[70vh] border border-gray-200 bg-white rounded-lg shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:shadow-[0_20px_40px_rgba(255,255,255,0.18),0_0_30px_rgba(255,255,255,0.12)] z-50
                   lg:left-auto lg:right-6 lg:top-16 lg:translate-x-0 lg:w-80 lg:max-h-96"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              <FaBell /> Notifications
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void markAllRead()}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FaCheckDouble className="mr-1 inline" /> Mark all read
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FaXmark />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto max-h-80 scrollbar-hide">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No notifications
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {toTitle(notification.eventName, notification.title)}
                  </p>
                  <StatusBadge
                    status={notification.status === "READ" ? "Read" : notification.status}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {toModule(notification.entityType, notification.eventName)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {toPlainText(notification.message, "No message available.")}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDateTime(notification.createdAt)}
                </p>
                {notification.status !== "READ" ? (
                  <button
                    onClick={() => void markRead(notification.id)}
                    className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
