import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityFeed({ activities = [] }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity</p>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-b-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                  {activity.type?.charAt(0) || '•'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message || activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {activity.deal_number || activity.type?.replace(/_/g, ' ')} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}