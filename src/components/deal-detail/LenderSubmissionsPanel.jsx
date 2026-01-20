import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LenderSubmissionsPanel({ dealId, orgId }) {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState(null);

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['lender-submissions', dealId],
    queryFn: async () => {
      const res = await base44.functions.invoke('autoLenderSubmission', {
        action: 'get_submissions',
        deal_id: dealId,
        org_id: orgId,
      });
      return res.data;
    },
    enabled: !!dealId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ submissionId, status }) => {
      const res = await base44.functions.invoke('autoLenderSubmission', {
        action: 'update_status',
        submission_id: submissionId,
        status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lender-submissions', dealId] });
      toast.success('Status updated');
      setUpdatingId(null);
    },
    onError: (error) => {
      toast.error('Update failed: ' + error.message);
      setUpdatingId(null);
    },
  });

  const submissions = submissionsData?.submissions || [];
  const metrics = submissionsData?.metrics || {};

  const getStatusBadge = (status) => {
    const config = {
      preparing: { color: 'bg-gray-100 text-gray-700', icon: Clock },
      submitted: { color: 'bg-blue-100 text-blue-700', icon: Send },
      in_review: { color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      denied: { color: 'bg-red-100 text-red-700', icon: XCircle },
      suspended: { color: 'bg-orange-100 text-orange-700', icon: Clock },
    };
    const c = config[status] || config.preparing;
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status?.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics */}
      {submissions.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{metrics.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-blue-600">{metrics.pending || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Approved</p>
              <p className="text-xl font-bold text-green-600">{metrics.approved || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Avg Response</p>
              <p className="text-xl font-bold">{metrics.avg_response_hours || '--'}h</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submission History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{sub.lender_name}</h4>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                      {sub.lender_loan_number && (
                        <p className="text-sm text-gray-600">
                          Lender Loan #: {sub.lender_loan_number}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>

                  {/* Response time */}
                  {sub.response_time_hours && (
                    <p className="text-xs text-gray-500 mb-2">
                      Response time: {sub.response_time_hours.toFixed(1)} hours
                    </p>
                  )}

                  {/* Status update dropdown */}
                  {['submitted', 'in_review'].includes(sub.status) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <span className="text-sm text-gray-600">Update status:</span>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          setUpdatingId(sub.id);
                          updateStatusMutation.mutate({ submissionId: sub.id, status: value });
                        }}
                        disabled={updatingId === sub.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="denied">Denied</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      {updatingId === sub.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  )}

                  {/* Conditions */}
                  {sub.conditions_json?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Conditions ({sub.conditions_json.length})</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {sub.conditions_json.slice(0, 3).map((cond, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full" />
                            {cond.description || cond}
                          </li>
                        ))}
                        {sub.conditions_json.length > 3 && (
                          <li className="text-gray-400">+{sub.conditions_json.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}