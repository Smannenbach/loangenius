import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, AlertCircle, Zap, FileText, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from 'sonner';

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
  const [inputError, setInputError] = useState('');
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
    onMutate: (message) => {
      setMessages(prev => [...prev, { role: 'user', content: message }]);
      setInput('');
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data.response
      }]);
      toast.success('Response received');
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        isError: true
      }]);
      toast.error(error.message || 'Failed to get response');
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    setInputError('');
    
    if (!input.trim()) {
      setInputError('Please enter a message');
      return;
    }
    
    if (aiStatus?.data?.status === 'degraded') {
      setInputError('AI service is currently unavailable');
      return;
    }

    chatMutation.mutate(input);
  };

  return (
     <ErrorBoundary>
       <div className="min-h-screen bg-gray-50 p-4 md:p-6">
         <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-6 w-6 text-blue-600" aria-hidden="true" />
              <h1 className="text-2xl md:text-3xl font-bold">LoanGenius AI Assistant</h1>
            </div>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Get instant answers about loan origination, documents, and compliance</p>
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
         <Card className="flex flex-col" style={{ height: 'min(600px, 60vh)' }}>
           <CardHeader className="border-b">
             <CardTitle>Chat</CardTitle>
           </CardHeader>
           <CardContent className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 md:px-4 ${
                    msg.isError
                      ? 'bg-red-100 text-red-900'
                      : msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
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
          <div className="border-t p-3 md:p-4 bg-white">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setInputError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={chatMutation.isPending || aiStatus?.data?.status === 'degraded'}
                  className="text-sm"
                  aria-label="Message input"
                  aria-invalid={!!inputError}
                  aria-describedby={inputError ? 'input-error' : undefined}
                />
                <Button
                  onClick={handleSend}
                  disabled={chatMutation.isPending || !input.trim() || aiStatus?.data?.status === 'degraded'}
                  size="icon"
                  className="flex-shrink-0"
                  aria-label="Send message"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {inputError && (
                <p id="input-error" className="text-sm text-red-500 px-2">{inputError}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Agent Orchestrator Link */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Agent Orchestrator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-3">Run full end-to-end DSCR workflows with 22 specialized agents</p>
            <Link to={createPageUrl('AgentOrchestrator')}>
              <Button className="w-full">Launch Orchestrator</Button>
            </Link>
          </CardContent>
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
                  className="justify-start h-auto py-2 px-3 text-left text-xs md:text-sm"
                  onClick={() => {
                    setInput(q);
                    setInputError('');
                    setTimeout(() => handleSend(), 0);
                  }}
                  disabled={chatMutation.isPending || aiStatus?.data?.status === 'degraded'}
                  aria-label={`Ask: ${q}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
         </div>
        </div>
        </ErrorBoundary>
        );
}