import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardList, CheckCircle2, Clock, Plus, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Format date to ISO 8601 date string (YYYY-MM-DD) for due_date field
 */
function formatDueDate(date) {
  if (!date) return null;
  if (date instanceof Date && isValid(date)) {
    return format(date, 'yyyy-MM-dd');
  }
  return null;
}

/**
 * Parse a date string safely
 */
function parseDueDate(dateStr) {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function TasksTab({ dealId, orgId, tasks: initialTasks = [] }) {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: async ({ title, dueDate }) => {
      const taskData = {
        org_id: orgId,
        deal_id: dealId,
        title,
        status: 'pending',
        priority: 'medium',
      };
      
      // Only add due_date if it's a valid date
      if (dueDate) {
        const formattedDate = formatDueDate(dueDate);
        if (formattedDate) {
          taskData.due_date = formattedDate;
        }
      }
      
      return base44.entities.Task.create(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-tasks'] });
      setNewTaskTitle('');
      setNewTaskDueDate(null);
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

  const handleCreateTask = () => {
    if (newTaskTitle.trim()) {
      createTaskMutation.mutate({ title: newTaskTitle, dueDate: newTaskDueDate });
    }
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg">Tasks</CardTitle>
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            placeholder="Add task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
            className="w-48"
          />
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`gap-1 ${newTaskDueDate ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <CalendarIcon className="h-4 w-4" />
                {newTaskDueDate ? format(newTaskDueDate, 'MMM d') : 'Due'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={newTaskDueDate}
                onSelect={(date) => {
                  setNewTaskDueDate(date);
                  setShowDatePicker(false);
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {newTaskDueDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setNewTaskDueDate(null)}
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          )}
          <Button 
            size="sm"
            onClick={handleCreateTask}
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
            {initialTasks.map((task) => {
              const dueDate = parseDueDate(task.due_date);
              const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
              
              return (
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
                      <Clock className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                      {task.title || task.description}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {task.assigned_to && <span>{task.assigned_to}</span>}
                      {dueDate && (
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          Due: {format(dueDate, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={
                    task.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : isOverdue 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-700'
                  }>
                    {isOverdue && task.status !== 'completed' ? 'overdue' : task.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}