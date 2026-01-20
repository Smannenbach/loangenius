import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Notification types
 */
export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Notification categories for filtering
 */
export const NotificationCategory = {
  LOAN: 'loan',
  DOCUMENT: 'document',
  TASK: 'task',
  SYSTEM: 'system',
  MESSAGE: 'message',
};

const NotificationContext = createContext(null);

/**
 * Notification Provider
 * Manages both toast notifications and persistent notification state
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('loangenius_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save notifications to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('loangenius_notifications', JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [notifications]);

  /**
   * Show a toast notification
   */
  const showToast = useCallback((message, options = {}) => {
    const { type = NotificationType.INFO, description, action, duration = 4000 } = options;

    const toastOptions = {
      description,
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    };

    switch (type) {
      case NotificationType.SUCCESS:
        toast.success(message, toastOptions);
        break;
      case NotificationType.ERROR:
        toast.error(message, toastOptions);
        break;
      case NotificationType.WARNING:
        toast.warning(message, toastOptions);
        break;
      default:
        toast.info(message, toastOptions);
    }
  }, []);

  /**
   * Add a persistent notification to the notification center
   */
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
    setUnreadCount(prev => prev + 1);

    // Also show as toast if specified
    if (notification.showToast !== false) {
      showToast(notification.title, {
        type: notification.type,
        description: notification.message,
        action: notification.action,
      });
    }

    return newNotification.id;
  }, [showToast]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId && !n.read
          ? { ...n, read: true }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  /**
   * Convenience methods for different notification types
   */
  const success = useCallback((title, message, options = {}) => {
    return addNotification({
      title,
      message,
      type: NotificationType.SUCCESS,
      ...options,
    });
  }, [addNotification]);

  const error = useCallback((title, message, options = {}) => {
    return addNotification({
      title,
      message,
      type: NotificationType.ERROR,
      ...options,
    });
  }, [addNotification]);

  const warning = useCallback((title, message, options = {}) => {
    return addNotification({
      title,
      message,
      type: NotificationType.WARNING,
      ...options,
    });
  }, [addNotification]);

  const info = useCallback((title, message, options = {}) => {
    return addNotification({
      title,
      message,
      type: NotificationType.INFO,
      ...options,
    });
  }, [addNotification]);

  /**
   * Loan-specific notifications
   */
  const loanStatusChange = useCallback((loanNumber, oldStatus, newStatus, loanId) => {
    return addNotification({
      title: `Loan ${loanNumber} Status Updated`,
      message: `Status changed from ${oldStatus} to ${newStatus}`,
      type: NotificationType.INFO,
      category: NotificationCategory.LOAN,
      loanId,
      metadata: { loanNumber, oldStatus, newStatus },
    });
  }, [addNotification]);

  const documentUploaded = useCallback((documentName, loanNumber, documentId) => {
    return addNotification({
      title: 'New Document Uploaded',
      message: `${documentName} has been uploaded${loanNumber ? ` for ${loanNumber}` : ''}`,
      type: NotificationType.SUCCESS,
      category: NotificationCategory.DOCUMENT,
      documentId,
      metadata: { documentName, loanNumber },
    });
  }, [addNotification]);

  const taskAssigned = useCallback((taskTitle, assignedBy, taskId) => {
    return addNotification({
      title: 'Task Assigned',
      message: `"${taskTitle}" assigned by ${assignedBy}`,
      type: NotificationType.INFO,
      category: NotificationCategory.TASK,
      taskId,
      metadata: { taskTitle, assignedBy },
    });
  }, [addNotification]);

  const taskDueSoon = useCallback((taskTitle, dueDate, taskId) => {
    return addNotification({
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due ${dueDate}`,
      type: NotificationType.WARNING,
      category: NotificationCategory.TASK,
      taskId,
      metadata: { taskTitle, dueDate },
    });
  }, [addNotification]);

  const value = {
    // State
    notifications,
    unreadCount,

    // Basic methods
    showToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,

    // Convenience methods
    success,
    error,
    warning,
    info,

    // Domain-specific methods
    loanStatusChange,
    documentUploaded,
    taskAssigned,
    taskDueSoon,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
