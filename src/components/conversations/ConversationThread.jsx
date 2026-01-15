import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send,
  Paperclip,
  Smile,
  Phone,
  Plus,
  MoreVertical,
  Volume2,
  CheckCheck,
  Check,
} from 'lucide-react';

export default function ConversationThread({
  conversation,
  messageInput,
  onMessageChange,
  onSendMessage,
  isSending,
}) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group messages by date
  const messagesByDate = conversation.messages.reduce((acc, msg) => {
    const date = new Date(msg.created_date).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">{conversation.contact}</h2>
          <span className="text-xs text-gray-500">
            {conversation.messages.length} messages
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="text-gray-600">
            <Phone className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className="text-gray-600">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messagesByDate).map(([date, messages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {formatDate(date)}
              </span>
            </div>
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-sm p-3 rounded-lg ${
                        isOutbound
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.subject && (
                        <p className={`text-xs font-semibold ${isOutbound ? 'opacity-90' : ''} mb-1`}>
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-sm">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isOutbound ? 'text-blue-100' : 'text-gray-500'}`}>
                        <span>{formatTime(msg.created_date)}</span>
                        {isOutbound && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        {/* Channel Selector */}
        <div className="flex gap-2 mb-3 text-xs text-gray-600">
          <button className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <span>📧</span> Email
          </button>
          <button className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded">
            <span>💬</span> SMS
          </button>
          <button className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded">
            <span>💬</span> WhatsApp
          </button>
          <button className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded">
            <span>💬</span> Messenger
          </button>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={messageInput}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder="Type a message..."
              className="pr-24 h-10"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                <Paperclip className="h-4 w-4" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                <Smile className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 gap-2 h-10"
            size="sm"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}