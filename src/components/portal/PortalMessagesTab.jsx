import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react';

export default function PortalMessagesTab({ loanFileId, sessionId, borrower }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: communications = [] } = useQuery({
    queryKey: ['portalMessages', loanFileId],
    queryFn: () => base44.entities.Communication.filter({ loan_file_id: loanFileId }),
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      await base44.asServiceRole.entities.Communication.create({
        loan_file_id: loanFileId,
        borrower_id: borrower.id,
        channel: 'Portal_Message',
        direction: 'Inbound',
        body: message,
        status: 'Sent',
      });
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = communications.filter(c => ['Email', 'Portal_Message'].includes(c.channel));
  const outgoing = filteredMessages.filter(c => c.direction === 'Outbound');
  const incoming = filteredMessages.filter(c => c.direction === 'Inbound');

  return (
    <div className="space-y-4">
      {/* Messages */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No messages yet</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === 'Inbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${
                  msg.direction === 'Inbound'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {msg.subject && (
                    <p className="font-medium text-sm mb-1">{msg.subject}</p>
                  )}
                  <p className="text-sm">{msg.body}</p>
                  <p className={`text-xs mt-2 ${
                    msg.direction === 'Inbound' ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {new Date(msg.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Send Message */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-none"
            rows={4}
          />
          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 gap-2"
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-green-900">Need immediate help?</p>
          <p className="text-xs text-green-800">
            Contact your loan officer directly for urgent questions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}