import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, CheckCircle2, AlertCircle, Clock, 
  FileText, Users, DollarSign, Home, Loader2, TrendingUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DealReadinessScore({ deal, documents = [], borrowers = [], onAction }) {
  const [aiScore, setAiScore] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeReadinessMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze this loan deal's readiness for submission to underwriting:

Deal Details:
- Loan Amount: $${deal.loan_amount?.toLocaleString()}
- Property Value: $${deal.property_value?.toLocaleString()}
- LTV: ${deal.ltv_ratio}%
- DSCR: ${deal.dscr}
- Stage: ${deal.stage}
- Status: ${deal.status}

Documents: ${documents.length} uploaded
- Bank Statements: ${documents.filter(d => d.document_type?.includes('bank')).length}
- Income Docs: ${documents.filter(d => d.document_type?.includes('income')).length}
- Property Docs: ${documents.filter(d => d.document_type?.includes('property')).length}

Borrowers: ${borrowers.length} total

Provide a readiness score (0-100) and detailed analysis:
{
  "readinessScore": <number 0-100>,
  "readyToSubmit": <boolean>,
  "strengths": ["strength1", "strength2"],
  "missingItems": [
    {
      "category": "Documents|Borrower Info|Property|Financial",
      "item": "specific item",
      "priority": "critical|high|medium",
      "impact": "description of impact"
    }
  ],
  "recommendations": ["rec1", "rec2"],
  "estimatedTimeToReady": "X days|weeks",
  "riskFactors": ["risk1", "risk2"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            readinessScore: { type: "number" },
            readyToSubmit: { type: "boolean" },
            strengths: { type: "array", items: { type: "string" } },
            missingItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  item: { type: "string" },
                  priority: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } },
            estimatedTimeToReady: { type: "string" },
            riskFactors: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAiScore(data);
      setIsAnalyzing(false);
      toast.success('Deal analyzed!');
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error('Analysis failed');
    }
  });

  useEffect(() => {
    if (!aiScore && !isAnalyzing && deal) {
      setIsAnalyzing(true);
      analyzeReadinessMutation.mutate();
    }
  }, [deal?.id]);

  if (isAnalyzing) {
    return (
      <Card className="border-purple-200">
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-600" />
            <p className="text-sm text-gray-600">AI is analyzing deal readiness...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aiScore) return null;

  const getScoreColor = () => {
    if (aiScore.readinessScore >= 80) return 'text-green-600';
    if (aiScore.readinessScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Documents': return FileText;
      case 'Borrower Info': return Users;
      case 'Financial': return DollarSign;
      case 'Property': return Home;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-4">
      {/* Readiness Score */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Deal Readiness Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor()}`}>
              {aiScore.readinessScore}
            </div>
            <p className="text-sm text-gray-600 mt-2">Out of 100</p>
            <Progress value={aiScore.readinessScore} className="mt-4" />
          </div>

          {aiScore.readyToSubmit ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Ready to Submit!
              </div>
              <p className="text-sm text-green-600 mt-1">
                This deal meets submission requirements
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 font-medium">
                <Clock className="h-5 w-5" />
                Not Ready Yet
              </div>
              <p className="text-sm text-yellow-600 mt-1">
                Estimated time: {aiScore.estimatedTimeToReady}
              </p>
            </div>
          )}

          {/* Strengths */}
          {aiScore.strengths?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">✓ Strengths</p>
              <div className="flex flex-wrap gap-2">
                {aiScore.strengths.map((strength, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-700">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Items */}
      {aiScore.missingItems?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Missing Items ({aiScore.missingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiScore.missingItems.map((item, idx) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    item.priority === 'critical' ? 'bg-red-50 border-red-200' :
                    item.priority === 'high' ? 'bg-orange-50 border-orange-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-gray-700" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{item.item}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{item.impact}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {aiScore.recommendations?.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiScore.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {aiScore.riskFactors?.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiScore.riskFactors.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button 
        className="w-full bg-purple-600 hover:bg-purple-700"
        onClick={() => {
          setAiScore(null);
          setIsAnalyzing(true);
          analyzeReadinessMutation.mutate();
        }}
      >
        Re-analyze Deal
      </Button>
    </div>
  );
}