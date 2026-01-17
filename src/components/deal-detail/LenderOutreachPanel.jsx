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
  RefreshCw,
  Brain,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Timer,
  BarChart3,
  Lightbulb
} from 'lucide-react';

export default function LenderOutreachPanel({ dealId, deal }) {
  const queryClient = useQueryClient();
  const [selectedLenders, setSelectedLenders] = useState(new Set());
  const [includeMismo, setIncludeMismo] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);

  // Fetch AI-powered matching lenders
  const { data: matchData, isLoading, refetch } = useQuery({
    queryKey: ['lender-match-ai', dealId],
    queryFn: async () => {
      const response = await base44.functions.invoke('aiLenderMatcher', {
        action: 'ai_match_lenders',
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
  const aiRecommendations = matchData?.ai_recommendations;
  const autoEnabledCount = lenders.filter(l => l.auto_submit_enabled && !l.already_contacted).length;
  const topRecommendedCount = lenders.filter(l => l.ai_score >= 70 && !l.already_contacted).length;

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

  // Get outreach strategy for a lender
  const getOutreachStrategy = (lenderName) => {
    return aiRecommendations?.outreach_strategy?.find(
      s => s.lender_name.toLowerCase() === lenderName.toLowerCase()
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Powered Lender Matching
            </CardTitle>
            <CardDescription>
              {lenders.length} matching lenders • {topRecommendedCount} AI recommended • {matchData?.already_contacted || 0} contacted
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showAIInsights ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setShowAIInsights(!showAIInsights)}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI Insights
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Recommendations Panel */}
        {showAIInsights && aiRecommendations && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-900">AI Strategy Recommendations</span>
              <Badge variant="outline" className={
                aiRecommendations.overall_confidence === 'high' ? 'bg-green-100 text-green-700' :
                aiRecommendations.overall_confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }>
                {aiRecommendations.overall_confidence} confidence
              </Badge>
            </div>
            
            {aiRecommendations.top_recommendation && (
              <div className="text-sm text-purple-800">
                <span className="font-medium">Top Pick: </span>
                {aiRecommendations.top_recommendation}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              {aiRecommendations.deal_strengths?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
                    <ThumbsUp className="h-3 w-3" /> Deal Strengths
                  </div>
                  <ul className="text-green-700 space-y-0.5">
                    {aiRecommendations.deal_strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-xs">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiRecommendations.deal_concerns?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                    <AlertCircle className="h-3 w-3" /> Address Proactively
                  </div>
                  <ul className="text-amber-700 space-y-0.5">
                    {aiRecommendations.deal_concerns.slice(0, 3).map((c, i) => (
                      <li key={i} className="text-xs">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => autoOutreachMutation.mutate()}
                  disabled={autoOutreachMutation.isPending || autoEnabledCount === 0}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {autoOutreachMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Smart Outreach ({topRecommendedCount > 0 ? topRecommendedCount : autoEnabledCount})
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send to AI-recommended lenders with highest match scores</p>
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
              lenders.map((lender) => {
                const strategy = getOutreachStrategy(lender.lender_name);
                const scoreColor = lender.ai_score >= 70 ? 'text-green-600' : 
                                   lender.ai_score >= 50 ? 'text-yellow-600' : 'text-gray-500';
                
                return (
                <div
                  key={lender.id}
                  className={`p-4 rounded-lg border transition-all ${
                    lender.already_contacted 
                      ? 'bg-muted/50 opacity-60' 
                      : lender.ai_score >= 70
                        ? 'border-purple-300 bg-purple-50/50'
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
                        
                        {/* AI Score Badge */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className={`text-xs ${scoreColor}`}>
                                <Brain className="h-3 w-3 mr-1" />
                                {lender.ai_score}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">AI Match Score: {lender.ai_score}/100</p>
                              {lender.ai_insights?.length > 0 && (
                                <ul className="mt-1 text-xs">
                                  {lender.ai_insights.map((i, idx) => (
                                    <li key={idx} className="text-green-600">✓ {i}</li>
                                  ))}
                                </ul>
                              )}
                              {lender.ai_warnings?.length > 0 && (
                                <ul className="mt-1 text-xs">
                                  {lender.ai_warnings.map((w, idx) => (
                                    <li key={idx} className="text-amber-600">⚠ {w}</li>
                                  ))}
                                </ul>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {lender.ai_score >= 70 && !lender.already_contacted && (
                          <Badge className="text-xs bg-purple-600">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Top Pick
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
                        {lender.historical_stats?.approval_rate > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {lender.historical_stats.approval_rate}% approval
                          </span>
                        )}
                        {lender.historical_stats?.avg_response_time && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            ~{lender.historical_stats.avg_response_time}d response
                          </span>
                        )}
                        {lender.min_loan_amount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${(lender.min_loan_amount / 1000).toFixed(0)}K - ${((lender.max_loan_amount || 10000000) / 1000000).toFixed(1)}M
                          </span>
                        )}
                      </div>

                      {/* AI Insights */}
                      {showAIInsights && lender.ai_insights?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lender.ai_insights.slice(0, 2).map((insight, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-normal text-green-700 bg-green-50">
                              {insight}
                            </Badge>
                          ))}
                          {lender.ai_warnings?.slice(0, 1).map((warning, idx) => (
                            <Badge key={`w-${idx}`} variant="outline" className="text-xs font-normal text-amber-700 bg-amber-50">
                              {warning}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Strategy recommendation */}
                      {showAIInsights && strategy && !lender.already_contacted && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <span className="font-medium text-blue-800">Strategy: </span>
                          <span className="text-blue-700">
                            {strategy.recommended_method === 'mismo' ? 'Send MISMO package' : 
                             strategy.recommended_method === 'phone_then_email' ? 'Call first, then email' : 'Email intro'}
                            {strategy.priority === 'immediate' && ' • Act now'}
                            {strategy.follow_up_timing && ` • Follow up: ${strategy.follow_up_timing}`}
                          </span>
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
              )})
            )}
          </div>
        </ScrollArea>

        {/* Stats Footer */}
        {lenders.length > 0 && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-bold text-blue-600">{lenders.length}</div>
                <div className="text-muted-foreground">Matched</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{topRecommendedCount}</div>
                <div className="text-muted-foreground">AI Top Picks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{matchData?.already_contacted || 0}</div>
                <div className="text-muted-foreground">Contacted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {lenders.filter(l => l.historical_stats?.approval_rate >= 70).length}
                </div>
                <div className="text-muted-foreground">High Approval</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}