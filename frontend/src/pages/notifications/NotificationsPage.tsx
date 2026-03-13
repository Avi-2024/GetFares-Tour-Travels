import React from "react";
import { useNotifications } from "../../context/NotificationsContext";

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Notifications</p>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Unread: {unreadCount}</span>
            <button className="btn-secondary text-sm" onClick={markAllRead} disabled={loading}>
              Mark all read
            </button>
          </div>
        </header>

        <section className="bg-white rounded-xl shadow divide-y divide-gray-200">
          {notifications.length === 0 && (
            <div className="p-4 text-sm text-gray-600">No notifications yet.</div>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500">{n.module}</p>
                <p className="text-xs text-gray-500 mt-1">{n.time}</p>
              </div>
              <button className="btn-secondary text-xs" onClick={() => markRead(n.id)} disabled={loading}>
                Mark read
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default NotificationsPage;
