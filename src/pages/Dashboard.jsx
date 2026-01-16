import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import KPICard from '../components/dashboard/KPICard';
import PipelineChart from '../components/dashboard/PipelineChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import AttentionDeals from '../components/dashboard/AttentionDeals';

export default function Dashboard() {
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

  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboardKPIs', orgId],
    queryFn: () => base44.functions.invoke('getDashboardKPIs', { org_id: orgId, period: 'month' }),
    enabled: !!orgId,
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboardActivity', orgId],
    queryFn: () => base44.functions.invoke('getDashboardActivity', { org_id: orgId, limit: 10 }),
    enabled: !!orgId,
  });

  const { data: attentionData } = useQuery({
    queryKey: ['dealsNeedingAttention', orgId],
    queryFn: () => base44.functions.invoke('getDealsNeedingAttention', { org_id: orgId, limit: 5 }),
    enabled: !!orgId,
  });

  const kpis = kpiData?.data?.kpis || {};
  const activities = kpiData?.data?.recentActivities || activityData?.data?.activities || [];
  const attentionDeals = attentionData?.data?.deals || [];
  const pipelineStages = kpis?.stageDistribution ? 
    Object.entries(kpis.stageDistribution).map(([stage, count]) => ({ stage, count })) : [];

  // Show loading state for KPIs
  if (kpisLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
        <Link 
          to={createPageUrl('LoanApplicationWizard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Deal
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Active Deals"
          value={kpis.deals?.active || kpis.active_deals?.current || 0}
          changePercent={kpis.active_deals?.change_pct}
          trend={kpis.active_deals?.trend}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Pipeline Value"
          value={kpis.deals?.totalAmount || kpis.pipeline_value?.current || 0}
          changePercent={kpis.pipeline_value?.change_pct}
          trend={kpis.pipeline_value?.trend}
          isCurrency={true}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Total Leads"
          value={kpis.leads?.total || kpis.closing_this_month?.count || 0}
          target={kpis.closing_this_month?.target}
          isLoading={kpisLoading}
        />
        <KPICard
          title="Funded Deals"
          value={kpis.deals?.funded || kpis.funded_this_month?.volume || 0}
          changePercent={kpis.funded_this_month?.change_pct}
          trend={kpis.funded_this_month?.trend}
          isLoading={kpisLoading}
        />
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