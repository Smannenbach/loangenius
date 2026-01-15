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

  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboardKPIs'],
    queryFn: () => base44.functions.invoke('getDashboardKPIs', { period: 'month' }),
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboardActivity'],
    queryFn: () => base44.functions.invoke('getDashboardActivity', { limit: 10 }),
  });

  const { data: attentionData } = useQuery({
    queryKey: ['dealsNeedingAttention'],
    queryFn: () => base44.functions.invoke('getDealsNeedingAttention', { limit: 5 }),
  });

  const kpis = kpiData?.data?.kpis || {};
  const activities = activityData?.data?.activities || [];
  const attentionDeals = attentionData?.data?.deals || [];
  const pipelineStages = kpiData?.data?.pipeline_by_stage || [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.full_name || 'User'}!</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to={createPageUrl('NewDeal')}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-5 w-5" />
            New Deal
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Active Deals"
          value={kpis.active_deals?.current || 0}
          changePercent={kpis.active_deals?.change_pct}
          trend={kpis.active_deals?.trend}
        />
        <KPICard
          title="Pipeline Value"
          value={kpis.pipeline_value?.current || 0}
          changePercent={kpis.pipeline_value?.change_pct}
          trend={kpis.pipeline_value?.trend}
          unit="Total"
        />
        <KPICard
          title="Closing This Month"
          value={kpis.closing_this_month?.count || 0}
          target={kpis.closing_this_month?.target}
        />
        <KPICard
          title="Funded This Month"
          value={kpis.funded_this_month?.volume || 0}
          changePercent={kpis.funded_this_month?.change_pct}
          trend={kpis.funded_this_month?.trend}
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">My Tasks</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No tasks assigned</p>
            </div>
          </div>

          {/* Deals Needing Attention */}
          <AttentionDeals deals={attentionDeals} />
        </div>
      </div>
    </div>
  );
}