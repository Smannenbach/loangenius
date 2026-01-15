import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  User,
} from 'lucide-react';

export default function Communications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState('email');
  const [message, setMessage] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('sendCommunication', {
        channel: data.channel,
        to: data.to,
        subject: data.subject,
        body: data.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setMessage({ to: '', subject: '', body: '' });
      setIsOpen(false);
    },
  });

  const handleSend = () => {
    if (!message.to || !message.body) {
      alert('Please fill in recipient and message');
      return;
    }
    sendMutation.mutate({
      channel,
      to: message.to,
      subject: message.subject,
      body: message.body,
    });
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      delivered: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      bounced: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Mail className="h-7 w-7 text-blue-600" />
            Communications
          </h1>
          <p className="text-gray-500 mt-1">Email, SMS, and call history</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recipient ({channel === 'email' ? 'Email' : 'Phone'})</Label>
                <Input
                  value={message.to}
                  onChange={(e) => setMessage({...message, to: e.target.value})}
                  placeholder={channel === 'email' ? 'steve@getmib.com' : '+15035518690'}
                />
              </div>
              {channel === 'email' && (
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={message.subject}
                    onChange={(e) => setMessage({...message, subject: e.target.value})}
                    placeholder="Message subject"
                  />
                </div>
              )}
              <div>
                <Label>Message</Label>
                <textarea
                  value={message.body}
                  onChange={(e) => setMessage({...message, body: e.target.value})}
                  placeholder="Type your message..."
                  className="w-full h-32 p-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSend}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Search */}
          <Card className="border-gray-200 mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search communications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Communications List */}
          <Card className="border-gray-200">
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No communications yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start by sending an email or SMS to a borrower
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                      <div className={`p-2 rounded-lg ${
                        log.channel === 'email' ? 'bg-blue-100' :
                        log.channel === 'sms' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {getChannelIcon(log.channel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {log.direction === 'outbound' ? 'To: ' : 'From: '}
                            {log.to || log.from || 'Unknown'}
                          </span>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status || 'sent'}
                          </Badge>
                        </div>
                        {log.subject && (
                          <p className="text-sm font-medium text-gray-700 mt-1">{log.subject}</p>
                        )}
                        <p className="text-sm text-gray-500 truncate mt-1">{log.body}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {log.created_date ? new Date(log.created_date).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-4">
            {logs.filter(l => l.channel === 'email').length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="py-12 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No email communications</p>
                </CardContent>
              </Card>
            ) : (
              logs.filter(l => l.channel === 'email').map(log => (
                <Card key={log.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{log.to || log.from}</p>
                        {log.subject && <p className="text-sm text-gray-700 mt-1">{log.subject}</p>}
                        <p className="text-sm text-gray-600 mt-1">{log.body}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(log.created_date).toLocaleString()}</p>
                      </div>
                      <Badge className={getStatusColor(log.status)}>{log.status || 'sent'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sms">
          <div className="space-y-4">
            {logs.filter(l => l.channel === 'sms').length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No SMS communications</p>
                </CardContent>
              </Card>
            ) : (
              logs.filter(l => l.channel === 'sms').map(log => (
                <Card key={log.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{log.to || log.from}</p>
                        <p className="text-sm text-gray-600 mt-1">{log.body}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(log.created_date).toLocaleString()}</p>
                      </div>
                      <Badge className={getStatusColor(log.status)}>{log.status || 'sent'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="phone">
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Phone className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No phone calls logged</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}