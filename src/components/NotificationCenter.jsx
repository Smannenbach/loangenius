import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useNotifications, NotificationType, NotificationCategory } from '@/contexts/NotificationContext';
import { formatRelativeDate } from '@/utils/formatters';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Briefcase,
  FileText,
  ClipboardList,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Get icon for notification type
 */
function getTypeIcon(type) {
  switch (type) {
    case NotificationType.SUCCESS:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case NotificationType.ERROR:
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case NotificationType.WARNING:
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

/**
 * Get icon for notification category
 */
function getCategoryIcon(category) {
  switch (category) {
    case NotificationCategory.LOAN:
      return <Briefcase className="h-4 w-4" />;
    case NotificationCategory.DOCUMENT:
      return <FileText className="h-4 w-4" />;
    case NotificationCategory.TASK:
      return <ClipboardList className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

/**
 * Get background color based on notification type
 */
function getTypeBgColor(type, read) {
  if (read) return 'bg-white';
  switch (type) {
    case NotificationType.SUCCESS:
      return 'bg-green-50';
    case NotificationType.ERROR:
      return 'bg-red-50';
    case NotificationType.WARNING:
      return 'bg-amber-50';
    default:
      return 'bg-blue-50';
  }
}

/**
 * Single notification item
 */
function NotificationItem({ notification, onMarkRead, onRemove }) {
  const timeAgo = formatRelativeDate(new Date(notification.timestamp));

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 border-b border-gray-100 transition-colors',
        getTypeBgColor(notification.type, notification.read),
        !notification.read && 'hover:bg-gray-50'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getTypeIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn(
              'text-sm',
              notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'
            )}>
              {notification.title}
            </p>
            {notification.message && (
              <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo}</span>
        </div>

        {/* Category badge */}
        {notification.category && (
          <div className="flex items-center gap-1 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {getCategoryIcon(notification.category)}
              <span className="capitalize">{notification.category}</span>
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Mark as read"
          >
            <Check className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <button
          onClick={() => onRemove(notification.id)}
          className="p-1 hover:bg-gray-200 rounded"
          title="Remove"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

/**
 * Notification Center Component
 * Full page view of all notifications
 */
export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all', 'unread', category values
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.category === filter;
  });

  const filterOptions = [
    { value: 'all', label: 'All Notifications' },
    { value: 'unread', label: 'Unread Only' },
    { value: NotificationCategory.LOAN, label: 'Loans' },
    { value: NotificationCategory.DOCUMENT, label: 'Documents' },
    { value: NotificationCategory.TASK, label: 'Tasks' },
    { value: NotificationCategory.SYSTEM, label: 'System' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              {filterOptions.find(o => o.value === filter)?.label || 'Filter'}
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {filterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-sm text-left hover:bg-gray-50',
                        filter === option.value && 'bg-blue-50 text-blue-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}

          {/* Clear All */}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === 'all'
                ? 'No notifications yet'
                : filter === 'unread'
                ? 'No unread notifications'
                : `No ${filter} notifications`}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              You'll see updates about loans, documents, and tasks here
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onRemove={removeNotification}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Compact notification bell with dropdown for header
 */
export function NotificationBell({ className }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="font-medium text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications */}
            <div className="max-h-80 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                recentNotifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors',
                      !notification.read && 'bg-slate-700/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm truncate',
                          notification.read ? 'text-slate-300' : 'text-white font-medium'
                        )}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelativeDate(new Date(notification.timestamp))}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700">
              <Link
                to={createPageUrl('AlertsNotifications')}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-center text-sm text-blue-400 hover:bg-slate-700"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
