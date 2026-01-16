import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function TasksTab({ dealId, orgId, tasks: initialTasks = [] }) {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const createTaskMutation = useMutation({
    mutationFn: async (title) => {
      return base44.entities.Task.create({
        org_id: orgId,
        deal_id: dealId,
        title,
        status: 'pending',
        priority: 'medium',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-tasks'] });
      setNewTaskTitle('');
      toast.success('Task created!');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return base44.entities.Task.update(id, { 
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null 
      });
    },
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['deal-tasks'] });
      toast.success(status === 'completed' ? 'Task completed!' : 'Task reopened');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });

  return (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tasks</CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Add task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && newTaskTitle.trim() && createTaskMutation.mutate(newTaskTitle)}
            className="w-48"
          />
          <Button 
            size="sm"
            onClick={() => newTaskTitle.trim() && createTaskMutation.mutate(newTaskTitle)}
            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {initialTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <button
                  onClick={() => toggleTaskMutation.mutate({ 
                    id: task.id, 
                    status: task.status === 'completed' ? 'pending' : 'completed' 
                  })}
                  className="flex-shrink-0"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                    {task.title || task.description}
                  </div>
                  {task.assigned_to && <div className="text-sm text-gray-500">{task.assigned_to}</div>}
                </div>
                <Badge className={task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {task.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}