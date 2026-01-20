import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, FileText, Users, DollarSign } from 'lucide-react';

export default function ExecutiveDashboard() {
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.filter({})
  });

  const fundedDeals = deals.filter(d => d.stage === 'FUNDED');
  const fundedVolume = fundedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
  const avgDaysToClose = fundedDeals.length > 0 
    ? Math.floor(fundedDeals.reduce((sum, d) => sum + (d.loan_term_months || 0), 0) / fundedDeals.length / 30)
    : 0;

  const monthlyData = generateMonthlyData(deals);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Executive Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="MTD Funded Volume"
          value={`$${(fundedVolume / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          trend="+12.5%"
        />
        <KPICard
          title="Funded Count (MTD)"
          value={fundedDeals.length}
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          trend="+8.2%"
        />
        <KPICard
          title="Pipeline Value"
          value={`$${(deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0) / 1000000).toFixed(1)}M`}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          trend="+5.3%"
        />
        <KPICard
          title="Avg Days to Close"
          value={avgDaysToClose}
          icon={<Users className="h-6 w-6 text-orange-600" />}
          trend="-2.1 days"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Funded Volume (12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 LOs by Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLOLeaderboard(deals)}>
                <CartesianGrid />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deals.slice(0, 5).map((deal) => (
              <div key={deal.id} className="flex justify-between items-center p-3 border rounded hover:bg-slate-50">
                <div>
                  <p className="font-medium">{deal.deal_number}</p>
                  <p className="text-sm text-gray-600">Status: {deal.stage}</p>
                </div>
                <p className="font-medium">${(deal.loan_amount / 1000).toFixed(0)}k</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, icon, trend }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          {icon}
        </div>
        <p className="text-sm text-green-600 font-medium">{trend}</p>
      </CardContent>
    </Card>
  );
}

// FIX: Generate actual monthly data from real deals instead of random
function generateMonthlyData(deals) {
  const monthlyVolumes = {};
  
  // Initialize last 12 months with 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyVolumes[key] = { month: d.toLocaleString('default', { month: 'short' }), volume: 0 };
  }
  
  // Aggregate funded deals by month
  deals.filter(d => d.stage === 'funded' || d.stage === 'FUNDED').forEach(deal => {
    if (deal.created_date && deal.loan_amount) {
      const dealDate = new Date(deal.created_date);
      const key = `${dealDate.getFullYear()}-${String(dealDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyVolumes[key]) {
        monthlyVolumes[key].volume += deal.loan_amount;
      }
    }
  });
  
  // Convert to sorted array
  return Object.entries(monthlyVolumes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, data]) => data);
}

function getLOLeaderboard(deals) {
  const byLO = {};
  deals.forEach(deal => {
    const lo = deal.assigned_to_user_id || 'Unassigned';
    byLO[lo] = (byLO[lo] || 0) + (deal.loan_amount || 0);
  });
  return Object.entries(byLO)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);
}