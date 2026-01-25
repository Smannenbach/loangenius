import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, MessageSquare, Mail, Phone, Copy, 
  TrendingUp, Clock, CheckCircle2, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export default function CommunicationAI({ contact, conversationHistory = [] }) {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  // Analyze conversation history
  const analyzeHistory = () => {
    const totalMessages = conversationHistory.length;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const responseTime = lastMessage 
      ? Math.floor((new Date() - new Date(lastMessage.created_date)) / (1000 * 60 * 60))
      : 0;

    const channelCounts = conversationHistory.reduce((acc, msg) => {
      acc[msg.channel] = (acc[msg.channel] || 0) + 1;
      return acc;
    }, {});

    const preferredChannel = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'email';

    return {
      totalMessages,
      lastMessage,
      responseTime,
      preferredChannel,
      channelCounts
    };
  };

  const history = analyzeHistory();

  // Generate AI message
  const generateMutation = useMutation({
    mutationFn: async (intent) => {
      setGenerating(true);
      
      const intentPrompts = {
        followup: 'Write a follow-up message checking in on the loan application status',
        document_request: 'Write a message requesting required loan documents (bank statements, pay stubs, property insurance)',
        status_update: 'Write a status update that the loan has progressed to underwriting',
        rate_quote: `Write a rate quote message with loan amount $${contact?.loan_amount?.toLocaleString() || '500,000'}`
      };

      const prompt = `You are a professional loan officer. ${intentPrompts[intent] || 'Write a follow-up message'}.

Context:
- Borrower: ${contact?.name || 'Client'}
- Loan Amount: $${contact?.loan_amount?.toLocaleString() || 'Not specified'}
- Property: ${contact?.property_city || 'Not specified'}
- Recent messages: ${conversationHistory.length} total
- Last contact: ${history.responseTime} hours ago

Write a professional, friendly message. Keep it under 150 words. Sign off warmly.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      return response;
    },
    onSuccess: (message) => {
      setGeneratedMessage(message);
      setGenerating(false);
      toast.success('Message generated!');
    },
    onError: () => {
      setGenerating(false);
      toast.error('Failed to generate message');
    }
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success('Message copied to clipboard!');
  };

  const getChannelRecommendation = () => {
    const { preferredChannel, responseTime } = history;
    
    if (responseTime > 48) {
      return {
        channel: 'phone',
        reason: 'No response for 2+ days - phone call recommended',
        icon: Phone,
        color: 'text-orange-600 bg-orange-50'
      };
    }
    
    if (preferredChannel === 'email') {
      return {
        channel: 'email',
        reason: 'Contact prefers email communication',
        icon: Mail,
        color: 'text-blue-600 bg-blue-50'
      };
    }
    
    return {
      channel: 'sms',
      reason: 'Quick response needed - SMS recommended',
      icon: MessageSquare,
      color: 'text-green-600 bg-green-50'
    };
  };

  const recommendation = getChannelRecommendation();
  const ChannelIcon = recommendation.icon;

  return (
    <div className="space-y-4">
      {/* Conversation Summary */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Conversation Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <p className="text-xs text-purple-600 font-medium mb-1">Total Messages</p>
              <p className="text-2xl font-bold">{history.totalMessages}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <p className="text-xs text-purple-600 font-medium mb-1">Response Time</p>
              <p className="text-2xl font-bold">{history.responseTime}h</p>
            </div>
          </div>
          
          {/* Channel Recommendation */}
          <div className={`p-3 rounded-lg ${recommendation.color}`}>
            <div className="flex items-start gap-2">
              <ChannelIcon className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Recommended Channel: {recommendation.channel.toUpperCase()}</p>
                <p className="text-xs opacity-80 mt-1">{recommendation.reason}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Message Generator */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Message Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'followup', label: 'Follow-up', icon: Clock },
              { key: 'document_request', label: 'Doc Request', icon: Mail },
              { key: 'status_update', label: 'Status Update', icon: CheckCircle2 },
              { key: 'rate_quote', label: 'Rate Quote', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate(key)}
                disabled={generating}
                className="justify-start gap-2"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>

          {generating && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Generating message...</span>
            </div>
          )}

          {generatedMessage && !generating && (
            <div className="space-y-3">
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Generated message will appear here..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    // TODO: Integrate with send message functionality
                    toast.success('Message ready to send!');
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Use Message
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History Summary */}
      {conversationHistory.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversationHistory.slice(-3).reverse().map((msg, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {msg.channel}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(msg.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 truncate">{msg.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}