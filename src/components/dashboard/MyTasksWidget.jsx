import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';

export default function MyTasksWidget({ orgId }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasks', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        const allTasks = await base44.entities.Task.filter({ org_id: orgId });
        return allTasks
          .filter(t => t.status === 'pending' || t.status === 'in_progress')
          .slice(0, 5);
      } catch (e) {
        const allTasks = await base44.entities.Task.list();
        return allTasks
          .filter(t => t.status === 'pending' || t.status === 'in_progress')
          .slice(0, 5);
      }
    },
    enabled: !!orgId,
  });

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      critical: 'text-red-500',
    };
    return colors[priority] || 'text-gray-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">My Tasks</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">My Tasks</h3>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm text-gray-500">All caught up! No pending tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
              <Circle className={`h-4 w-4 mt-0.5 ${getPriorityColor(task.priority)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}