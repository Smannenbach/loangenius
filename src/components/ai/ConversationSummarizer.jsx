import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, TrendingUp, AlertCircle, Loader2, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ConversationSummarizer({ messages = [], contact }) {
  const [summary, setSummary] = useState(null);

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const conversationText = messages.map(m => 
        `[${m.direction === 'inbound' ? contact?.name || 'Borrower' : 'Loan Officer'}]: ${m.body}`
      ).join('\n');

      const prompt = `Summarize this loan application conversation. Extract key insights, decisions, and next steps:

${conversationText}

Provide:
{
  "summary": "2-3 sentence overview",
  "keyPoints": ["point1", "point2"],
  "decisions": ["decision1", "decision2"],
  "nextSteps": ["step1", "step2"],
  "sentiment": "Positive|Neutral|Negative|Frustrated",
  "urgency": "High|Medium|Low",
  "tags": ["tag1", "tag2"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" } },
            decisions: { type: "array", items: { type: "string" } },
            nextSteps: { type: "array", items: { type: "string" } },
            sentiment: { type: "string" },
            urgency: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setSummary(data);
      toast.success('Conversation summarized!');
    },
    onError: () => {
      toast.error('Failed to summarize');
    }
  });

  if (messages.length === 0) {
    return null;
  }

  const getSentimentColor = () => {
    switch (summary?.sentiment) {
      case 'Positive': return 'bg-green-100 text-green-700';
      case 'Negative': return 'bg-red-100 text-red-700';
      case 'Frustrated': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyColor = () => {
    switch (summary?.urgency) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Conversation Summary
          </div>
          {!summary && (
            <Button 
              size="sm"
              onClick={() => summarizeMutation.mutate()}
              disabled={summarizeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {summarizeMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-2" />
                  Summarize
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      {summary && (
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
          </div>

          {/* Sentiment & Urgency */}
          <div className="flex gap-2">
            <Badge className={getSentimentColor()}>
              {summary.sentiment}
            </Badge>
            <Badge className={getUrgencyColor()}>
              {summary.urgency} Urgency
            </Badge>
          </div>

          {/* Tags */}
          {summary.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Key Points */}
          {summary.keyPoints?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Key Points
              </div>
              <ul className="space-y-1">
                {summary.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {summary.decisions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                Decisions Made
              </div>
              <ul className="space-y-1">
                {summary.decisions.map((decision, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {summary.nextSteps?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                Next Steps
              </div>
              <ul className="space-y-1">
                {summary.nextSteps.map((step, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-purple-500 mt-1">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const text = `Summary: ${summary.summary}\n\nKey Points:\n${summary.keyPoints?.join('\n')}\n\nNext Steps:\n${summary.nextSteps?.join('\n')}`;
                navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard!');
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy
            </Button>
            <Button 
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={() => summarizeMutation.mutate()}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}