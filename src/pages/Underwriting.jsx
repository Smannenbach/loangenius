import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, CheckCircle2, AlertTriangle, Brain, FileText, TrendingUp } from 'lucide-react';

export default function Underwriting() {
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      try {
        return await base44.entities.Deal.filter({ is_deleted: false });
      } catch {
        return await base44.entities.Deal.list();
      }
    },
  });

  const underwritingDeals = deals.filter(d => 
    ['underwriting', 'conditional_approval'].includes(d.stage) || 
    ['underwriting', 'conditional_approval'].includes(d.status)
  );

  const getStatusBadge = (deal) => {
    const dscr = deal.dscr || deal.dscr_ratio || 0;
    const ltv = deal.ltv || deal.ltv_ratio || 0;
    if (dscr >= 1.25 && ltv <= 75) {
      return <Badge className="bg-green-100 text-green-700">Pre-Approved</Badge>;
    } else if (dscr >= 1.0) {
      return <Badge className="bg-yellow-100 text-yellow-700">Review Required</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">High Risk</Badge>;
  };

  const stats = [
    { label: 'Pending Review', value: underwritingDeals.filter(d => d.stage === 'underwriting' || d.status === 'underwriting').length, icon: Clock, color: 'text-gray-600' },
    { label: 'Conditional', value: underwritingDeals.filter(d => d.stage === 'conditional_approval' || d.status === 'conditional_approval').length, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Approved Today', value: deals.filter(d => d.stage === 'approved' || d.status === 'clear_to_close').length, icon: CheckCircle2, color: 'text-green-600' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Scale className="h-7 w-7 text-purple-600" />
          AI Underwriting
          <Badge className="bg-purple-100 text-purple-700">AI Powered</Badge>
        </h1>
        <p className="text-gray-500 mt-1">Automated loan analysis and risk assessment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis Queue */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Analysis Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {underwritingDeals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Scale className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p>No deals in underwriting</p>
            </div>
          ) : (
            <div className="space-y-4">
              {underwritingDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">{deal.deal_number}</p>
                      {getStatusBadge(deal)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      ${(deal.loan_amount || 0).toLocaleString()} • {deal.loan_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 mr-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">DSCR</p>
                      <p className={`font-semibold ${
                        (deal.dscr || deal.dscr_ratio) >= 1.25 ? 'text-green-600' : 
                        (deal.dscr || deal.dscr_ratio) >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(deal.dscr || deal.dscr_ratio)?.toFixed(2) || '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">LTV</p>
                      <p className={`font-semibold ${
                        (deal.ltv || deal.ltv_ratio) <= 75 ? 'text-green-600' : 
                        (deal.ltv || deal.ltv_ratio) <= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(deal.ltv || deal.ltv_ratio)?.toFixed(1) || '-'}%
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}