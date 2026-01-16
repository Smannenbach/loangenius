import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, Paperclip, User, Building2, Loader2, 
  CheckCircle2, Clock, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortalSecureMessaging({ dealId, borrowerEmail }) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['portalMessages', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.CommunicationsLog.filter({ 
          deal_id: dealId 
        }, '-created_date', 50);
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const sendMutation = useMutation({
    mutationFn: async ({ message, file_url }) => {
      return await base44.entities.CommunicationsLog.create({
        org_id: 'default',
        deal_id: dealId,
        channel: 'portal_message',
        direction: 'inbound',
        from: borrowerEmail,
        subject: 'Portal Message',
        body: message,
        attachment_url: file_url,
        status: 'sent',
        read_by_recipient: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalMessages'] });
      setNewMessage('');
      setAttachmentFile(null);
      toast.success('Message sent!');
      scrollToBottom();
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const handleSend = async () => {
    if (!newMessage.trim() && !attachmentFile) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    let fileUrl = null;
    if (attachmentFile) {
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ 
          file: attachmentFile 
        });
        fileUrl = uploadResult.file_url;
      } catch (e) {
        toast.error('Failed to upload attachment');
        return;
      }
    }

    sendMutation.mutate({ 
      message: newMessage.trim(), 
      file_url: fileUrl 
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Secure Messages
        </CardTitle>
        <p className="text-xs text-gray-500">Direct communication with your loan team</p>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="font-semibold text-gray-900 mb-1">No messages yet</h3>
            <p className="text-sm text-gray-500">Send a message to start the conversation</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="text-center mb-4">
                <Badge variant="outline" className="bg-white">{date}</Badge>
              </div>
              <div className="space-y-3">
                {msgs.map((msg) => {
                  const isFromBorrower = msg.direction === 'inbound' || msg.from === borrowerEmail;
                  
                  return (
                    <div key={msg.id} className={`flex ${isFromBorrower ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isFromBorrower ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          isFromBorrower 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {!isFromBorrower && (
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-3 w-3" />
                              <span className="text-xs font-medium">Loan Team</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          {msg.attachment_url && (
                            <a 
                              href={msg.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`text-xs mt-2 inline-flex items-center gap-1 ${
                                isFromBorrower ? 'text-blue-100' : 'text-blue-600'
                              }`}
                            >
                              <Paperclip className="h-3 w-3" />
                              Attachment
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-2">
                          {new Date(msg.created_date).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                          {msg.read_by_recipient && isFromBorrower && (
                            <CheckCircle2 className="h-3 w-3 inline ml-1 text-blue-600" />
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="border-t p-4">
        {attachmentFile && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4 text-blue-600" />
              <span className="text-gray-700">{attachmentFile.name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setAttachmentFile(null)}
              className="h-6 text-gray-500"
            >
              ✕
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            id="message-attachment"
            onChange={(e) => setAttachmentFile(e.target.files[0])}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('message-attachment').click()}
            disabled={sendMutation.isPending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sendMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || (!newMessage.trim() && !attachmentFile)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Response time: Typically within 24 hours on business days
        </p>
      </div>
    </Card>
  );
}