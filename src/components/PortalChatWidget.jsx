import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageSquare, Send, X, Paperclip, Smile } from 'lucide-react';

export default function PortalChatWidget({ dealId, borrowerId }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['portalMessages', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.CommunicationsLog.filter({ deal_id: dealId });
    },
    refetchInterval: isOpen ? 5000 : 30000,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      return await base44.integrations.Core.SendEmail({
        to: 'team@loandaddy.ai',
        subject: `New message from borrower - Deal #${dealId}`,
        body: msg,
      });
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['portalMessages'] });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMutation.mutate(messageInput);
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      setUnreadCount(messages.filter(m => !m.is_read).length);
    }
  }, [messages, isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {isOpen ? (
        <Card className="w-96 shadow-lg border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Support Chat</h3>
              <p className="text-xs text-blue-100">We typically respond within 1 hour</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto bg-white p-4 space-y-3 border-b border-gray-100">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender_type === 'borrower' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 ${
                        msg.sender_type === 'borrower'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_type === 'borrower'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.created_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 rounded-b-lg">
            <div className="flex gap-2 text-gray-400">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 h-9"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sendMutation.isPending || !messageInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 h-9 gap-1"
                size="sm"
              >
                <Send className="h-3 w-3" />
                Send
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 rounded-full h-14 w-14 gap-2 shadow-lg relative"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}