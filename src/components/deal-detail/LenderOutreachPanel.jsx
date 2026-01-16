import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Building2,
  Send,
  Zap,
  CheckCircle2,
  Clock,
  Mail,
  FileText,
  Target,
  Loader2,
  ChevronRight,
  DollarSign,
  MapPin,
  Percent,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function LenderOutreachPanel({ dealId, deal }) {
  const queryClient = useQueryClient();
  const [selectedLenders, setSelectedLenders] = useState(new Set());
  const [includeMismo, setIncludeMismo] = useState(false);

  // Fetch matching lenders
  const { data: matchData, isLoading, refetch } = useQuery({
    queryKey: ['lender-match', dealId],
    queryFn: async () => {
      const response = await base44.functions.invoke('autoLenderOutreach', {
        action: 'match_lenders',
        deal_id: dealId
      });
      return response.data;
    },
    enabled: !!dealId
  });

  // Send intro to single lender
  const sendIntroMutation = useMutation({
    mutationFn: async ({ lenderId }) => {
      const response = await base44.functions.invoke('autoLenderOutreach', {
        action: 'send_intro',
        deal_id: dealId,
        lender_id: lenderId,
        include_mismo: includeMismo
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Sent to ${data.lender_name}`);
      queryClient.invalidateQueries(['lender-match', dealId]);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Auto outreach to all auto-enabled lenders
  const autoOutreachMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('autoLenderOutreach', {
        action: 'auto_outreach',
        deal_id: dealId,
        max_lenders: 10,
        include_mismo: includeMismo
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Sent to ${data.sent_count} lenders`);
      queryClient.invalidateQueries(['lender-match', dealId]);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Send to selected lenders
  const sendToSelectedMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const lenderId of selectedLenders) {
        try {
          const response = await base44.functions.invoke('autoLenderOutreach', {
            action: 'send_intro',
            deal_id: dealId,
            lender_id: lenderId,
            include_mismo: includeMismo
          });
          results.push({ success: true, ...response.data });
        } catch (e) {
          results.push({ success: false, error: e.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      toast.success(`Sent to ${successCount} of ${results.length} lenders`);
      setSelectedLenders(new Set());
      queryClient.invalidateQueries(['lender-match', dealId]);
    }
  });

  const lenders = matchData?.matched_lenders || [];
  const autoEnabledCount = lenders.filter(l => l.auto_submit_enabled && !l.already_contacted).length;

  const toggleLender = (id) => {
    const newSet = new Set(selectedLenders);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLenders(newSet);
  };

  const selectAllEligible = () => {
    const eligible = lenders.filter(l => !l.already_contacted && (l.contact_email || l.submission_email));
    setSelectedLenders(new Set(eligible.map(l => l.id)));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Lender Outreach
            </CardTitle>
            <CardDescription>
              {lenders.length} matching lenders • {matchData?.already_contacted || 0} already contacted
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => autoOutreachMutation.mutate()}
                  disabled={autoOutreachMutation.isPending || autoEnabledCount === 0}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {autoOutreachMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Auto Outreach ({autoEnabledCount})
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send intro emails to all auto-enabled lenders</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {selectedLenders.size > 0 && (
            <Button
              onClick={() => sendToSelectedMutation.mutate()}
              disabled={sendToSelectedMutation.isPending}
              variant="outline"
            >
              {sendToSelectedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to Selected ({selectedLenders.size})
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={selectAllEligible}>
            Select All Eligible
          </Button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={includeMismo}
              onCheckedChange={setIncludeMismo}
            />
            <span className="text-muted-foreground">Include MISMO 3.4 file</span>
          </label>
        </div>

        {/* Lender List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {lenders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No matching lenders found</p>
                <p className="text-sm">Add lenders to your database that match this deal's criteria</p>
              </div>
            ) : (
              lenders.map((lender) => (
                <div
                  key={lender.id}
                  className={`p-4 rounded-lg border transition-all ${
                    lender.already_contacted 
                      ? 'bg-muted/50 opacity-60' 
                      : selectedLenders.has(lender.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!lender.already_contacted && (
                      <Checkbox
                        checked={selectedLenders.has(lender.id)}
                        onCheckedChange={() => toggleLender(lender.id)}
                        disabled={!lender.contact_email && !lender.submission_email}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{lender.lender_name}</span>
                        {lender.auto_submit_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                        {lender.already_contacted && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Contacted
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lender.lender_type}
                        </span>
                        {lender.min_loan_amount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${(lender.min_loan_amount / 1000).toFixed(0)}K - ${((lender.max_loan_amount || 10000000) / 1000000).toFixed(1)}M
                          </span>
                        )}
                        {lender.max_ltv && (
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Max {lender.max_ltv}% LTV
                          </span>
                        )}
                        {lender.min_dscr && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Min {lender.min_dscr} DSCR
                          </span>
                        )}
                      </div>

                      {lender.match_reasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lender.match_reasons.slice(0, 3).map((reason, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-normal">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {(!lender.contact_email && !lender.submission_email) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          No email configured
                        </div>
                      )}
                    </div>

                    {!lender.already_contacted && (lender.contact_email || lender.submission_email) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => sendIntroMutation.mutate({ lenderId: lender.id })}
                        disabled={sendIntroMutation.isPending}
                      >
                        {sendIntroMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Stats Footer */}
        {lenders.length > 0 && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-bold text-blue-600">{lenders.length}</div>
                <div className="text-muted-foreground">Matched</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{matchData?.already_contacted || 0}</div>
                <div className="text-muted-foreground">Contacted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{autoEnabledCount}</div>
                <div className="text-muted-foreground">Auto-Ready</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}