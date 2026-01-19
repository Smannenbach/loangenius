import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Loader2, CheckCircle2, Building2, AlertCircle, Shield, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import MISMOValidationPanel from './MISMOValidationPanel';

export default function SubmitToLenderModal({ dealId, open, onOpenChange }) {
  const [selectedLenders, setSelectedLenders] = useState([]);
  const [submissionType, setSubmissionType] = useState('initial');
  const [activeTab, setActiveTab] = useState('validate');
  const [validationPassed, setValidationPassed] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenderIntegrations', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.LenderIntegration.filter({ 
          org_id: orgId,
          status: 'active' 
        });
      } catch {
        return [];
      }
    },
    enabled: !!orgId
  });

  const { data: deal } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      const deals = await base44.entities.Deal.list();
      return deals.find(d => d.id === dealId);
    },
    enabled: !!dealId
  });

  const submitMutation = useMutation({
    mutationFn: async (lenderId) => {
      const response = await base44.functions.invoke('lenderAPISubmission', {
        deal_id: dealId,
        lender_integration_id: lenderId,
        submission_type: submissionType,
        skip_validation: validationPassed // Skip if already validated
      });
      return response.data;
    },
    onSuccess: (data, lenderId) => {
      const lender = lenders.find(l => l.id === lenderId);
      if (data.success) {
        toast.success(`Successfully submitted to ${lender?.lender_name}`);
      } else {
        toast.error(`Failed to submit to ${lender?.lender_name}: ${data.lender_response?.message}`);
      }
      queryClient.invalidateQueries(['lenderSubmissions']);
    },
    onError: (error, lenderId) => {
      const lender = lenders.find(l => l.id === lenderId);
      toast.error(`Error submitting to ${lender?.lender_name}: ${error.message}`);
    }
  });

  const handleValidationComplete = (result) => {
    setValidationResult(result);
    const passed = result?.validation?.can_proceed === true;
    setValidationPassed(passed);
    if (passed) {
      setActiveTab('select');
    }
  };

  const handleSubmitAll = async () => {
    if (selectedLenders.length === 0) {
      toast.error('Please select at least one lender');
      return;
    }

    for (const lenderId of selectedLenders) {
      await submitMutation.mutateAsync(lenderId);
    }

    toast.success(`Submitted to ${selectedLenders.length} lender(s)`);
    onOpenChange(false);
  };

  const toggleLender = (lenderId) => {
    setSelectedLenders(prev => 
      prev.includes(lenderId)
        ? prev.filter(id => id !== lenderId)
        : [...prev, lenderId]
    );
  };

  const eligibleLenders = lenders.filter(lender => {
    if (!deal) return true;
    
    const loanAmount = deal.loan_amount || 0;
    const dscr = deal.dscr || 0;
    const ltv = deal.ltv || 0;

    if (lender.min_loan_amount && loanAmount < lender.min_loan_amount) return false;
    if (lender.max_loan_amount && loanAmount > lender.max_loan_amount) return false;
    if (lender.min_dscr && dscr < lender.min_dscr) return false;
    if (lender.max_ltv && ltv > lender.max_ltv) return false;

    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Submit to Lenders
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="validate" className="gap-2">
              <Shield className="h-4 w-4" />
              1. Validate
              {validationPassed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="select" className="gap-2" disabled={!validationPassed}>
              <Send className="h-4 w-4" />
              2. Submit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-4 mt-4">
            {/* Deal Summary */}
            {deal && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Deal:</span>
                    <span className="ml-2 font-medium">{deal.deal_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">${(deal.loan_amount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">DSCR:</span>
                    <span className="ml-2 font-medium">{deal.dscr?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            <MISMOValidationPanel 
              dealId={dealId} 
              onValidationComplete={handleValidationComplete}
            />

            {validationPassed && (
              <Button 
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => setActiveTab('select')}
              >
                Continue to Lender Selection
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </TabsContent>

          <TabsContent value="select" className="space-y-4 mt-4">
            {/* Validation Status Badge */}
            {validationResult && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  MISMO validation passed - ready to submit
                </span>
              </div>
            )}

            {/* Submission Type */}
            <div>
              <Label>Submission Type</Label>
              <Select value={submissionType} onValueChange={setSubmissionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial Submission</SelectItem>
                  <SelectItem value="update">Update Submission</SelectItem>
                  <SelectItem value="resubmission">Resubmission</SelectItem>
                  <SelectItem value="documents_only">Documents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lender Selection */}
            <div>
              <Label className="mb-3 block">Select Lenders ({eligibleLenders.length} eligible)</Label>
              {eligibleLenders.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600 font-medium">No eligible lenders found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Add lender integrations or check deal parameters
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {eligibleLenders.map(lender => (
                    <div 
                      key={lender.id}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedLenders.includes(lender.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleLender(lender.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedLenders.includes(lender.id)}
                          onCheckedChange={() => toggleLender(lender.id)}
                        />
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium">{lender.lender_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {lender.lender_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {lender.api_type}
                            </Badge>
                          </div>
                        </div>
                        {selectedLenders.includes(lender.id) && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleSubmitAll}
                disabled={submitMutation.isPending || selectedLenders.length === 0}
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="h-4 w-4" />Submit to {selectedLenders.length} Lender(s)</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}