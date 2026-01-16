import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Paperclip, User, Bot, Clock, CheckCircle2, 
  Loader2, Image, FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortalMessageCenter({ dealId, borrowerEmail }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['portalMessages', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const logs = await base44.entities.CommunicationsLog.filter({ 
        deal_id: dealId,
        channel: 'portal'
      });
      return logs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!dealId,
    refetchInterval: 10000 // Poll every 10 seconds
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachmentUrls }) => {
      return await base44.entities.CommunicationsLog.create({
        deal_id: dealId,
        channel: 'portal',
        direction: 'inbound',
        sender_email: borrowerEmail,
        message_content: content,
        attachments: attachmentUrls,
        status: 'delivered'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalMessages'] });
      setMessage('');
      setAttachments([]);
      toast.success('Message sent');
    },
    onError: (error) => {
      toast.error('Failed to send: ' + error.message);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    // Upload attachments first
    let attachmentUrls = [];
    for (const file of attachments) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        attachmentUrls.push({ name: file.name, url: file_url });
      } catch (e) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    sendMutation.mutate({ content: message, attachmentUrls });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_date);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
      <CardHeader className="border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Messages
          {messages.length > 0 && (
            <Badge variant="secondary">{messages.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot className="h-12 w-12 mb-4 text-gray-300" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Send a message to your loan team</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500 px-2">{date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {msgs.map((msg) => {
                const isFromBorrower = msg.direction === 'inbound';
                return (
                  <div 
                    key={msg.id}
                    className={`flex ${isFromBorrower ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div className={`max-w-[80%] ${isFromBorrower ? 'order-2' : 'order-1'}`}>
                      {!isFromBorrower && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs text-gray-500">Loan Team</span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2 ${
                        isFromBorrower 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm">{msg.message_content}</p>
                        
                        {/* Attachments */}
                        {msg.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, idx) => (
                              <a 
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs ${
                                  isFromBorrower ? 'text-blue-100' : 'text-blue-600'
                                } hover:underline`}
                              >
                                <FileText className="h-3 w-3" />
                                {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isFromBorrower ? 'justify-end' : ''}`}>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_date)}</span>
                        {isFromBorrower && msg.status === 'delivered' && (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1 rounded border text-sm">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button 
            onClick={handleSend}
            disabled={sendMutation.isPending || (!message.trim() && attachments.length === 0)}
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