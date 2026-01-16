import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ErrorBoundary from '@/components/ErrorBoundary';
import { ListItemSkeleton } from '@/components/LoadingSkeletons';
import {
  Search,
  Filter,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';

export default function Pipeline() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get user's org membership
  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id;
  
  const { data: deals = [], isLoading, error } = useQuery({
     queryKey: ['deals', orgId],
     queryFn: async () => {
       if (!orgId) return [];
       return await base44.entities.Deal.filter({ org_id: orgId, is_deleted: false });
     },
     enabled: !!orgId,
     retry: 2,
     staleTime: 5 * 60 * 1000,
   });

  const updateStage = useMutation({
    mutationFn: ({ dealId, newStage }) => 
      base44.entities.Deal.update(dealId, { stage: newStage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    }
  });

  const stages = [
    { id: 'inquiry', name: 'Inquiry', color: 'bg-gray-500' },
    { id: 'application', name: 'Application', color: 'bg-blue-500' },
    { id: 'processing', name: 'Processing', color: 'bg-yellow-500' },
    { id: 'underwriting', name: 'Underwriting', color: 'bg-purple-500' },
    { id: 'approved', name: 'Approved', color: 'bg-indigo-500' },
    { id: 'closing', name: 'Closing', color: 'bg-teal-500' },
    { id: 'funded', name: 'Funded', color: 'bg-green-500' },
  ];

  const getDealsByStage = (stageId) => {
    return deals.filter(d => d.stage === stageId);
  };

  const filteredDeals = useMemo(() => {
     return deals.filter(deal => {
       if (!searchTerm) return true;
       const search = searchTerm.toLowerCase();
       return (
         deal.deal_number?.toLowerCase().includes(search) ||
         deal.loan_type?.toLowerCase().includes(search)
       );
     });
   }, [deals, searchTerm]);

  return (
     <ErrorBoundary>
       <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Track deals through the origination process</p>
        </div>
        <Link to={createPageUrl('LoanApplicationWizard')} className="self-start">
          <Button className="bg-blue-600 hover:bg-blue-500 gap-2 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
          Failed to load pipeline. Please try refreshing.
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 md:gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search deals by number or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2 md:w-auto w-full">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        {isLoading ? (
          <div className="flex gap-4 min-w-max">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="w-64 md:w-72 flex-shrink-0 space-y-3">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
                {Array(3).fill(0).map((_, j) => (
                  <ListItemSkeleton key={j} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const stageDeals = getDealsByStage(stage.id);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

              return (
                <div key={stage.id} className="w-64 md:w-72 flex-shrink-0">
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="font-medium text-gray-900">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    ${(stageTotal / 1000).toFixed(0)}K
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <Link 
                      key={deal.id} 
                      to={createPageUrl(`DealDetail?id=${deal.id}`)}
                    >
                      <Card className="border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {deal.deal_number || 'Draft'}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </div>
                          
                          <Badge className="mb-3 text-xs bg-blue-100 text-blue-700">
                            {deal.loan_type?.replace(/_/g, ' ')}
                          </Badge>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span>${(deal.loan_amount || 0).toLocaleString()}</span>
                            </div>
                            {deal.estimated_close_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{new Date(deal.estimated_close_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-400">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
            </div>
            )}
            </div>
            </div>
            </ErrorBoundary>
            );
}