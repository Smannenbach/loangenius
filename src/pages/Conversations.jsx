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
  Facebook,
  MessageCircle,
  Contact,
  BookOpen,
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
  const [contactMethod, setContactMethod] = useState('email'); // email, sms, facebook
  const [showContactMethodModal, setShowContactMethodModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
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

  const getContactInfo = (contact) => {
    // Parse contact name and type
    const [name, domain] = contact.split('@');
    return {
      name: name.replace(/[._]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      email: contact,
      domain: domain || 'unknown'
    };
  };

  const startConversationWithMethod = (contact, method) => {
    setSelectedContact(contact);
    setContactMethod(method);
    setShowContactMethodModal(false);
    setSelectedConversation({
      contact,
      messages: [],
      unread: 0,
      method,
    });
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
          <Dialog open={showContactMethodModal} onOpenChange={setShowContactMethodModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg">
                <Plus className="h-4 w-4" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Start New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Select Contact or Lead</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Choose Contact Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        if (newContactEmail.trim()) {
                          startConversationWithMethod(newContactEmail, 'email');
                          setNewContactEmail('');
                        }
                      }}
                      className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                    >
                      <Mail className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-slate-700">Email</span>
                    </button>
                    <button
                      onClick={() => {
                        if (newContactEmail.trim()) {
                          startConversationWithMethod(newContactEmail, 'sms');
                          setNewContactEmail('');
                        }
                      }}
                      className="p-4 rounded-lg border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center gap-2 group"
                    >
                      <Phone className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-slate-700">SMS</span>
                    </button>
                    <button
                      onClick={() => {
                        if (newContactEmail.trim()) {
                          startConversationWithMethod(newContactEmail, 'facebook');
                          setNewContactEmail('');
                        }
                      }}
                      className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2 group"
                    >
                      <Facebook className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-slate-700">Messenger</span>
                    </button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Sidebar - Conversations List (GoHighLevel style) */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search conversations..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="pl-10 h-10 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations - GoHighLevel Dark Theme */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500 mt-20">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No conversations</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filtered.map((conv) => {
                  const info = getContactInfo(conv.contact);
                  const isSelected = selectedConversation?.contact === conv.contact;
                  return (
                  <button
                    key={conv.contact}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full px-4 py-3.5 hover:bg-slate-800 transition-all text-left ${
                      isSelected ? 'bg-blue-600 border-l-4 border-l-blue-400' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isSelected
                          ? 'bg-white text-blue-600'
                          : 'bg-slate-700 text-white'
                      }`}>
                        {getInitials(conv.contact)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {info.name}
                          </p>
                          {conv.unread > 0 && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex-shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-1 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {conv.lastMessage?.body || 'No messages'}
                        </p>
                        <p className={`text-xs mt-1.5 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                          {formatTime(conv.lastMessage?.created_date)}
                        </p>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header - GoHighLevel style */}
            <div className="border-b border-slate-200 px-8 py-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                  {getInitials(selectedConversation.contact)}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">{getContactInfo(selectedConversation.contact).name}</h2>
                  <p className="text-sm text-slate-500">{selectedConversation.contact}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Contact Method Badge */}
                <Badge className={`gap-1.5 ${
                  contactMethod === 'email' ? 'bg-blue-100 text-blue-700' :
                  contactMethod === 'sms' ? 'bg-green-100 text-green-700' :
                  'bg-blue-500 text-white'
                }`}>
                  {contactMethod === 'email' && <Mail className="h-3 w-3" />}
                  {contactMethod === 'sms' && <Phone className="h-3 w-3" />}
                  {contactMethod === 'facebook' && <Facebook className="h-3 w-3" />}
                  <span className="text-xs font-semibold capitalize">{contactMethod}</span>
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100 h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="p-2 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Switch Contact Method</p>
                      <div className="space-y-1">
                        <button
                          onClick={() => setContactMethod('email')}
                          className={`w-full px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                            contactMethod === 'email' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </button>
                        <button
                          onClick={() => setContactMethod('sms')}
                          className={`w-full px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                            contactMethod === 'sms' ? 'bg-green-100 text-green-700' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Phone className="h-4 w-4" />
                          SMS
                        </button>
                        <button
                          onClick={() => setContactMethod('facebook')}
                          className={`w-full px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                            contactMethod === 'facebook' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Facebook className="h-4 w-4" />
                          Messenger
                        </button>
                      </div>
                    </div>
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