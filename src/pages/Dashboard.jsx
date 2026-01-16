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
import MyTasksWidget from '@/components/dashboard/MyTasksWidget';

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

  // Fetch deals directly for reliable KPIs
  const { data: deals = [] } = useQuery({
    queryKey: ['dashboardDeals', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          return await base44.entities.Deal.filter({ org_id: orgId });
        }
        return await base44.entities.Deal.list();
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  // Fetch leads directly
  const { data: leads = [] } = useQuery({
    queryKey: ['dashboardLeads', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          return await base44.entities.Lead.filter({ org_id: orgId });
        }
        return await base44.entities.Lead.list();
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  const { data: kpiData, isLoading: kpisLoading, error: kpiError } = useQuery({
    queryKey: ['dashboardKPIs', orgId],
    queryFn: async () => {
      try {
        return await base44.functions.invoke('getDashboardKPIs', { org_id: orgId, period: 'month' });
      } catch (e) {
        // Return empty data if function fails
        return { data: { kpis: { deals: {}, leads: {} } } };
      }
    },
    enabled: !!orgId,
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboardActivity', orgId],
    queryFn: async () => {
      try {
        return await base44.functions.invoke('getDashboardActivity', { org_id: orgId, limit: 10 });
      } catch (e) {
        return { data: { activities: [] } };
      }
    },
    enabled: !!orgId,
  });

  const { data: attentionData } = useQuery({
    queryKey: ['dealsNeedingAttention', orgId],
    queryFn: async () => {
      try {
        return await base44.functions.invoke('getDealsNeedingAttention', { org_id: orgId, limit: 5 });
      } catch (e) {
        return { data: { deals: [] } };
      }
    },
    enabled: !!orgId,
  });

  const kpis = kpiData?.data?.kpis || {};
  const activities = kpiData?.data?.recentActivities || activityData?.data?.activities || [];
  const attentionDeals = attentionData?.data?.deals || [];
  
  // Calculate KPIs from actual data
  const activeDeals = deals.filter(d => !d.is_deleted && d.status !== 'closed');
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

  // Show loading state only when everything is loading
  const isLoading = kpisLoading && deals.length === 0 && leads.length === 0;
  if (isLoading) {
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