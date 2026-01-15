import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('deal_id');

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your LoanGenius AI Assistant. I can help you with loan origination questions, document requirements, DSCR calculations, compliance, and more. What can I help you with?'
    }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const { data: aiStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => base44.functions.invoke('aiStatus', {}),
    retry: 1,
    staleTime: 30000
  });

  const chatMutation = useMutation({
    mutationFn: (message) =>
      base44.functions.invoke('aiAssistantChat', {
        message,
        deal_id: dealId,
        conversation_context: messages
      }),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data.response
      }]);
      setInput('');
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || aiStatus?.data?.status === 'degraded') return;

    setMessages(prev => [...prev, {
      role: 'user',
      content: input
    }]);

    chatMutation.mutate(input);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold">LoanGenius AI Assistant</h1>
          </div>
          <p className="text-gray-600 mt-1">Get instant answers about loan origination, documents, and compliance</p>
          {dealId && <Badge className="mt-3">Deal: {dealId}</Badge>}
        </div>

        {/* AI Status Alert */}
        {!statusLoading && aiStatus?.data?.status === 'degraded' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-800 font-medium">AI Service Unavailable</p>
              <p className="text-yellow-700 text-sm mt-1">{aiStatus.data.message}</p>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </CardContent>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={chatMutation.isPending || !input.trim() || aiStatus?.data?.status === 'degraded'}
                className="gap-2"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Sample Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'What documents are required for a DSCR loan?',
                'How do I calculate DSCR?',
                'What is the typical timeline for loan approval?',
                'What are the compliance requirements?'
              ].map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="justify-start h-auto py-2 px-3 text-left text-sm"
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => handleSend(), 0);
                  }}
                  disabled={chatMutation.isPending || aiStatus?.data?.status === 'degraded'}
                >
                  {q}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}