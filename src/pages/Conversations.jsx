import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Zap,
  User,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newContactEmail, setNewContactEmail] = useState('');

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
    refetchInterval: 5000,
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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Zap className="h-7 w-7 text-blue-600" />
              Conversations Hub
            </h1>
            <p className="text-sm text-slate-500 mt-1">{filtered.length} active • {conversations.reduce((sum, c) => sum + c.unread, 0)} unread</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="h-4 w-4" />
                Start Conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <Input
                    placeholder="Enter email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full bg-blue-600"
                  onClick={() => {
                    if (newContactEmail.trim()) {
                      setSelectedConversation(conversations.find(c => c.contact === newContactEmail) || {
                        contact: newContactEmail,
                        messages: [],
                        unread: 0,
                      });
                      setNewContactEmail('');
                    }
                  }}
                >
                  Start Conversation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Sidebar - Conversations List */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          {/* Search */}
          <div className="p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="pl-10 h-11 text-sm border-slate-300 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 mt-20">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1">Start a new conversation to begin</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((conv) => (
                  <button
                    key={conv.contact}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full px-4 py-3 hover:bg-slate-50 transition-all text-left border-l-4 ${
                      selectedConversation?.contact === conv.contact
                        ? 'bg-blue-50 border-l-blue-600 shadow-sm'
                        : 'border-l-transparent hover:border-l-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        selectedConversation?.contact === conv.contact
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {getInitials(conv.contact)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate ${selectedConversation?.contact === conv.contact ? 'font-bold text-slate-900' : 'font-semibold text-slate-900'}`}>
                            {conv.contact}
                          </p>
                          {conv.unread > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">{conv.unread}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate mt-0.5 line-clamp-1">{conv.lastMessage?.body || 'No messages'}</p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(conv.lastMessage?.created_date)}
                        </p>
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
            <div className="border-b border-slate-200 px-8 py-5 flex items-center justify-between bg-gradient-to-r from-white via-blue-50 to-white shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {getInitials(selectedConversation.contact)}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">{selectedConversation.contact}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 bg-green-500 rounded-full"></span>
                    {selectedConversation.messages.length} messages
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
                  {selectedConversation.contact.includes('@') ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
                  <Bell className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-gradient-to-b from-slate-50 to-white"
              onScroll={(e) => {
                const element = e.currentTarget;
                const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
                setAutoScroll(isNearBottom);
              }}
            >
              {selectedConversation.messages.length === 0 ? (
                <div className="text-center text-slate-400 py-24">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">Start the conversation</p>
                  <p className="text-xs mt-1">Send your first message below</p>
                </div>
              ) : (
                <>
                  {selectedConversation.messages.map((msg, idx) => {
                    const isOwn = msg.sender_type === 'lo' || msg.sender_type === 'system';
                    return (
                      <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`max-w-sm rounded-2xl px-5 py-3 shadow-sm ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-900'
                        }`}>
                          <p className="text-sm break-words leading-relaxed">{msg.body}</p>
                          <div className={`text-xs mt-2 flex items-center justify-end gap-1.5 ${
                            isOwn ? 'text-blue-100' : 'text-slate-600'
                          }`}>
                            <span>{formatTime(msg.created_date)}</span>
                            {isOwn && msg.status === 'delivered' && <CheckCheck className="h-3.5 w-3.5" />}
                            {isOwn && msg.status === 'sent' && <Check className="h-3.5 w-3.5" />}
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
            <div className="border-t border-slate-200 p-6 bg-white">
              <div className="flex gap-3">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  className="flex-1 text-sm border-slate-300 focus:ring-blue-500 h-11"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMutation.isPending || !messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 gap-2 h-11"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center">
              <Zap className="h-20 w-20 text-slate-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-slate-600">No conversation selected</p>
              <p className="text-sm text-slate-500 mt-2">Choose a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}