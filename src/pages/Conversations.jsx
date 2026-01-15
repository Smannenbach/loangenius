import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Paperclip,
  Smile,
  Clock,
  AlertCircle,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Archive,
  Bell,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.integrations.Core.SendEmail({
        to: data.recipient,
        subject: data.subject || 'Message from Loan Daddy',
        body: data.body,
      });
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });

  // Group by contact
  const grouped = communications.reduce((acc, msg) => {
    const contact = msg.to || msg.from || 'Unknown';
    if (!acc[contact]) {
      acc[contact] = {
        contact,
        messages: [],
        unread: 0,
        lastMessage: null,
      };
    }
    acc[contact].messages.push(msg);
    if (!msg.is_read) acc[contact].unread++;
    if (!acc[contact].lastMessage || new Date(msg.created_date) > new Date(acc[contact].lastMessage.created_date)) {
      acc[contact].lastMessage = msg;
    }
    return acc;
  }, {});

  const conversations = Object.values(grouped).sort((a, b) => 
    new Date(b.lastMessage?.created_date || 0) - new Date(a.lastMessage?.created_date || 0)
  );

  const filtered = conversations.filter(c => 
    c.contact.toLowerCase().includes(conversationSearch.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMutation.mutate({
      recipient: selectedConversation.contact,
      body: messageInput,
    });
  };

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages, autoScroll]);

  const getInitials = (contact) => {
    const parts = contact.split('@')[0].split('.');
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const formatTime = (date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return msgDate.toLocaleDateString('en-US', { weekday: 'short' });
    return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Conversations
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} active</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400 mt-12">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((conv) => (
                  <button
                    key={conv.contact}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 hover:bg-blue-50 transition-colors text-left border-l-4 ${
                      selectedConversation?.contact === conv.contact
                        ? 'bg-blue-50 border-l-blue-600'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitials(conv.contact)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{conv.contact}</p>
                          {conv.unread > 0 && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex-shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-0.5">{conv.lastMessage?.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(conv.lastMessage?.created_date)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-semibold">
                  {getInitials(selectedConversation.contact)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.contact}</h2>
                  <p className="text-xs text-gray-500">{selectedConversation.messages.length} messages</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                  {selectedConversation.contact.includes('@') ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Bell className="h-4 w-4 mr-2" />Mute</DropdownMenuItem>
                    <DropdownMenuItem><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50"
              onScroll={(e) => {
                const element = e.currentTarget;
                const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
                setAutoScroll(isNearBottom);
              }}
            >
              {selectedConversation.messages.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <>
                  {selectedConversation.messages.map((msg, idx) => {
                    const isOwn = msg.sender_type === 'lo' || msg.sender_type === 'system';
                    return (
                      <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-3 ${
                          isOwn
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-900 shadow-sm'
                        }`}>
                          <p className="text-sm break-words leading-relaxed">{msg.body}</p>
                          <div className={`text-xs mt-2 flex items-center gap-1 justify-end ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(msg.created_date)}
                            {isOwn && msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                            {isOwn && msg.status === 'sent' && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex gap-3 mb-3">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMutation.isPending || !messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Shift + Enter for new line</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 font-medium">Select a conversation to start</p>
              <p className="text-sm text-gray-400 mt-1">or create a new one with the button above</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}