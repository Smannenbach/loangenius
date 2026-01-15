import React, { useState } from 'react';
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
  ChevronLeft,
  Paperclip,
  Smile,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('sendCommunication', {
        channel: data.channel || 'email',
        to: data.to,
        subject: data.subject,
        body: data.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput('');
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    sendMutation.mutate({
      to: selectedConversation.contact,
      body: messageInput,
      channel: 'email',
    });
  };

  // Group conversations by contact
  const groupedConversations = conversations.reduce((acc, conv) => {
    const key = conv.to || conv.from;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(conv);
    return acc;
  }, {});

  const uniqueConversations = Object.entries(groupedConversations).map(([contact, messages]) => ({
    contact,
    messages: messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    lastMessage: messages[0],
  }));

  const filteredConversations = uniqueConversations.filter(c =>
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Communications
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all conversations with borrowers and team</p>
        </div>
      </div>

      {/* Main Content - 2 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Conversation List */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.contact}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.contact === conv.contact ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-gray-900 truncate">{conv.contact}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.lastMessage.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage.body}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Conversation Thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Conversation Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.contact}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.messages.length} messages
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConversation.contact.includes('@') ? (
                  <Button variant="ghost" size="icon" title="Email">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Call">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation.messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.from === selectedConversation.contact ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                    msg.from === selectedConversation.contact
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <p className="text-sm break-words">{msg.body}</p>
                    <p className={`text-xs mt-1 ${
                      msg.from === selectedConversation.contact
                        ? 'text-gray-500'
                        : 'text-blue-100'
                    }`}>
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 space-y-3">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
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
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}