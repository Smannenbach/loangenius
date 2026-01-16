import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Search,
  Plus,
  User,
  Clock,
  Mail,
  Phone,
  Send,
  Paperclip,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  CheckCheck,
  Filter,
  RefreshCw,
  ChevronDown,
  Calendar,
  FileText,
  Building2,
  ArrowLeft,
  X,
  Inbox,
  SendHorizontal,
  MessageCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Conversations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composeChannel, setComposeChannel] = useState('email');
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
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

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: communications = [], isLoading, refetch } = useQuery({
    queryKey: ['communications', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.CommunicationsLog.list('-created_date', 200);
      } catch {
        return [];
      }
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => base44.entities.Borrower.list(),
  });

  // Group communications by contact
  const conversations = communications.reduce((acc, comm) => {
    const key = comm.to || comm.from || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        id: key,
        contact: key,
        deal_id: comm.deal_id,
        messages: [],
        lastMessage: null,
        unread: 0,
        starred: false,
        channel: comm.channel || 'email',
      };
    }
    acc[key].messages.push(comm);
    if (!acc[key].lastMessage || new Date(comm.created_date) > new Date(acc[key].lastMessage.created_date)) {
      acc[key].lastMessage = comm;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations)
    .sort((a, b) => new Date(b.lastMessage?.created_date || 0) - new Date(a.lastMessage?.created_date || 0));

  const filteredConversations = conversationList.filter(conv => {
    if (searchTerm && !conv.contact?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (activeTab === 'email') return conv.channel === 'email';
    if (activeTab === 'sms') return conv.channel === 'sms';
    if (activeTab === 'starred') return conv.starred;
    return true;
  });

  // Find contact/borrower info for selected conversation
  const selectedContactInfo = selectedConversation ? 
    contacts.find(c => c.email === selectedConversation.contact) ||
    borrowers.find(b => b.email === selectedConversation.contact) : null;

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      try {
        await base44.functions.invoke('sendCommunication', data);
      } catch {
        if (data.channel === 'email') {
          await base44.integrations.Core.SendEmail({
            to: data.to,
            subject: data.subject || 'Message from LoanGenius',
            body: data.body
          });
        }
      }
      await base44.entities.CommunicationsLog.create({
        channel: data.channel,
        to: data.to,
        subject: data.subject,
        body: data.body,
        status: 'sent',
        direction: 'outbound',
        org_id: orgId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setMessageInput('');
      setShowComposeDialog(false);
      setComposeData({ to: '', subject: '', body: '' });
      toast.success('Message sent!');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMutation.mutate({
      channel: selectedConversation.channel,
      to: selectedConversation.contact,
      subject: '',
      body: messageInput,
    });
  };

  const handleCompose = () => {
    if (!composeData.to || !composeData.body) {
      toast.error('Please fill recipient and message');
      return;
    }
    sendMutation.mutate({
      channel: composeChannel,
      to: composeData.to,
      subject: composeData.subject,
      body: composeData.body,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.split('@')[0].split(/[\s._-]/);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  };

  const getAvatarColor = (str) => {
    if (!str) return 'bg-gray-400';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'];
    return colors[str.charCodeAt(0) % colors.length];
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getChannelIcon = (channel) => {
    if (channel === 'sms') return <MessageCircle className="h-3 w-3" />;
    if (channel === 'phone') return <Phone className="h-3 w-3" />;
    return <Mail className="h-3 w-3" />;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-100">
      {/* Left Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                className="h-8 gap-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowComposeDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Compose
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 py-2 border-b border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
              <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
              <TabsTrigger value="starred" className="text-xs">Starred</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <Button 
                variant="link" 
                className="text-blue-600 mt-2"
                onClick={() => setShowComposeDialog(true)}
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`h-10 w-10 rounded-full ${getAvatarColor(conv.contact)} flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                      {getInitials(conv.contact)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {conv.contact}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(conv.lastMessage?.created_date)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {conv.lastMessage?.subject || conv.lastMessage?.body || 'No messages'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="h-5 text-xs gap-1 px-1.5">
                          {getChannelIcon(conv.channel)}
                          {conv.channel}
                        </Badge>
                        <span className="text-xs text-gray-400">{conv.messages.length} msgs</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Center - Message Thread */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-8 w-8"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className={`h-10 w-10 rounded-full ${getAvatarColor(selectedConversation.contact)} flex items-center justify-center text-white font-medium`}>
                  {getInitials(selectedConversation.contact)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.contact}</h2>
                  <p className="text-xs text-gray-500">{selectedConversation.messages.length} messages via {selectedConversation.channel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <User className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Contact
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {selectedConversation.messages
                  .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                  .map((msg, idx) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOutbound ? 'order-2' : 'order-1'}`}>
                          {!isOutbound && (
                            <div className={`h-8 w-8 rounded-full ${getAvatarColor(selectedConversation.contact)} flex items-center justify-center text-white text-xs font-medium mb-1`}>
                              {getInitials(selectedConversation.contact)}
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-2xl ${
                              isOutbound
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}
                          >
                            {msg.subject && (
                              <p className={`text-xs font-semibold mb-1 ${isOutbound ? 'text-blue-100' : 'text-gray-600'}`}>
                                {msg.subject}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isOutbound ? 'justify-end text-gray-500' : 'text-gray-400'}`}>
                            <span>{new Date(msg.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            {isOutbound && <CheckCheck className="h-3 w-3 text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Send ${selectedConversation.channel} message...`}
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 mb-4">Choose from your existing conversations<br />or start a new one</p>
              <Button 
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowComposeDialog(true)}
              >
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Details */}
      {selectedConversation && showDetails && (
        <div className="w-72 bg-white border-l border-gray-200 hidden xl:flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Details</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDetails(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Contact Avatar & Name */}
              <div className="text-center pb-4 border-b border-gray-200">
                <div className={`h-16 w-16 rounded-full ${getAvatarColor(selectedConversation.contact)} flex items-center justify-center text-white font-bold text-xl mx-auto mb-3`}>
                  {getInitials(selectedConversation.contact)}
                </div>
                <p className="font-semibold text-gray-900">{selectedConversation.contact}</p>
                <Badge variant="outline" className="mt-2">
                  {selectedConversation.channel}
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="py-4 border-b border-gray-200 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Actions</h4>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Meeting
                </Button>
              </div>

              {/* Contact Info */}
              {selectedContactInfo && (
                <div className="py-4 border-b border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Contact Info</h4>
                  <div className="space-y-2 text-sm">
                    {selectedContactInfo.first_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name</span>
                        <span className="text-gray-900">{selectedContactInfo.first_name} {selectedContactInfo.last_name}</span>
                      </div>
                    )}
                    {selectedContactInfo.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="text-gray-900">{selectedContactInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conversation Stats */}
              <div className="py-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Messages</span>
                    <span className="text-gray-900 font-medium">{selectedConversation.messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">First Contact</span>
                    <span className="text-gray-900">
                      {new Date(selectedConversation.messages[0]?.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Activity</span>
                    <span className="text-gray-900">
                      {formatTime(selectedConversation.lastMessage?.created_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Channel</label>
                <Select value={composeChannel} onValueChange={setComposeChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> SMS</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {composeChannel === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <Input
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder={composeChannel === 'email' ? 'recipient@email.com' : '+1 (555) 000-0000'}
                />
              </div>
            </div>
            
            {composeChannel === 'email' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                <Input
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Message subject"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
              <Textarea
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                placeholder="Type your message..."
                rows={5}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleCompose}
                disabled={sendMutation.isPending || !composeData.to || !composeData.body}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}