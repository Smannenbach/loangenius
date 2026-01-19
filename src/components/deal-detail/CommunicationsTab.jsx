import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Phone, Send, Loader2, CheckCircle2, Clock, Paperclip, User } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunicationsTab({ dealId, borrowerEmail, borrowerPhone }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showPortalMessageModal, setShowPortalMessageModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communications', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.CommunicationsLog.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    refetchInterval: 10000
  });

  // Get portal messages specifically
  const portalMessages = communications.filter(c => c.channel === 'portal_message' || c.channel === 'in_app');

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

  // Send portal message mutation
  const sendPortalMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CommunicationsLog.create({
        org_id: data.org_id || 'default',
        deal_id: dealId,
        channel: 'portal_message',
        direction: 'outbound',
        from: 'loan_team',
        to: borrowerEmail,
        subject: 'Message from Loan Team',
        body: data.message,
        status: 'sent',
        read_by_recipient: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', dealId] });
      setShowPortalMessageModal(false);
      toast.success('Portal message sent to borrower');
    },
    onError: (error) => {
      toast.error('Failed to send: ' + error.message);
    }
  });

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.CommunicationsLog.update(messageId, {
        read_by_recipient: true,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', dealId] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
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
              defaultTo={borrowerEmail}
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
              defaultTo={borrowerPhone}
              onSend={(data) => sendMutation.mutate(data)}
              isLoading={sendMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showPortalMessageModal} onOpenChange={setShowPortalMessageModal}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              <MessageSquare className="h-4 w-4" />
              Portal Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Portal Message</DialogTitle>
            </DialogHeader>
            <SendPortalMessageForm
              borrowerEmail={borrowerEmail}
              onSend={(data) => sendPortalMessageMutation.mutate(data)}
              isLoading={sendPortalMessageMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Unread messages alert */}
      {portalMessages.filter(m => m.direction === 'inbound' && !m.read_by_recipient).length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              {portalMessages.filter(m => m.direction === 'inbound' && !m.read_by_recipient).length} new message(s) from borrower
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const unread = portalMessages.filter(m => m.direction === 'inbound' && !m.read_by_recipient);
              unread.forEach(m => markAsReadMutation.mutate(m.id));
            }}
            className="border-purple-300 text-purple-700"
          >
            Mark All Read
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="portal" className="gap-1">
            Portal
            {portalMessages.filter(m => m.direction === 'inbound' && !m.read_by_recipient).length > 0 && (
              <Badge className="bg-purple-500 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                {portalMessages.filter(m => m.direction === 'inbound' && !m.read_by_recipient).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">

          <CommunicationsList 
            communications={communications} 
            getStatusBadge={getStatusBadge}
            onMarkRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="portal" className="mt-4">
          <PortalMessagesView 
            messages={portalMessages}
            onMarkRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <CommunicationsList 
            communications={communications.filter(c => c.channel === 'email')} 
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <CommunicationsList 
            communications={communications.filter(c => c.channel === 'sms')} 
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommunicationsList({ communications, getStatusBadge, onMarkRead }) {
  if (communications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No communications yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {communications.map(comm => (
        <Card key={comm.id} className={comm.direction === 'inbound' && !comm.read_by_recipient ? 'border-purple-300 bg-purple-50/50' : ''}>
          <CardHeader className="flex flex-row items-start justify-between py-3">
            <div className="flex items-start gap-3">
              {(comm.channel === 'email' || comm.channel === 'Email') && (
                <Mail className="h-5 w-5 text-blue-600 mt-1" />
              )}
              {(comm.channel === 'sms' || comm.channel === 'SMS') && (
                <Phone className="h-5 w-5 text-green-600 mt-1" />
              )}
              {(comm.channel === 'portal_message' || comm.channel === 'in_app') && (
                <MessageSquare className="h-5 w-5 text-purple-600 mt-1" />
              )}
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {comm.channel}
                  {comm.direction === 'inbound' && !comm.read_by_recipient && (
                    <Badge className="bg-purple-500 text-white text-xs">New</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {comm.direction === 'outbound' ? 'To: ' : 'From: '} {comm.to || comm.from}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {comm.read_by_recipient && comm.direction === 'outbound' && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Read
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(comm.status)}`}>
                {comm.status || 'sent'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {comm.subject && <p className="text-sm font-medium text-slate-700 mb-1">{comm.subject}</p>}
            <p className="text-sm text-slate-600">{comm.body?.slice(0, 200)}{comm.body?.length > 200 ? '...' : ''}</p>
            <p className="text-xs text-slate-500 mt-2">
              {new Date(comm.created_date).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortalMessagesView({ messages, onMarkRead }) {
  const messagesEndRef = useRef(null);
  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No portal messages yet</p>
          <p className="text-sm text-gray-400 mt-1">Messages from the borrower portal will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-600" />
          Portal Conversation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedMessages.map(msg => {
          const isFromBorrower = msg.direction === 'inbound';
          
          return (
            <div key={msg.id} className={`flex ${isFromBorrower ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[70%]`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  isFromBorrower 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'bg-purple-600 text-white'
                }`}>
                  {isFromBorrower && (
                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      Borrower
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  {msg.attachment_url && (
                    <a 
                      href={msg.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs mt-2 inline-flex items-center gap-1 underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      Attachment
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 px-2">
                  <span>{new Date(msg.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  {!isFromBorrower && msg.read_by_recipient && (
                    <span className="flex items-center gap-0.5 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Read
                    </span>
                  )}
                  {isFromBorrower && !msg.read_by_recipient && (
                    <button 
                      onClick={() => onMarkRead?.(msg.id)}
                      className="text-purple-600 hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </CardContent>
    </Card>
  );
}

function SendPortalMessageForm({ borrowerEmail, onSend, isLoading }) {
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-50 rounded-lg">
        <p className="text-sm text-purple-800">
          This message will appear in the borrower's portal inbox. They will see it when they next log in.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">To</label>
        <Input value={borrowerEmail || 'Borrower'} disabled className="bg-gray-50" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Type your message to the borrower..."
        />
      </div>

      <Button
        onClick={() => onSend({ message })}
        disabled={isLoading || !message.trim()}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Send Portal Message
      </Button>
    </div>
  );
}

function SendEmailForm({ templates, dealId, defaultTo, onSend, isLoading }) {
  const [template, setTemplate] = useState('');
  const [to, setTo] = useState(defaultTo || '');
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

function SendSMSForm({ dealId, defaultTo, onSend, isLoading }) {
  const [to, setTo] = useState(defaultTo || '');
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