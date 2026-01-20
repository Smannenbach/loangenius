import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EVENT_TYPES = [
  'document.uploaded',
  'document.approved',
  'deal.status_changed',
  'message.sent',
  'condition.created',
  'condition.resolved',
];

export default function AdminWebhooks() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    event_type: 'document.uploaded',
    webhook_url: '',
    secret: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [deleteConfirmWebhook, setDeleteConfirmWebhook] = useState(null);

  const queryClient = useQueryClient();

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => base44.entities.WebhookConfig.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WebhookConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setShowForm(false);
      setFormData({ event_type: 'document.uploaded', webhook_url: '', secret: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WebhookConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete webhook: ' + error.message);
    }
  });

  const handleCreate = async () => {
    if (!formData.webhook_url) {
      toast.error('Webhook URL is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>External URLs for event notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {webhooks?.map((webhook) => (
              <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium">{webhook.event_type}</div>
                  <div className="text-sm text-gray-600">{webhook.webhook_url}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last triggered: {webhook.last_triggered_at ? new Date(webhook.last_triggered_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmWebhook(webhook)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {webhooks?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No webhooks configured. Add one to receive event notifications.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Webhook URL</label>
              <Input
                placeholder="https://example.com/webhook"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Secret (optional)</label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Secret for HMAC signature"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmWebhook} onOpenChange={() => setDeleteConfirmWebhook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook ({deleteConfirmWebhook?.event_type})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(deleteConfirmWebhook.id);
                setDeleteConfirmWebhook(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}