import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Search, Building2, CheckCircle2, AlertCircle, Loader2,
  TrendingUp, Clock, Send, ChevronDown, ChevronUp, Star, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function AILenderMatcher() {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [matchResults, setMatchResults] = useState(null);
  const [expandedLender, setExpandedLender] = useState(null);

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

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: deals = [] } = useQuery({
    queryKey: ['deals', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.Deal.filter({ org_id: orgId, is_deleted: false });
    },
    enabled: !!orgId,
  });

  const matchMutation = useMutation({
    mutationFn: async (dealId) => {
      const res = await base44.functions.invoke('aiLenderMatcher', {
        action: 'ai_match_lenders',
        deal_id: dealId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMatchResults(data);
      toast.success(`Found ${data.total_matched} matching lenders`);
    },
    onError: (error) => {
      toast.error('Failed to find matches: ' + error.message);
    }
  });

  const handleSearch = () => {
    if (!selectedDealId) {
      toast.error('Please select a deal first');
      return;
    }
    matchMutation.mutate(selectedDealId);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  return (
    <div className="space-y-6">
      {/* Search Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Lender Matching
          </CardTitle>
          <CardDescription>
            Find the best lenders based on deal characteristics and historical performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Label>Select Deal to Match</Label>
              <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {deals.map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.deal_number || deal.id.slice(0, 8)} - ${(deal.loan_amount || 0).toLocaleString()} {deal.loan_product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={matchMutation.isPending || !selectedDealId}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {matchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Find Matching Lenders
            </Button>
          </div>

          {deals.length === 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              No deals found. Create a deal first to use AI lender matching.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {matchResults && (
        <>
          {/* Deal Summary */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Deal Summary</h3>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span><strong>Product:</strong> {matchResults.deal_summary?.loan_product}</span>
                    <span><strong>Amount:</strong> ${(matchResults.deal_summary?.loan_amount || 0).toLocaleString()}</span>
                    {matchResults.deal_summary?.ltv && <span><strong>LTV:</strong> {matchResults.deal_summary.ltv}%</span>}
                    {matchResults.deal_summary?.dscr && <span><strong>DSCR:</strong> {matchResults.deal_summary.dscr}</span>}
                    {matchResults.deal_summary?.state && <span><strong>State:</strong> {matchResults.deal_summary.state}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-700">{matchResults.total_matched}</div>
                  <div className="text-sm text-gray-500">Matching Lenders</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {matchResults.ai_recommendations && (
            <Card className="border-purple-300 bg-purple-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {matchResults.ai_recommendations.top_recommendation && (
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">Top Recommendation</span>
                    </div>
                    <p className="text-sm text-gray-700">{matchResults.ai_recommendations.top_recommendation}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {matchResults.ai_recommendations.deal_strengths?.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Deal Strengths
                      </h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        {matchResults.ai_recommendations.deal_strengths.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {matchResults.ai_recommendations.deal_concerns?.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Address Proactively
                      </h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {matchResults.ai_recommendations.deal_concerns.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {matchResults.ai_recommendations.overall_confidence && (
                  <div className="text-sm text-gray-600">
                    <strong>Confidence:</strong>{' '}
                    <Badge className={
                      matchResults.ai_recommendations.overall_confidence === 'high' ? 'bg-green-100 text-green-700' :
                      matchResults.ai_recommendations.overall_confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {matchResults.ai_recommendations.overall_confidence}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Matched Lenders List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Matched Lenders ({matchResults.total_matched})</h3>
            
            {matchResults.matched_lenders?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-gray-500">
                  No lenders matched the deal criteria. Try adding more lender integrations.
                </CardContent>
              </Card>
            ) : (
              matchResults.matched_lenders?.map((lender, index) => (
                <Card 
                  key={lender.id} 
                  className={`transition-all ${lender.already_contacted ? 'opacity-60' : ''}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${getScoreColor(lender.ai_score)}`}>
                          {lender.ai_score}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{lender.lender_name}</h4>
                            <Badge variant="outline" className="text-xs">{lender.lender_type}</Badge>
                            {lender.already_contacted && (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">Already Contacted</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{getScoreLabel(lender.ai_score)}</p>
                          
                          {/* AI Insights */}
                          {lender.ai_insights?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lender.ai_insights.slice(0, 3).map((insight, i) => (
                                <Badge key={i} className="bg-green-50 text-green-700 text-xs font-normal">
                                  {insight}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* AI Warnings */}
                          {lender.ai_warnings?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {lender.ai_warnings.map((warning, i) => (
                                <Badge key={i} className="bg-yellow-50 text-yellow-700 text-xs font-normal">
                                  ⚠ {warning}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setExpandedLender(expandedLender === lender.id ? null : lender.id)}
                        >
                          {expandedLender === lender.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {!lender.already_contacted && (
                          <Button size="sm" className="gap-1">
                            <Send className="h-3 w-3" />
                            Submit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLender === lender.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Integration:</span>
                            <span className="ml-1 font-medium">{lender.api_type?.replace('_', ' ')}</span>
                          </div>
                          {lender.min_loan_amount && (
                            <div>
                              <span className="text-gray-500">Min Loan:</span>
                              <span className="ml-1 font-medium">${lender.min_loan_amount.toLocaleString()}</span>
                            </div>
                          )}
                          {lender.max_loan_amount && (
                            <div>
                              <span className="text-gray-500">Max Loan:</span>
                              <span className="ml-1 font-medium">${lender.max_loan_amount.toLocaleString()}</span>
                            </div>
                          )}
                          {lender.min_dscr && (
                            <div>
                              <span className="text-gray-500">Min DSCR:</span>
                              <span className="ml-1 font-medium">{lender.min_dscr}</span>
                            </div>
                          )}
                          {lender.max_ltv && (
                            <div>
                              <span className="text-gray-500">Max LTV:</span>
                              <span className="ml-1 font-medium">{lender.max_ltv}%</span>
                            </div>
                          )}
                        </div>

                        {lender.historical_stats && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h5 className="font-medium text-sm mb-2">Historical Performance</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Approval Rate:</span>
                                <span className="ml-1 font-medium text-green-600">{lender.historical_stats.approval_rate}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Total Submissions:</span>
                                <span className="ml-1 font-medium">{lender.historical_stats.total_submissions}</span>
                              </div>
                              {lender.historical_stats.avg_response_time && (
                                <div>
                                  <span className="text-gray-500">Avg Response:</span>
                                  <span className="ml-1 font-medium">{lender.historical_stats.avg_response_time} days</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Recent Activity:</span>
                                <span className="ml-1 font-medium">{lender.historical_stats.recent_activity_score} in 90d</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {lender.contact_email && (
                          <div className="text-sm text-gray-600">
                            <strong>Contact:</strong> {lender.contact_name} ({lender.contact_email})
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}