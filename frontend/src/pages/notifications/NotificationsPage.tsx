import React from "react";
import { useNotifications } from "../../context/NotificationsContext";

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Notifications</p>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full font-medium">
              {unreadCount} unread
            </span>
            <button 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50" 
              onClick={markAllRead} 
              disabled={loading || unreadCount === 0}
            >
              Mark all read
            </button>
          </div>
        </header>

        <section className="bg-white rounded-xl  shadow-sm border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">You'll see notifications here when they arrive</p>
            </div>
          ) : (
            <div className="divide-y  divide-gray-200">
              {notifications.map((n) => (
                <div key={n.id} className={`p-6 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors ${
                  !n.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}>
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        !n.isRead ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          !n.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {n.module}
                          </span>
                          <span className="text-xs text-gray-500">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button 
                      className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50" 
                      onClick={() => markRead(n.id)} 
                      disabled={loading}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default NotificationsPage;
