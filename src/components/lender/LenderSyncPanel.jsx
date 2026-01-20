import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Send, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
  Building2, Loader2, ExternalLink, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  partial: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
};

export default function LenderSyncPanel({ dealId, orgId }) {
  const [selectedLender, setSelectedLender] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available lender integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['lenderIntegrations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.LenderIntegration.filter({ 
        org_id: orgId,
        status: 'active'
      });
    },
    enabled: !!orgId,
  });

  // Fetch sync history for this deal
  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['lenderSyncLogs', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.LenderSyncLog.filter({ 
        deal_id: dealId 
      });
    },
    enabled: !!dealId,
  });

  // Fetch submissions for this deal
  const { data: submissions = [] } = useQuery({
    queryKey: ['lenderSubmissions', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.LenderSubmission.filter({ 
        deal_id: dealId 
      });
    },
    enabled: !!dealId,
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('lenderSync', data),
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success('Submission sent successfully');
        queryClient.invalidateQueries({ queryKey: ['lenderSyncLogs', dealId] });
        queryClient.invalidateQueries({ queryKey: ['lenderSubmissions', dealId] });
      } else {
        toast.error(response.data?.error || 'Submission failed');
      }
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error('Submission failed: ' + error.message);
      setConfirmOpen(false);
    },
  });

  const statusCheckMutation = useMutation({
    mutationFn: (submissionId) => base44.functions.invoke('lenderSync', {
      action: 'check_status',
      submission_id: submissionId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenderSubmissions', dealId] });
      toast.success('Status updated');
    },
  });

  const handleSubmit = () => {
    if (!selectedLender) {
      toast.error('Please select a lender');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate({
      action: 'submit',
      deal_id: dealId,
      lender_integration_id: selectedLender,
    });
  };

  const selectedLenderData = integrations.find(i => i.id === selectedLender);

  return (
    <div className="space-y-4">
      {/* Submit to Lender */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Submit to Lender
          </CardTitle>
          <CardDescription>
            Send loan application to connected lenders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select value={selectedLender} onValueChange={setSelectedLender}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lender..." />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{integration.lender_name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {integration.api_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLenderData && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <p className="font-medium">{selectedLenderData.lender_name}</p>
              <p className="text-gray-600">Type: {selectedLenderData.lender_type}</p>
              {selectedLenderData.min_loan_amount && (
                <p className="text-gray-600">
                  Loan Range: ${selectedLenderData.min_loan_amount?.toLocaleString()} - ${selectedLenderData.max_loan_amount?.toLocaleString()}
                </p>
              )}
              {selectedLenderData.max_ltv && (
                <p className="text-gray-600">Max LTV: {selectedLenderData.max_ltv}%</p>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selectedLender || submitMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="cta:LenderSyncPanel:Submit"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit to Lender
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div 
                  key={sub.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{sub.lender_name}</span>
                    </div>
                    <Badge 
                      className={
                        sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                        sub.status === 'denied' ? 'bg-red-100 text-red-700' :
                        sub.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                    </span>
                    {sub.lender_loan_number && (
                      <span>Ref: {sub.lender_loan_number}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => statusCheckMutation.mutate(sub.id)}
                    disabled={statusCheckMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 ${statusCheckMutation.isPending ? 'animate-spin' : ''}`} />
                    Check Status
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {syncLogs.slice(0, 10).map((log) => {
                const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={log.id}
                    className={`p-2 rounded-lg ${config.bg} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm">{log.sync_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {log.duration_ms && <span>{log.duration_ms}ms</span>}
                      <span>{new Date(log.created_date).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You are about to submit this loan application to{' '}
              <span className="font-medium">{selectedLenderData?.lender_name}</span>.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              This action will send your deal data to the lender's system.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSubmit}
              disabled={submitMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}