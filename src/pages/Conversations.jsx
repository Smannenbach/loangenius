import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Send,
  Phone,
  Star,
  Trash2,
  FileText,
  Paperclip,
  Smile,
  Volume2,
  MessageSquare,
  Mail,
  MessageCircle,
} from 'lucide-react';
import ConversationList from '@/components/conversations/ConversationList';
import ConversationThread from '@/components/conversations/ConversationThread';
import ContactDetailsPanel from '@/components/conversations/ContactDetailsPanel';

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
      to: selectedConversation.to || selectedConversation.from,
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
      {/* Header Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <Tabs defaultValue="conversations" className="w-full">
            <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none">
              <TabsTrigger value="conversations" className="rounded-none border-b-2 border-blue-500 text-blue-600">
                Conversations
              </TabsTrigger>
              <TabsTrigger value="manual" className="rounded-none text-gray-600">
                Manual Actions
              </TabsTrigger>
              <TabsTrigger value="snippets" className="rounded-none text-gray-600">
                Snippets
              </TabsTrigger>
              <TabsTrigger value="triggers" className="rounded-none text-gray-600">
                Trigger Links
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none text-gray-600">
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content - 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Conversation List */}
        <ConversationList
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Center - Conversation Thread */}
        {selectedConversation ? (
          <ConversationThread
            conversation={selectedConversation}
            messageInput={messageInput}
            onMessageChange={setMessageInput}
            onSendMessage={handleSendMessage}
            isSending={sendMutation.isPending}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start</p>
            </div>
          </div>
        )}

        {/* Right Sidebar - Contact Details */}
        {selectedConversation && (
          <ContactDetailsPanel contact={selectedConversation.contact} />
        )}
      </div>
    </div>
  );
}