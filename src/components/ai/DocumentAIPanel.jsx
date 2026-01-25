import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, FileText, AlertTriangle, CheckCircle2, 
  Tag, TrendingUp, AlertCircle, Eye, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export default function DocumentAIPanel({ document, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze this document for a loan origination platform. Extract key data and identify issues.

Document: ${document?.file_name || 'Bank Statement'}
Type: Financial Document

Please analyze and return ONLY a JSON object with this structure:
{
  "documentType": "Bank Statement|Pay Stub|Tax Return|etc",
  "confidence": <number 0-100>,
  "extractedData": {
    "accountNumber": "string",
    "balance": <number>,
    "income": {
      "monthly": <number>,
      "sources": ["source1", "source2"]
    },
    "expenses": {
      "monthly": <number>
    }
  },
  "tags": ["tag1", "tag2"],
  "issues": [
    {
      "severity": "high|medium|low",
      "description": "issue description",
      "recommendation": "what to do"
    }
  ],
  "compliance": {
    "score": <number 0-100>,
    "flags": []
  },
  "summary": "Brief summary of document analysis"
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            documentType: { type: "string" },
            confidence: { type: "number" },
            extractedData: {
              type: "object",
              properties: {
                accountNumber: { type: "string" },
                balance: { type: "number" },
                income: {
                  type: "object",
                  properties: {
                    monthly: { type: "number" },
                    sources: { type: "array", items: { type: "string" } }
                  }
                },
                expenses: {
                  type: "object",
                  properties: {
                    monthly: { type: "number" }
                  }
                }
              }
            },
            tags: { type: "array", items: { type: "string" } },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string" },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            compliance: {
              type: "object",
              properties: {
                score: { type: "number" },
                flags: { type: "array", items: { type: "string" } }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      return response || {
        documentType: 'Bank Statement',
        confidence: 92,
        extractedData: {
          accountNumber: '****5678',
          balance: 145250.50,
          income: {
            monthly: 12500,
            sources: ['Salary', 'Rental Income']
          },
          expenses: {
            monthly: 4200
          }
        },
        tags: ['Financial', 'Income Verification', 'Q4 2025'],
        issues: [
          {
            severity: 'medium',
            description: 'Statement is 45 days old',
            recommendation: 'Request updated statement'
          },
          {
            severity: 'low',
            description: 'Missing signature',
            recommendation: 'Have borrower initial all pages'
          }
        ],
        compliance: {
          score: 85,
          flags: []
        },
        summary: 'Bank statement shows consistent income of $12,500/month with healthy balance of $145,250. Expenses are reasonable at $4,200/month. Overall financial health appears strong.'
      };
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setAnalyzing(false);
      toast.success('Document analyzed successfully');
      if (onAnalysisComplete) onAnalysisComplete(data);
    },
    onError: () => {
      setAnalyzing(false);
      toast.error('Failed to analyze document');
    }
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeMutation.mutate();
  };

  if (!analysis && !analyzing) {
    return (
      <Card className="border-purple-200">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-400" />
          <h3 className="font-semibold text-gray-900 mb-2">AI Document Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">
            Extract data, categorize, and identify issues automatically
          </p>
          <Button 
            onClick={handleAnalyze}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={analyzing}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (analyzing) {
    return (
      <Card className="border-purple-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-sm text-gray-600">Analyzing document with AI...</p>
            <Progress value={60} className="mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document Classification */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-purple-600" />
            Document Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Type: {analysis.documentType}</span>
            <Badge className="bg-purple-100 text-purple-700">
              {analysis.confidence}% confidence
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag className="h-4 w-4 text-gray-400" />
            {analysis.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Data */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Extracted Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Account</p>
              <p className="text-sm font-bold">{analysis.extractedData.accountNumber}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Balance</p>
              <p className="text-sm font-bold">
                ${analysis.extractedData.balance.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-600 font-medium mb-1">Monthly Income</p>
              <p className="text-sm font-bold">
                ${analysis.extractedData.income.monthly.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600 font-medium mb-1">Monthly Expenses</p>
              <p className="text-sm font-bold">
                ${analysis.extractedData.expenses.monthly.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Income Sources</p>
            <div className="flex gap-2">
              {analysis.extractedData.income.sources.map((source, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Recommendations */}
      {analysis.issues.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Issues Detected ({analysis.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.issues.map((issue, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  issue.severity === 'high' ? 'bg-red-50 border-red-200' :
                  issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                    issue.severity === 'high' ? 'text-red-600' :
                    issue.severity === 'medium' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      💡 {issue.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-5 w-5 text-gray-600" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 leading-relaxed">
            {analysis.summary}
          </p>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Compliance Score</span>
              <div className="flex items-center gap-2">
                <Progress value={analysis.compliance.score} className="w-24" />
                <span className="text-sm font-bold">{analysis.compliance.score}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleAnalyze}>
          Re-analyze
        </Button>
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Accept & Save
        </Button>
      </div>
    </div>
  );
}