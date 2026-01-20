import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, CheckCircle2, Clock, FileText, 
  Loader2, ChevronDown, ChevronUp, Info, Upload
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PortalDocumentUploadEnhanced from './PortalDocumentUploadEnhanced';
import { toast } from 'sonner';

const conditionPriorityConfig = {
  'prior_to_docs': { label: 'Prior to Docs', color: 'bg-red-100 text-red-800', priority: 1 },
  'prior_to_funding': { label: 'Prior to Funding', color: 'bg-orange-100 text-orange-800', priority: 2 },
  'prior_to_closing': { label: 'Prior to Closing', color: 'bg-yellow-100 text-yellow-800', priority: 3 },
  'post_closing': { label: 'Post Closing', color: 'bg-blue-100 text-blue-800', priority: 4 },
};

const conditionStatusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  acknowledged: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
  fulfilled: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  waived: { icon: CheckCircle2, color: 'text-gray-600', bg: 'bg-gray-50' },
};

export default function PortalConditionsTab({ sessionId, dealId }) {
  const queryClient = useQueryClient();
  const [expandedCondition, setExpandedCondition] = useState(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [uploadModalCondition, setUploadModalCondition] = useState(null);

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['portalConditions', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.Condition.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (conditionId) => {
      await base44.entities.Condition.update(conditionId, {
        borrower_acknowledged: true,
        borrower_acknowledged_at: new Date().toISOString(),
      });
    },
    onSuccess: (_, conditionId) => {
      queryClient.invalidateQueries({ queryKey: ['portalConditions'] });
      setAcknowledgedIds(prev => new Set([...prev, conditionId]));
      toast.success('Condition acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge condition');
    },
  });

  const acknowledgeAllMutation = useMutation({
    mutationFn: async (conditionIds) => {
      await Promise.all(
        conditionIds.map(id => 
          base44.entities.Condition.update(id, {
            borrower_acknowledged: true,
            borrower_acknowledged_at: new Date().toISOString(),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalConditions'] });
      toast.success('All conditions acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge conditions');
    },
  });

  // Group conditions by category
  const groupedConditions = conditions.reduce((acc, condition) => {
    const category = condition.condition_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(condition);
    return acc;
  }, {});

  // Stats
  const pendingCount = conditions.filter(c => !c.borrower_acknowledged && c.status === 'pending').length;
  const acknowledgedCount = conditions.filter(c => c.borrower_acknowledged).length;
  const fulfilledCount = conditions.filter(c => c.status === 'fulfilled').length;

  const pendingConditions = conditions.filter(c => !c.borrower_acknowledged && c.status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (conditions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Conditions</h3>
          <p className="text-slate-500">There are no loan conditions at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-sm text-slate-600 mt-1">Need Acknowledgment</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="text-3xl font-bold text-blue-600">{acknowledgedCount}</div>
              <p className="text-sm text-slate-600 mt-1">Acknowledged</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
              <div className="text-3xl font-bold text-green-600">{fulfilledCount}</div>
              <p className="text-sm text-slate-600 mt-1">Fulfilled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Required Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Action Required</p>
                <p className="text-sm text-amber-800 mt-1">
                  Please review and acknowledge {pendingCount} condition{pendingCount !== 1 ? 's' : ''} to proceed with your loan.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => acknowledgeAllMutation.mutate(pendingConditions.map(c => c.id))}
              disabled={acknowledgeAllMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
            >
              {acknowledgeAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Acknowledge All
            </Button>
          </div>
        </div>
      )}

      {/* Conditions List */}
      <div className="space-y-4">
        {Object.entries(groupedConditions).map(([category, categoryConditions]) => {
          const categoryConfig = conditionPriorityConfig[category] || { 
            label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
            color: 'bg-gray-100 text-gray-800' 
          };

          return (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="py-3 bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={categoryConfig.color}>{categoryConfig.label}</Badge>
                    <span className="text-sm font-normal text-slate-500">
                      ({categoryConditions.length} condition{categoryConditions.length !== 1 ? 's' : ''})
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {categoryConditions.map((condition) => {
                  const statusConfig = conditionStatusConfig[condition.status] || conditionStatusConfig.pending;
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedCondition === condition.id;
                  const isAcknowledged = condition.borrower_acknowledged || acknowledgedIds.has(condition.id);

                  return (
                    <div key={condition.id} className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Acknowledgment Checkbox */}
                        {!isAcknowledged && condition.status === 'pending' && (
                          <div className="pt-1">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => acknowledgeMutation.mutate(condition.id)}
                              disabled={acknowledgeMutation.isPending}
                            />
                          </div>
                        )}

                        {/* Status Icon */}
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.bg}`}>
                          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{condition.condition_name}</p>
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                {condition.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAcknowledged && (
                                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Acknowledged
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedCondition(isExpanded ? null : condition.id)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
                              {condition.description && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Full Description</p>
                                  <p className="text-sm text-slate-700">{condition.description}</p>
                                </div>
                              )}
                              {condition.due_date && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Due Date</p>
                                  <p className="text-sm text-slate-700">
                                    {new Date(condition.due_date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                              )}
                              {condition.notes && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Notes</p>
                                  <p className="text-sm text-slate-700">{condition.notes}</p>
                                </div>
                              )}
                              {condition.required_documents?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Required Documents</p>
                                  <ul className="text-sm text-slate-700 list-disc list-inside">
                                    {condition.required_documents.map((doc, idx) => (
                                      <li key={idx}>{doc}</li>
                                    ))}
                                  </ul>
                                  <Button
                                    size="sm"
                                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => setUploadModalCondition(condition)}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Document
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>What are loan conditions?</strong> Conditions are requirements that must be met before 
            your loan can proceed to closing. Acknowledging a condition means you understand the requirement 
            and will work to fulfill it.
          </p>
        </div>
      </div>

      {/* Upload Modal for Conditions */}
      <Dialog open={!!uploadModalCondition} onOpenChange={() => setUploadModalCondition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload for: {uploadModalCondition?.condition_name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {uploadModalCondition?.description && (
              <p className="text-sm text-slate-600 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                💡 {uploadModalCondition.description}
              </p>
            )}
            <PortalDocumentUploadEnhanced
              sessionId={sessionId}
              conditionId={uploadModalCondition?.id}
              requirementName={uploadModalCondition?.condition_name}
              onUploadComplete={() => {
                setUploadModalCondition(null);
                queryClient.invalidateQueries({ queryKey: ['portalConditions'] });
                toast.success('Document uploaded for condition');
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}