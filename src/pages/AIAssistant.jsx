import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, FileText, Calculator, TrendingUp, MessageSquare } from 'lucide-react';

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hello! I'm your AI lending assistant. I can help you with loan calculations, document analysis, underwriting questions, and more. What can I help you with today?"
    }
  ]);

  const quickActions = [
    { icon: Calculator, label: 'Calculate DSCR', action: 'Calculate DSCR for a property with $3,500 monthly rent' },
    { icon: FileText, label: 'Analyze Documents', action: 'Help me understand what documents I need for a DSCR loan' },
    { icon: TrendingUp, label: 'Rate Analysis', action: 'What are typical rates for DSCR loans right now?' },
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm processing your request. This AI assistant feature is being enhanced with full capabilities. For now, you can use the dedicated Calculator and Quote Generator tools in the sidebar for accurate calculations."
      }]);
    }, 1000);
    
    setMessage('');
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Bot className="h-7 w-7 text-purple-600" />
          AI Assistant
        </h1>
        <p className="text-gray-500 mt-1">Your intelligent lending companion</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {quickActions.map((action, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300"
            onClick={() => setMessage(action.action)}
          >
            <action.icon className="h-6 w-6 text-purple-500" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Chat Area */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about lending..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-500">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              AI responses are for informational purposes only. Always verify calculations independently.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}