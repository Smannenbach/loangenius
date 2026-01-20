import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { base44 } from '@/api/base44Client';
import { useOrgId, useOrgScopedQuery } from '@/components/useOrgId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, Users, FileText, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Zod schemas for API response validation
const ActivitySchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  timestamp: z.string().optional(),
  description: z.string().optional(),
  deal_id: z.string().optional(),
}).passthrough();

const DashboardActivityResponseSchema = z.object({
  data: z.object({
    activities: z.array(ActivitySchema).default([]),
  }).default({ activities: [] }),
}).passthrough();

const DashboardKPIResponseSchema = z.object({
  data: z.object({
    kpis: z.object({
      deals: z.record(z.unknown()).default({}),
      leads: z.record(z.unknown()).default({}),
    }).default({ deals: {}, leads: {} }),
    recentActivities: z.array(ActivitySchema).optional(),
  }).default({ kpis: { deals: {}, leads: {} } }),
}).passthrough();

const AttentionDealsResponseSchema = z.object({
  data: z.object({
    deals: z.array(z.object({
      id: z.string(),
      deal_number: z.string().optional(),
      loan_amount: z.number().optional(),
      stage: z.string().optional(),
    }).passthrough()).default([]),
  }).default({ deals: [] }),
}).passthrough();

import KPICard from '../components/dashboard/KPICard';
import PipelineChart from '../components/dashboard/PipelineChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import AttentionDeals from '../components/dashboard/AttentionDeals';
import MyTasksWidget from '@/components/dashboard/MyTasksWidget';
import { SkeletonStats } from '@/components/ui/skeleton-cards';

export default function Dashboard() {
  // Use canonical org resolver - handles user, memberships, and auto-creation
  const { orgId, user, isLoading: orgLoading } = useOrgId();

  // Use org-scoped queries - NEVER fall back to list()
  const { data: deals = [] } = useOrgScopedQuery('Deal', { is_deleted: false });
  const { data: leads = [] } = useOrgScopedQuery('Lead', { is_deleted: false });

  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboardKPIs', orgId],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getDashboardKPIs', { org_id: orgId, period: 'month' });
        return DashboardKPIResponseSchema.parse(result);
      } catch (e) {
        console.warn('KPI fetch/validation failed:', e);
        return { data: { kpis: { deals: {}, leads: {} } } };
      }
    },
    enabled: !!orgId,
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboardActivity', orgId],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getDashboardActivity', { org_id: orgId, limit: 10 });
        return DashboardActivityResponseSchema.parse(result);
      } catch (e) {
        console.warn('Activity fetch/validation failed:', e);
        return { data: { activities: [] } };
      }
    },
    enabled: !!orgId,
  });

  const { data: attentionData } = useQuery({
    queryKey: ['dealsNeedingAttention', orgId],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getDealsNeedingAttention', { org_id: orgId, limit: 5 });
        return AttentionDealsResponseSchema.parse(result);
      } catch (e) {
        console.warn('Attention deals fetch/validation failed:', e);
        return { data: { deals: [] } };
      }
    },
    enabled: !!orgId,
  });

  const activities = kpiData?.data?.recentActivities || activityData?.data?.activities || [];
  const attentionDeals = attentionData?.data?.deals || [];
  
  // Calculate KPIs from actual data
  const activeDeals = deals.filter(d => d.status !== 'closed');
  const fundedDeals = deals.filter(d => d.stage === 'funded');
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
  
  // Build pipeline stages from actual deals
  const stageGroups = activeDeals.reduce((acc, d) => {
    const stage = d.stage || 'inquiry';
    if (!acc[stage]) acc[stage] = 0;
    acc[stage]++;
    return acc;
  }, {});
  const pipelineStages = Object.entries(stageGroups).map(([stage, count]) => ({ stage, count }));

  // Show loading state
  const isLoading = orgLoading || (kpisLoading && deals.length === 0 && leads.length === 0);
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <SkeletonStats count={4} />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.full_name || 'User'}!</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button asChild data-testid="cta:Dashboard:NewDeal">
          <Link to={createPageUrl('LoanApplicationWizard')} className="gap-2">
            <Plus className="h-5 w-5" />
            New Deal
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Active Deals"
          value={activeDeals.length}
          trend={activeDeals.length > 0 ? 'up' : undefined}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Pipeline Value"
          value={totalPipelineValue}
          trend={totalPipelineValue > 0 ? 'up' : undefined}
          isCurrency={true}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Total Leads"
          value={leads.filter(l => !l.is_deleted).length}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Funded Deals"
          value={fundedDeals.length}
          trend={fundedDeals.length > 0 ? 'up' : undefined}
          isLoading={kpisLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link to={createPageUrl('Leads')} className="block">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Leads</p>
                  <p className="text-xs text-gray-500">View pipeline</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('Pipeline')} className="block">
          <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pipeline</p>
                  <p className="text-xs text-gray-500">Track deals</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('QuoteGenerator')} className="block">
          <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Quotes</p>
                  <p className="text-xs text-gray-500">Generate quote</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('BusinessPurposeApplication')} className="block">
          <Card className="hover:border-orange-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New App</p>
                  <p className="text-xs text-gray-500">Business purpose</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Chart */}
          <PipelineChart data={pipelineStages} />

          {/* Recent Activity */}
          <ActivityFeed activities={activities} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Tasks */}
          <MyTasksWidget orgId={orgId} />

          {/* Deals Needing Attention */}
          <AttentionDeals deals={attentionDeals} />
        </div>
      </div>
    </div>
  );
}