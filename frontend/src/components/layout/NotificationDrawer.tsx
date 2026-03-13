import { FaBell, FaCheckDouble, FaXmark } from "react-icons/fa6";
import { useNotifications } from "../../context/NotificationsContext";
import StatusBadge from "../ui/StatusBadge";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NotificationDrawer = ({ open, onClose }: Props) => {
  const { notifications, markRead, markAllRead } = useNotifications();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <FaBell /> Notifications
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => void markAllRead()} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              <FaCheckDouble className="mr-1 inline" /> Mark all read
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
              <FaXmark />
            </button>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{notification.title}</p>
                <StatusBadge status={notification.isRead ? "Read" : "Unread"} />
              </div>
              <p className="text-xs text-gray-500">{notification.module}</p>
              <p className="mt-1 text-xs text-gray-400">{notification.time}</p>
              {!notification.isRead ? (
                <button onClick={() => void markRead(notification.id)} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700">
                  Mark as read
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
