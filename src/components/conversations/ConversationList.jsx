import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Star, MessageSquare } from 'lucide-react';

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchTerm,
  onSearchChange,
}) {
  const getInitials = (email) => {
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (email) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header Actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
            <Upload className="h-3 w-3" />
            Unread
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            All
          </Button>
        </div>
        <Button size="sm" className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-xs h-8">
          <Plus className="h-3 w-3" />
          New Message
        </Button>
      </div>

      {/* Icons Bar */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-200 text-gray-500">
        <button className="p-2 hover:bg-gray-100 rounded text-xs">
          <Upload className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded text-xs">
          <MessageSquare className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded text-xs">
          <Search className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded text-xs">
          <Star className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No conversations
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.contact}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                selectedConversation?.contact === conv.contact ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className={`h-10 w-10 rounded-full ${getAvatarColor(conv.contact)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                  {getInitials(conv.contact)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {conv.contact}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTime(conv.lastMessage?.created_date)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-1">
                    {conv.lastMessage?.body || 'No messages'}
                  </p>
                  {conv.messages.length > 0 && (
                    <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">
                      {conv.messages.length}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}