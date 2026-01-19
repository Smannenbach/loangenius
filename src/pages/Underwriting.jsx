import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Scale, Clock, CheckCircle2, AlertTriangle, Brain, FileText, TrendingUp, XCircle, Eye, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Underwriting() {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
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

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['underwritingDeals', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          return await base44.entities.Deal.filter({ org_id: orgId, is_deleted: false });
        }
        const allDeals = await base44.entities.Deal.list();
        return allDeals.filter(d => !d.is_deleted);
      } catch {
        return [];
      }
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Deal.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwritingDeals'] });
      setIsReviewOpen(false);
      setSelectedDeal(null);
      setReviewNotes('');
      toast.success('Deal updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const underwritingDeals = deals.filter(d => 
    ['underwriting', 'conditional_approval', 'processing'].includes(d.stage)
  );

  const approvedDeals = deals.filter(d => d.stage === 'approved');
  const deniedDeals = deals.filter(d => d.stage === 'denied');

  const getStatusBadge = (deal) => {
    const dscr = deal.dscr || 0;
    const ltv = deal.ltv || 0;
    if (dscr >= 1.25 && ltv <= 75) {
      return <Badge className="bg-green-100 text-green-700">Low Risk</Badge>;
    } else if (dscr >= 1.0 && ltv <= 80) {
      return <Badge className="bg-yellow-100 text-yellow-700">Moderate Risk</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">High Risk</Badge>;
  };

  const getRiskScore = (deal) => {
    let score = 100;
    const dscr = deal.dscr || 0;
    const ltv = deal.ltv || 0;
    
    if (dscr < 1.0) score -= 40;
    else if (dscr < 1.25) score -= 20;
    
    if (ltv > 80) score -= 30;
    else if (ltv > 75) score -= 15;
    
    return Math.max(0, score);
  };

  const handleApprove = (deal) => {
    updateDealMutation.mutate({
      id: deal.id,
      updates: { stage: 'approved', status: 'active' }
    });
  };

  const handleDeny = (deal) => {
    updateDealMutation.mutate({
      id: deal.id,
      updates: { stage: 'denied', status: 'closed' }
    });
  };

  const handleConditional = (deal) => {
    setSelectedDeal(deal);
    setIsReviewOpen(true);
  };

  const submitConditionalApproval = () => {
    if (!selectedDeal) return;
    updateDealMutation.mutate({
      id: selectedDeal.id,
      updates: { 
        stage: 'conditional_approval', 
        meta_json: { 
          ...selectedDeal.meta_json, 
          underwriting_notes: reviewNotes,
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString()
        }
      }
    });
  };

  const stats = [
    { label: 'Pending Review', value: underwritingDeals.length, icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Approved', value: approvedDeals.length, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Denied', value: deniedDeals.length, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
    { label: 'Avg Risk Score', value: underwritingDeals.length > 0 ? Math.round(underwritingDeals.reduce((sum, d) => sum + getRiskScore(d), 0) / underwritingDeals.length) : 0, icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Scale className="h-7 w-7 text-purple-600" />
          Underwriting Center
          <Badge className="bg-purple-100 text-purple-700">AI Powered</Badge>
        </h1>
        <p className="text-gray-500 mt-1">Review and approve loan applications with AI-assisted risk analysis</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className={`border-0 ${stat.bgColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-10 w-10 ${stat.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">Review Queue ({underwritingDeals.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedDeals.length})</TabsTrigger>
          <TabsTrigger value="denied">Denied ({deniedDeals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Pending Underwriting Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  <p className="text-gray-500 mt-2">Loading deals...</p>
                </div>
              ) : underwritingDeals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No deals pending underwriting review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {underwritingDeals.map((deal) => (
                    <div key={deal.id} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link to={createPageUrl(`DealDetail?id=${deal.id}`)} className="font-semibold text-blue-600 hover:underline">
                              {deal.deal_number || 'Draft Deal'}
                            </Link>
                            {getStatusBadge(deal)}
                            <Badge variant="outline">{deal.loan_product || 'DSCR'}</Badge>
                          </div>
                          <p className="text-gray-600 text-sm">
                            ${(deal.loan_amount || 0).toLocaleString()} • {deal.loan_purpose || 'Purchase'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-8">
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">DSCR</p>
                              <p className={`text-lg font-bold ${
                                (deal.dscr || 0) >= 1.25 ? 'text-green-600' : 
                                (deal.dscr || 0) >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {deal.dscr?.toFixed(2) || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">LTV</p>
                              <p className={`text-lg font-bold ${
                                (deal.ltv || 0) <= 75 ? 'text-green-600' : 
                                (deal.ltv || 0) <= 80 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {deal.ltv?.toFixed(1) || '-'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Risk</p>
                              <p className={`text-lg font-bold ${
                                getRiskScore(deal) >= 80 ? 'text-green-600' : 
                                getRiskScore(deal) >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {getRiskScore(deal)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleConditional(deal)}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Conditions
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeny(deal)}
                              disabled={updateDealMutation.isPending}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(deal)}
                              disabled={updateDealMutation.isPending}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Approved Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedDeals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No approved deals yet</p>
              ) : (
                <div className="space-y-3">
                  {approvedDeals.map(deal => (
                    <div key={deal.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <Link to={createPageUrl(`DealDetail?id=${deal.id}`)} className="font-medium text-green-800 hover:underline">
                          {deal.deal_number}
                        </Link>
                        <p className="text-sm text-green-600">${(deal.loan_amount || 0).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-green-600">Approved</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denied">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Denied Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deniedDeals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No denied deals</p>
              ) : (
                <div className="space-y-3">
                  {deniedDeals.map(deal => (
                    <div key={deal.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <Link to={createPageUrl(`DealDetail?id=${deal.id}`)} className="font-medium text-red-800 hover:underline">
                          {deal.deal_number}
                        </Link>
                        <p className="text-sm text-red-600">${(deal.loan_amount || 0).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-red-600">Denied</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conditional Approval Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conditional Approval - {selectedDeal?.deal_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Conditions / Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter conditions required for final approval..."
                rows={5}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                onClick={submitConditionalApproval}
                disabled={updateDealMutation.isPending}
              >
                {updateDealMutation.isPending ? 'Saving...' : 'Issue Conditional Approval'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}