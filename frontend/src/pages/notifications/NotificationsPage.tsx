import React, { useState } from "react";
import { useNotifications } from "../../context/NotificationsContext";
import { FaBell, FaCheck, FaCheckDouble, FaSearch } from "react-icons/fa";

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [moduleFilter, setModuleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique modules for filter dropdown
  const modules = Array.from(new Set(notifications.map(n => n.module)));

  // Filter notifications based on current filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesStatus = filter === 'all' || 
                         (filter === 'unread' && !notification.isRead) ||
                         (filter === 'read' && notification.isRead);
    const matchesModule = !moduleFilter || notification.module === moduleFilter;
    const matchesSearch = !searchTerm || 
                         notification.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesModule && matchesSearch;
  });

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <main className="flex-1 overflow-y-auto  ">
      <div className=" mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaBell className="text-2xl text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stay updated with your latest activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                <FaBell className="text-xs" />
                {unreadCount} unread
              </span>
            )}
            <button 
              onClick={handleMarkAllRead}
              disabled={loading || unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaCheckDouble />
              Mark all read
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Modules</option>
              {modules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>

            {/* Results count */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </div>
          </div>
        </section>

        {/* Notifications List */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <FaBell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || filter !== 'all' || moduleFilter ? 'No matching notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filter !== 'all' || moduleFilter 
                  ? 'Try adjusting your filters to see more notifications'
                  : 'You\'ll see notifications here when they arrive'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-6 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                        !notification.isRead ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className={`text-sm font-medium mb-1 ${
                          !notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        
                        {/* Meta information */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className={`px-2 py-1 rounded-full font-medium ${
                            notification.module === 'Leads' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                            notification.module === 'Quotations' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                            notification.module === 'Payments' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                            notification.module === 'Bookings' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.module}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {notification.time}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            !notification.isRead 
                              ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                              : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          }`}>
                            {notification.isRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action button */}
                  {!notification.isRead && (
                    <button 
                      onClick={() => handleMarkRead(notification.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium disabled:opacity-50 transition-colors"
                    >
                      <FaCheck />
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Summary Stats */}
        {notifications.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notifications.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Unread</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{notifications.length - unreadCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Read</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{modules.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Modules</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default NotificationsPage;
