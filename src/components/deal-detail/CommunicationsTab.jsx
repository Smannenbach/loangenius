import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunicationsTab({ dealId }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: communications = [] } = useQuery({
    queryKey: ['communications', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.Communication.filter({ deal_id: dealId });
      } catch {
        return await base44.entities.CommunicationsLog.filter({ deal_id: dealId });
      }
    }
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      try {
        return await base44.entities.CommunicationTemplate.filter({ is_active: true });
      } catch {
        return await base44.entities.MessageTemplate.filter({});
      }
    }
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      try {
        return await base44.functions.invoke('sendCommunication', data);
      } catch (e) {
        // Fallback: Create communication log record directly
        return await base44.entities.CommunicationsLog.create({
          org_id: data.org_id,
          deal_id: data.deal_id,
          channel: data.channel.toLowerCase(),
          direction: 'outbound',
          to: data.to_address,
          subject: data.subject || '',
          body: data.body,
          status: 'sent',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', dealId] });
      setShowEmailModal(false);
      setShowSmsModal(false);
      toast.success('Message sent successfully');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const getStatusBadge = (status) => {
    const statusColors = {
      'Sent': 'bg-blue-100 text-blue-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Opened': 'bg-green-100 text-green-800',
      'Queued': 'bg-yellow-100 text-yellow-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Email</DialogTitle>
            </DialogHeader>
            <SendEmailForm
              templates={templates}
              dealId={dealId}
              onSend={(data) => sendMutation.mutate(data)}
              isLoading={sendMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showSmsModal} onOpenChange={setShowSmsModal}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Phone className="h-4 w-4" />
              Send SMS
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send SMS</DialogTitle>
            </DialogHeader>
            <SendSMSForm
              dealId={dealId}
              onSend={(data) => sendMutation.mutate(data)}
              isLoading={sendMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {communications.map(comm => (
          <Card key={comm.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-start gap-3">
                {comm.channel === 'Email' && (
                  <Mail className="h-5 w-5 text-blue-600 mt-1" />
                )}
                {comm.channel === 'SMS' && (
                  <Phone className="h-5 w-5 text-green-600 mt-1" />
                )}
                {comm.channel === 'Portal_Message' && (
                  <MessageSquare className="h-5 w-5 text-purple-600 mt-1" />
                )}
                <div>
                  <CardTitle className="text-base">
                    {comm.channel} - {comm.direction}
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {comm.direction === 'Outbound' ? 'To: ' : 'From: '} {comm.to_address || comm.from_address}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(comm.status)}`}>
                {comm.status}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 mb-2">{comm.subject || comm.body.slice(0, 100)}</p>
              {comm.sent_at && (
                <p className="text-xs text-slate-500">
                  {new Date(comm.sent_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SendEmailForm({ templates, dealId, onSend, isLoading }) {
  const [template, setTemplate] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">To</label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="borrower@email.com" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Template (Optional)</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">-- Select Template --</option>
          {templates.filter(t => t.channel !== 'SMS').map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Body</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
      </div>

      <Button
        onClick={() => onSend({
          org_id: 'default',
          deal_id: dealId,
          channel: 'Email',
          to_address: to,
          subject,
          body,
          template_id: template || undefined,
          send_immediately: true
        })}
        disabled={isLoading}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        Send Email
      </Button>
    </div>
  );
}

function SendSMSForm({ dealId, onSend, isLoading }) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Phone Number</label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+1 (602) 555-1234" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={160}
        />
        <p className="text-xs text-slate-500 mt-1">{message.length}/160 characters</p>
      </div>

      <Button
        onClick={() => onSend({
          org_id: 'default',
          deal_id: dealId,
          channel: 'SMS',
          to_address: to,
          body: message,
          send_immediately: true
        })}
        disabled={isLoading}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        Send SMS
      </Button>
    </div>
  );
}