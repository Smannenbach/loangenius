import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Trash2, CheckCircle2, AlertCircle, Info, Clock } from 'lucide-react';

export default function AlertsNotifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({});
      return notifs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const getIcon = (type) => {
    const icons = {
      'document_signed': <CheckCircle2 className="h-5 w-5 text-green-600" />,
      'condition_satisfied': <CheckCircle2 className="h-5 w-5 text-green-600" />,
      'condition_rejected': <AlertCircle className="h-5 w-5 text-red-600" />,
      'document_uploaded': <Info className="h-5 w-5 text-blue-600" />,
      'reminder': <Bell className="h-5 w-5 text-yellow-600" />,
      'default': <Info className="h-5 w-5 text-gray-600" />
    };
    return icons[type] || icons.default;
  };

  const filteredNotifications = notifications?.filter(n => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'alerts') return ['condition_rejected', 'reminder'].includes(n.type);
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-600 text-lg px-3 py-1">
              {unreadCount} New
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Notifications</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notif => (
                <Card
                  key={notif.id}
                  className={notif.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getIcon(notif.type)}</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{notif.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                        {notif.deal_id && (
                          <p className="text-xs text-gray-500 mt-2">
                            Deal: {notif.deal_id}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(notif.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notif.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markReadMutation.mutate(notif.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotificationMutation.mutate(notif.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No notifications</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}