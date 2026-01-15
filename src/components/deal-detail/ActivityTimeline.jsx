import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pin } from 'lucide-react';

export default function ActivityTimeline({ dealId, showInternal = false }) {
  const [showAddNote, setShowAddNote] = useState(false);
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', dealId],
    queryFn: () => base44.entities.ActivityFeed.filter({ deal_id: dealId })
  });

  const addNoteMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('logActivity', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', dealId] });
      setShowAddNote(false);
    }
  });

  const filtered = activities.filter(a => 
    showInternal ? true : !a.is_internal
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
        <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
            </DialogHeader>
            <AddNoteForm
              dealId={dealId}
              onSubmit={(data) => addNoteMutation.mutate(data)}
              isLoading={addNoteMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {filtered.map(activity => (
          <Card key={activity.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 flex gap-4">
              <div className="text-2xl">{activity.icon}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{activity.title}</p>
                    {activity.description && (
                      <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                    )}
                  </div>
                  {activity.is_pinned && (
                    <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddNoteForm({ dealId, onSubmit, isLoading }) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={4}
      />
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isInternal}
          onChange={(e) => setIsInternal(e.target.checked)}
        />
        <span className="text-sm">Internal only (not visible in borrower portal)</span>
      </label>

      <Button
        onClick={() => onSubmit({
          org_id: 'default',
          deal_id: dealId,
          activity_type: 'Note',
          title: content.slice(0, 50),
          description: content,
          is_internal: isInternal
        })}
        disabled={isLoading || !content}
        className="w-full"
      >
        Add Note
      </Button>
    </div>
  );
}