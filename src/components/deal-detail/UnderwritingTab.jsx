import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  FileText,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UnderwritingTab({ dealId, deal }) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: underwriting, isLoading } = useQuery({
    queryKey: ['underwriting', dealId],
    queryFn: async () => {
      const results = await base44.entities.LoanUnderwriting.filter({ deal_id: dealId });
      return results[0];
    },
    enabled: !!dealId,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('aiUnderwritingAssistant', {
        action: 'analyze',
        deal_id: dealId,
        org_id: deal?.org_id,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting', dealId] });
      toast.success('AI analysis complete');
    },
    onError: (error) => {
      toast.error('Analysis failed: ' + error.message);
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ decision }) => {
      if (!underwriting?.id) throw new Error('No underwriting record');
      await base44.entities.LoanUnderwriting.update(underwriting.id, {
        final_decision: decision,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
        requires_manual_review: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting', dealId] });
      toast.success('Review submitted');
    },
  });

  const getDecisionBadge = (decision) => {
    const config = {
      approve: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      deny: { color: 'bg-red-100 text-red-800', icon: XCircle },
      refer: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      conditional_approve: { color: 'bg-blue-100 text-blue-800', icon: ShieldCheck },
      pending: { color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
    };
    const c = config[decision] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {decision?.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getRiskColor = (score) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Underwriting Assistant
          </h2>
          <p className="text-sm text-gray-500">Automated risk assessment and decisioning</p>
        </div>
        <Button
          onClick={() => runAnalysisMutation.mutate()}
          disabled={runAnalysisMutation.isPending}
          className="gap-2"
        >
          {runAnalysisMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {underwriting ? 'Re-analyze' : 'Run AI Analysis'}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            <p className="mt-2 text-gray-500">Loading underwriting data...</p>
          </CardContent>
        </Card>
      ) : !underwriting ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-800 mb-2">No Analysis Yet</h3>
            <p className="text-gray-500 mb-4">Run the AI analysis to get automated risk assessment</p>
            <Button onClick={() => runAnalysisMutation.mutate()} disabled={runAnalysisMutation.isPending}>
              Run AI Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Decision Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">AI Decision</p>
                <div className="mt-2">{getDecisionBadge(underwriting.preliminary_decision)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className={`text-2xl font-bold ${getRiskColor(underwriting.risk_score)}`}>
                  {underwriting.risk_score?.toFixed(0) || '--'}/100
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {underwriting.confidence_score?.toFixed(0) || '--'}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Final Decision</p>
                <div className="mt-2">
                  {underwriting.final_decision 
                    ? getDecisionBadge(underwriting.final_decision)
                    : <Badge variant="outline">Pending Review</Badge>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">DSCR</span>
                  <span className={`font-bold ${(underwriting.dscr_calculated || 0) >= 1.25 ? 'text-green-600' : 'text-red-600'}`}>
                    {underwriting.dscr_calculated?.toFixed(2) || '--'}
                  </span>
                </div>
                <Progress 
                  value={Math.min((underwriting.dscr_calculated || 0) / 2 * 100, 100)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">Target: ≥ 1.25</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">LTV</span>
                  <span className={`font-bold ${(underwriting.ltv_calculated || 0) <= 75 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {underwriting.ltv_calculated?.toFixed(1) || '--'}%
                  </span>
                </div>
                <Progress 
                  value={underwriting.ltv_calculated || 0} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">Target: ≤ 75%</p>
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                  <TrendingUp className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {underwriting.strengths?.length > 0 ? (
                  <ul className="space-y-2">
                    {underwriting.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No strengths identified</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <TrendingDown className="h-5 w-5" />
                  Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {underwriting.concerns?.length > 0 ? (
                  <ul className="space-y-2">
                    {underwriting.concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No concerns identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Summary */}
          {underwriting.analysis_summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{underwriting.analysis_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Recommended Conditions */}
          {underwriting.conditions_recommended?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recommended Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {underwriting.conditions_recommended.map((cond, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      <Badge variant="outline">{i + 1}</Badge>
                      {cond}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Manual Review Section */}
          {(underwriting.requires_manual_review || !underwriting.final_decision) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                  <User className="h-5 w-5" />
                  Manual Review Required
                </CardTitle>
                {underwriting.manual_review_reason && (
                  <CardDescription>{underwriting.manual_review_reason}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => submitReviewMutation.mutate({ decision: 'approve' })}
                    disabled={submitReviewMutation.isPending}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => submitReviewMutation.mutate({ decision: 'conditional_approve' })}
                    disabled={submitReviewMutation.isPending}
                    variant="outline"
                  >
                    Conditional Approve
                  </Button>
                  <Button
                    onClick={() => submitReviewMutation.mutate({ decision: 'deny' })}
                    disabled={submitReviewMutation.isPending}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review History */}
          {underwriting.reviewed_at && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Reviewed by: <strong>{underwriting.reviewed_by || 'Unknown'}</strong></span>
                  <span>•</span>
                  <span>{new Date(underwriting.reviewed_at).toLocaleString()}</span>
                </div>
                {underwriting.review_notes && (
                  <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">{underwriting.review_notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}