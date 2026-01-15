import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare, Lock } from 'lucide-react';

export default function PortalSecureMessaging({ sessionId }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch messages with real-time refresh
  const { data: messagesData = {}, isLoading } = useQuery({
    queryKey: ['portalSecureMessages', sessionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('portalMessages', {
        sessionId,
        action: 'getMessages',
      });
      return response.data || {};
    },
    enabled: !!sessionId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  const sendMutation = useMutation({
    mutationFn: async (messageText) => {
      const response = await base44.functions.invoke('portalMessages', {
        sessionId,
        action: 'sendMessage',
        body: messageText,
      });
      return response.data;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['portalSecureMessages', sessionId] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData.messages]);

  const messages = messagesData.messages || [];
  const borrowerName = messagesData.borrowerName || 'You';
  const loanOfficerName = messagesData.loanOfficerName || 'Loan Officer';

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Security Badge */}
      <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <CardContent className="p-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Secure Messaging</p>
            <p className="text-xs text-blue-700">All messages are encrypted and secured</p>
          </div>
        </CardContent>
      </Card>

      {/* Messages Container */}
      <Card className="border-gray-200 flex flex-col" style={{ height: '400px' }}>
        <CardHeader className="border-b border-gray-200 pb-3">
          <CardTitle className="text-lg">Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-gray-500">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a conversation with your loan officer</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'borrower' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-lg p-3 ${
                  msg.sender === 'borrower'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {msg.sender === 'borrower' ? borrowerName : loanOfficerName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`text-xs mt-2 ${
                    msg.sender === 'borrower' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card className="border-gray-200">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Type your message here... (Shift+Enter for new line)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMutation.isPending}
            className="resize-none"
            rows={3}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 gap-2"
          >
            {sendMutation.isPending ? (
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
        <CardContent className="p-4">
          <p className="text-sm font-medium text-green-900 mb-1">💬 Need Immediate Help?</p>
          <p className="text-xs text-green-800">
            For urgent matters, contact your loan officer by phone. Response times are typically within 24 hours during business hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}