import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Mail, MessageSquare, Send, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunicationCenter({ leadEmail, leadPhone }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState('email');
  const [message, setMessage] = useState({
    subject: '',
    body: '',
    recipient: '',
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('sendCommunication', {
        channel: data.channel,
        to: data.recipient,
        subject: data.subject,
        body: data.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setMessage({ subject: '', body: '', recipient: '' });
      setIsOpen(false);
    },
  });

  const handleSend = () => {
    if (!message.recipient || !message.body) {
      toast.error('Please fill in all required fields');
      return;
    }
    sendMutation.mutate({
      channel,
      recipient: message.recipient,
      subject: message.subject,
      body: message.body,
    });
  };

  const recentMessages = logs.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              <Send className="h-4 w-4" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Communication</DialogTitle>
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
                <Label>Recipient</Label>
                <Select value={message.recipient} onValueChange={(v) => setMessage({...message, recipient: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadEmail && <SelectItem value={leadEmail}>{leadEmail}</SelectItem>}
                    {leadPhone && <SelectItem value={leadPhone}>{leadPhone}</SelectItem>}
                  </SelectContent>
                </Select>
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

        {recentMessages.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Recent Messages</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentMessages.map((log) => (
                <div key={log.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    {log.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    <span className="font-medium">{log.to || log.from}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-1">{log.subject || log.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}