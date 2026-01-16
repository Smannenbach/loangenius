import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ActivityFeed({ activities = [] }) {
  const getActivityIcon = (type) => {
    const icons = {
      deal_created: '🆕',
      deal_updated: '📝',
      document_uploaded: '📄',
      status_changed: '🔄',
      lead_converted: '✅',
      task_completed: '☑️',
      lead_created: '👤',
      quote_sent: '📧',
    };
    return icons[type] || '📌';
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm text-gray-500">No recent activity</p>
              <p className="text-xs text-gray-400 mt-1">Activity will appear here as you work</p>
              <div className="mt-4 flex gap-2 justify-center">
                <Link to={createPageUrl('Leads')} className="text-xs text-blue-600 hover:underline">Add a lead</Link>
                <span className="text-gray-300">|</span>
                <Link to={createPageUrl('LoanApplicationWizard')} className="text-xs text-blue-600 hover:underline">Create a deal</Link>
              </div>
            </div>
          ) : (
            activities.slice(0, 8).map((activity, idx) => (
              <div key={activity.id || idx} className="flex gap-3 pb-3 border-b last:border-b-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.message || activity.description || 'Activity'}</p>
                  <p className="text-xs text-gray-500">
                    {activity.deal_number || activity.type?.replace(/_/g, ' ') || ''} • {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : activity.created_date ? formatDistanceToNow(new Date(activity.created_date), { addSuffix: true }) : 'Recently'}
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