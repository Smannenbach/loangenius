import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Building2, Send, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SubmitToLenderModal({ dealId, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedLenders, setSelectedLenders] = useState(new Set());
  const [matching, setMatching] = useState(false);

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

  const orgId = memberships[0]?.org_id || user?.org_id || 'default';

  const { data: matchedLenders = [], isLoading } = useQuery({
    queryKey: ['matchedLenders', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const response = await base44.functions.invoke('lenderIntegrationAPI', {
          action: 'match_lenders',
          deal_id: dealId
        });
        return response.data?.matched_lenders || [];
      } catch {
        // Fallback to all active integrations
        return await base44.entities.LenderIntegration.filter({ 
          org_id: orgId, 
          status: 'active' 
        });
      }
    },
    enabled: !!dealId && open
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedLenders).map(async (lenderId) => {
        return await base44.functions.invoke('lenderIntegrationAPI', {
          action: 'submit_to_lender',
          deal_id: dealId,
          lender_integration_id: lenderId,
          submission_type: 'initial'
        });
      });
      
      return await Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['lenderSubmissions'] });
      const successCount = results.filter(r => r.data?.success).length;
      toast.success(`Submitted to ${successCount} lender${successCount !== 1 ? 's' : ''} successfully!`);
      setSelectedLenders(new Set());
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Submission failed: ' + error.message);
    }
  });

  const toggleLender = (id) => {
    setSelectedLenders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedLenders.size === 0) {
      toast.error('Please select at least one lender');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Submit to Lenders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-500 mt-2">Finding matching lenders...</p>
            </div>
          ) : matchedLenders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <h3 className="font-semibold mb-2">No Lender Integrations</h3>
                <p className="text-sm text-gray-500">Set up lender integrations first to submit loans</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {matchedLenders.length} matching lender{matchedLenders.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <Badge className="bg-blue-600">{selectedLenders.size} selected</Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {matchedLenders.map((lender) => (
                  <Card 
                    key={lender.id}
                    className={`cursor-pointer transition-all ${
                      selectedLenders.has(lender.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-blue-200'
                    }`}
                    onClick={() => toggleLender(lender.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedLenders.has(lender.id)}
                          onCheckedChange={() => toggleLender(lender.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{lender.lender_name}</span>
                            <Badge variant="outline">{lender.lender_type}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              {lender.api_type.replace('_', ' ')}
                            </Badge>
                            {lender.min_dscr && (
                              <Badge variant="outline">Min DSCR: {lender.min_dscr}</Badge>
                            )}
                            {lender.max_ltv && (
                              <Badge variant="outline">Max LTV: {lender.max_ltv}%</Badge>
                            )}
                            {lender.total_submissions > 0 && (
                              <Badge variant="outline">
                                {lender.successful_submissions}/{lender.total_submissions} successful
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={submitMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending || selectedLenders.size === 0}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit to {selectedLenders.size} Lender{selectedLenders.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}