import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import CommunicationAI from '@/components/ai/CommunicationAI';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Mail,
  MoreVertical,
  Plus,
  Paperclip,
  Smile,
  Clock,
  CheckCheck,
  Check,
  User,
  Building2,
  Filter,
  Star,
  Archive,
  Trash2,
  Pin,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export default function Conversations() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAI, setShowAI] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communications', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.CommunicationsLog.filter({ org_id: orgId });
    },
    enabled: !!orgId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.Contact.filter({ org_id: orgId });
    },
    enabled: !!orgId,
  });

  // Group communications by contact
  const conversations = React.useMemo(() => {
    const grouped = {};
    
    communications.forEach(comm => {
      const key = comm.to || comm.from || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          contact: key,
          messages: [],
          lastMessage: null,
          unread: 0,
          channel: comm.channel,
        };
      }
      grouped[key].messages.push(comm);
      if (!grouped[key].lastMessage || new Date(comm.created_date) > new Date(grouped[key].lastMessage.created_date)) {
        grouped[key].lastMessage = comm;
      }
      if (comm.direction === 'inbound' && comm.status !== 'read') {
        grouped[key].unread++;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => new Date(b.lastMessage?.created_date || 0) - new Date(a.lastMessage?.created_date || 0))
      .filter(conv => 
        conv.contact.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [communications, searchTerm]);

  const selectedMessages = selectedConversation 
    ? conversations.find(c => c.id === selectedConversation)?.messages || []
    : [];

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      try {
        await base44.functions.invoke('sendCommunication', {
          channel: data.channel,
          to: data.to,
          body: data.body,
        });
      } catch (e) {
        if (data.channel === 'email') {
          await base44.integrations.Core.SendEmail({
            to: data.to,
            subject: 'Message from LoanGenius',
            body: data.body
          });
        }
        await base44.entities.CommunicationsLog.create({
          org_id: orgId,
          channel: data.channel || 'email',
          to: data.to,
          body: data.body,
          status: 'sent',
          direction: 'outbound'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setNewMessage('');
      toast.success('Message sent!');
    },
    onError: (error) => {
      toast.error('Failed to send: ' + error.message);
    }
  });

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const conv = conversations.find(c => c.id === selectedConversation);
    sendMutation.mutate({
      channel: conv?.channel || 'email',
      to: selectedConversation,
      body: newMessage,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessages]);

  const formatMessageTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const getContactInfo = (contactId) => {
    const contact = contacts.find(c => c.email === contactId || c.phone === contactId);
    return contact || { name: contactId, email: contactId };
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'sms': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white">
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col bg-gray-50 flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 h-8 w-8 p-0" data-testid="cta:Conversations:NewMessage">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-100 border-0 focus:bg-white focus:ring-1"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-2 border-b bg-white">
          {['all', 'unread', 'email', 'sms'].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'ghost'}
              className={`text-xs h-7 ${filter === f ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">Start a conversation with a borrower</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(conv => {
                const contactInfo = getContactInfo(conv.contact);
                const isSelected = selectedConversation === conv.id;
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={`text-sm font-medium ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {getInitials(contactInfo.name || contactInfo.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-medium text-sm truncate ${
                            conv.unread > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {contactInfo.name || conv.contact}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatMessageTime(conv.lastMessage?.created_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">
                            {getChannelIcon(conv.channel)}
                          </span>
                          <p className={`text-xs truncate flex-1 ${
                            conv.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {conv.lastMessage?.body || 'No messages'}
                          </p>
                          {conv.unread > 0 && (
                            <Badge className="bg-blue-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Thread */}
      {selectedConversation && !showAI ? (
        <div className="flex-1 flex flex-col">
          {/* Thread Header */}
          <div className="h-16 border-b flex items-center justify-between px-4 bg-white">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                  {getInitials(getContactInfo(selectedConversation).name || selectedConversation)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {getContactInfo(selectedConversation).name || selectedConversation}
                </h2>
                <p className="text-xs text-gray-500">{selectedConversation}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant={showAI ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className={showAI ? "bg-purple-600 hover:bg-purple-700 text-white gap-2" : "gap-2"}
              >
                <Sparkles className="h-4 w-4" />
                AI Assist
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-700">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-700">
                <Mail className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-700">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <Star className="h-4 w-4" /> Star conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Pin className="h-4 w-4" /> Pin to top
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Archive className="h-4 w-4" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-gray-50">
            <div className="space-y-4 max-w-3xl mx-auto">
              {selectedMessages
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .map((msg, idx) => {
                  const isOutbound = msg.direction === 'outbound';
                  const showDate = idx === 0 || 
                    format(new Date(msg.created_date), 'yyyy-MM-dd') !== 
                    format(new Date(selectedMessages[idx - 1]?.created_date), 'yyyy-MM-dd');

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center py-2">
                          <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                            {isToday(new Date(msg.created_date)) 
                              ? 'Today' 
                              : isYesterday(new Date(msg.created_date))
                              ? 'Yesterday'
                              : format(new Date(msg.created_date), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isOutbound ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isOutbound
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 shadow-sm border rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOutbound ? 'justify-end' : ''}`}>
                            <span className="text-xs text-gray-400">
                              {format(new Date(msg.created_date), 'h:mm a')}
                            </span>
                            {isOutbound && (
                              <span className="text-gray-400">
                                {msg.status === 'delivered' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                ) : msg.status === 'sent' ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500 hover:text-gray-700 flex-shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="min-h-[44px] max-h-32 resize-none pr-10 rounded-2xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  rows={1}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 bottom-1 h-8 w-8 text-gray-400 hover:text-gray-600"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className="h-10 w-10 p-0 rounded-full bg-blue-600 hover:bg-blue-500 flex-shrink-0"
                data-testid="cta:Conversations:Send"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : showAI ? (
        /* AI Panel */
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <CommunicationAI 
              contact={getContactInfo(selectedConversation)}
              conversationHistory={selectedMessages}
            />
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Choose a conversation from the list to view messages and continue the discussion.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}