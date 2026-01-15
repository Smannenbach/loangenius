import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Zap, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const WEBHOOK_EVENTS = [
  'deal.created',
  'deal.updated',
  'deal.status_changed',
  'deal.approved',
  'deal.funded',
  'document.uploaded',
  'document.approved',
  'document.rejected',
  'task.created',
  'task.completed',
  'communication.sent',
  'communication.delivered'
];

export default function AdminWebhooks() {
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => base44.entities.WebhookSubscription.filter({})
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WebhookSubscription.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] })
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-slate-600">Manage webhook subscriptions for external services</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Webhook Subscription</DialogTitle>
            </DialogHeader>
            <AddWebhookForm
              onSuccess={() => {
                setShowAddModal(false);
                queryClient.invalidateQueries({ queryKey: ['webhooks'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {subscriptions.map(sub => (
          <Card key={sub.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <CardTitle className="text-lg">{sub.name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {sub.target_url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sub.is_active ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                )}
                {sub.last_status === 'failed' && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Events:</p>
                <div className="flex flex-wrap gap-2">
                  {sub.events?.map(event => (
                    <Badge key={event} variant="outline">{event}</Badge>
                  ))}
                </div>
              </div>

              {sub.last_triggered_at && (
                <p className="text-xs text-slate-500">
                  Last triggered: {new Date(sub.last_triggered_at).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(sub.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddWebhookForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('Zapier');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [secret, setSecret] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.WebhookSubscription.create(data),
    onSuccess: onSuccess
  });

  const handleSubmit = () => {
    if (!name || !url || selectedEvents.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    mutation.mutate({
      org_id: 'default',
      name,
      provider,
      target_url: url,
      events: selectedEvents,
      secret: secret || undefined,
      is_active: true
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Webhook Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zapier - New Deal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option>Zapier</option>
          <option>GoHighLevel</option>
          <option>Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Webhook URL</label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Events</label>
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {WEBHOOK_EVENTS.map(event => (
            <label key={event} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedEvents.includes(event)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedEvents([...selectedEvents, event]);
                  } else {
                    setSelectedEvents(selectedEvents.filter(e => e !== event));
                  }
                }}
              />
              <span className="text-sm">{event}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Secret (Optional)</label>
        <Input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="For HMAC signature verification"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={mutation.isPending}
        className="w-full"
      >
        Create Webhook
      </Button>
    </div>
  );
}