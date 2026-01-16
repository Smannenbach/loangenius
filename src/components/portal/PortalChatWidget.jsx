import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, X, Send, Loader2, Bot, User, 
  Sparkles, ChevronDown, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_QUESTIONS = [
  'What documents do I need?',
  'What is the status of my application?',
  'How long does approval take?',
  'How do I upload documents?'
];

export default function PortalChatWidget({ isOpen, onClose, dealId, borrowerEmail }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m your loan assistant. I can help you with questions about your application, documents, and the loan process. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const chatMutation = useMutation({
    mutationFn: async (message) => {
      // Try dedicated chat function first, fallback to InvokeLLM
      try {
        const response = await base44.functions.invoke('aiAssistantChat', {
          message,
          deal_id: dealId,
          conversation_context: messages.slice(-6) // Last 6 messages for context
        });
        return response.data?.response || response.data;
      } catch (e) {
        // Fallback to InvokeLLM
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a helpful loan assistant for a borrower portal. Be friendly, concise, and helpful.
          
The borrower asks: "${message}"

Provide a helpful, clear response about loan applications, documents, timelines, or general mortgage questions. If you don't know specific details about their application, suggest they check their portal or contact their loan officer.`,
          add_context_from_internet: false
        });
        return response;
      }
    },
    onMutate: (message) => {
      setMessages(prev => [...prev, { role: 'user', content: message }]);
      setInput('');
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I\'m having trouble processing your request. Please try again or contact your loan officer directly.',
        isError: true
      }]);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
  };

  const handleQuickQuestion = (question) => {
    if (chatMutation.isPending) return;
    chatMutation.mutate(question);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-50"
        onClick={onClose}
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className={`bg-white rounded-2xl shadow-2xl border overflow-hidden transition-all ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Loan Assistant</p>
                <p className="text-xs text-blue-100">Online • Usually replies instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: '320px' }}>
                {messages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-100'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-2 ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : msg.isError
                            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length <= 2 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickQuestion(q)}
                        disabled={chatMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-3 bg-white">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={chatMutation.isPending}
                    className="flex-1 rounded-full"
                  />
                  <Button 
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || chatMutation.isPending}
                    className="rounded-full"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}