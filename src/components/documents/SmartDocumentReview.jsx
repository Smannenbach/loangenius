import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileSearch,
  Loader2,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  info: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

export default function SmartDocumentReview({ dealId, documentId, documentUrl }) {
  const [reviewResult, setReviewResult] = useState(null);
  const queryClient = useQueryClient();

  // Fetch existing issues for this deal
  const { data: existingIssues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['documentIssues', dealId],
    queryFn: () => base44.entities.DocumentReviewIssue.filter({ 
      deal_id: dealId,
      status: 'open'
    }),
    enabled: !!dealId,
  });

  const reviewMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('smartDocumentReview', data),
    onSuccess: (response) => {
      setReviewResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['documentIssues', dealId] });
      
      if (response.data?.overall_status === 'pass') {
        toast.success('Document review passed!');
      } else if (response.data?.overall_status === 'needs_review') {
        toast.info('Review complete - some items need attention');
      } else {
        toast.warning('Review found critical issues');
      }
    },
    onError: (error) => {
      toast.error('Review failed: ' + error.message);
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: ({ issueId, notes }) => 
      base44.entities.DocumentReviewIssue.update(issueId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentIssues', dealId] });
      toast.success('Issue resolved');
    },
  });

  const handleRunReview = () => {
    reviewMutation.mutate({
      deal_id: dealId,
      document_id: documentId,
      document_url: documentUrl,
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'pass') return <Badge className="bg-green-100 text-green-700">Pass</Badge>;
    if (status === 'needs_review') return <Badge className="bg-yellow-100 text-yellow-700">Needs Review</Badge>;
    return <Badge className="bg-red-100 text-red-700">Fail</Badge>;
  };

  const issues = reviewResult?.issues || existingIssues;
  const summary = reviewResult?.summary || {
    total_issues: existingIssues.length,
    critical: existingIssues.filter(i => i.severity === 'critical').length,
    warnings: existingIssues.filter(i => i.severity === 'warning').length,
    info: existingIssues.filter(i => i.severity === 'info').length,
  };

  const completionScore = Math.max(0, 100 - (summary.critical * 20) - (summary.warnings * 5));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-blue-600" />
              Smart Document Review
            </CardTitle>
            <CardDescription>
              AI-powered review to flag issues before submission
            </CardDescription>
          </div>
          <Button
            onClick={handleRunReview}
            disabled={reviewMutation.isPending}
            variant="outline"
            className="gap-2"
            data-testid="cta:SmartDocumentReview:RunReview"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {documentUrl ? 'Review Document' : 'Review Deal'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Submission Readiness</span>
            <span className={completionScore >= 80 ? 'text-green-600' : completionScore >= 50 ? 'text-yellow-600' : 'text-red-600'}>
              {completionScore}%
            </span>
          </div>
          <Progress 
            value={completionScore} 
            className={`h-2 ${completionScore >= 80 ? '[&>div]:bg-green-500' : completionScore >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-700">{summary.critical}</p>
            <p className="text-xs text-red-600">Critical</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-700">{summary.warnings}</p>
            <p className="text-xs text-yellow-600">Warnings</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{summary.total_issues === 0 ? '✓' : summary.info}</p>
            <p className="text-xs text-green-600">{summary.total_issues === 0 ? 'All Clear' : 'Info'}</p>
          </div>
        </div>

        {/* Overall Status */}
        {reviewResult && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Overall Status</span>
            {getStatusBadge(reviewResult.overall_status)}
          </div>
        )}

        {/* Issues List */}
        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Issues Found</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {issues.map((issue, idx) => {
                const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={issue.id || idx}
                    className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{issue.field_name || issue.issue_type?.replace(/_/g, ' ')}</p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {issue.issue_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                        {issue.suggested_action && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            → {issue.suggested_action}
                          </p>
                        )}
                        {issue.id && issue.status === 'open' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-7 text-xs gap-1"
                            onClick={() => resolveIssueMutation.mutate({ issueId: issue.id, notes: 'Resolved' })}
                            disabled={resolveIssueMutation.isPending}
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {issues.length === 0 && !reviewMutation.isPending && (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium">No issues found</p>
            <p className="text-sm">Document is ready for submission</p>
          </div>
        )}

        {/* Review Confidence */}
        {reviewResult?.confidence && (
          <div className="text-xs text-gray-500 text-right">
            AI Confidence: {reviewResult.confidence}
          </div>
        )}
      </CardContent>
    </Card>
  );
}