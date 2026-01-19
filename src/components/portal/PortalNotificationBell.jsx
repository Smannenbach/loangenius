import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageSquare, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const notificationIcons = {
  new_message: MessageSquare,
  document_approved: CheckCircle2,
  document_rejected: AlertCircle,
  condition_added: FileText,
  status_update: Clock,
  action_required: AlertCircle,
  closing_scheduled: CheckCircle2,
};

const notificationColors = {
  new_message: 'text-purple-600 bg-purple-100',
  document_approved: 'text-green-600 bg-green-100',
  document_rejected: 'text-red-600 bg-red-100',
  condition_added: 'text-blue-600 bg-blue-100',
  status_update: 'text-blue-600 bg-blue-100',
  action_required: 'text-amber-600 bg-amber-100',
  closing_scheduled: 'text-green-600 bg-green-100',
};

export default function PortalNotificationBell({ sessionId, dealId, onNavigate }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['portalNotifications', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.PortalNotification.filter({ deal_id: dealId }, '-created_date', 20);
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
    refetchInterval: 30000
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.PortalNotification.update(notificationId, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalNotifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => base44.entities.PortalNotification.update(n.id, {
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalNotifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link_to && onNavigate) {
      onNavigate(notification.link_to);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => {
              const Icon = notificationIcons[notification.notification_type] || Bell;
              const colorClass = notificationColors[notification.notification_type] || 'text-gray-600 bg-gray-100';
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex gap-3 w-full">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}