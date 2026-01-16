import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalMessageCenter({ dealId, borrowerEmail }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['portalMessages', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const comms = await base44.entities.CommunicationsLog.filter({ deal_id: dealId });
        return comms.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      return await base44.entities.CommunicationsLog.create({
        org_id: 'default',
        deal_id: dealId,
        from: borrowerEmail,
        to: 'loangenius@support.com',
        subject: 'Portal Message',
        body: msg,
        channel: 'portal',
        direction: 'outbound',
        status: 'sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalMessages'] });
      setMessage('');
      toast.success('Message sent!');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  return (
    <Card className="flex flex-col" style={{ height: '600px' }}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Start a conversation with your loan officer</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isFromBorrower = msg.from === borrowerEmail;
            return (
              <div key={idx} className={`flex ${isFromBorrower ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-md rounded-lg px-4 py-2 ${
                    isFromBorrower
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.body}</p>
                  <p className={`text-xs mt-1 ${isFromBorrower ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(msg.created_date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={sendMutation.isPending || !dealId}
          />
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !message.trim() || !dealId}
            className="gap-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}