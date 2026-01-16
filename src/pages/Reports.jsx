import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Download, Eye, TrendingUp, DollarSign, Users, Zap, FileText, BarChart3 } from 'lucide-react';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('PIPELINE');
  const [activeTab, setActiveTab] = useState('analytics');
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

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboardKPIs', orgId],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getDashboardKPIs', { org_id: orgId });
        return result;
      } catch (e) {
        try {
          const deals = await base44.entities.Deal.list();
          const leads = await base44.entities.Lead.list();
          const activeDeals = deals.filter(d => d.status === 'active');
          const fundedDeals = deals.filter(d => d.stage === 'funded');
          const totalAmount = deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
          const convertedLeads = leads.filter(l => l.status === 'converted').length;
          
          return { 
            data: { 
              kpis: { 
                deals: { total: deals.length, active: activeDeals.length, funded: fundedDeals.length, totalAmount }, 
                leads: { total: leads.length, new: leads.filter(l => l.status === 'new').length, conversionRate: leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0, converted: convertedLeads }, 
                stageDistribution: deals.reduce((acc, d) => {
                  const stage = d.stage || 'unknown';
                  acc[stage] = (acc[stage] || 0) + 1;
                  return acc;
                }, {})
              } 
            } 
          };
        } catch {
          return { data: { kpis: { deals: { total: 0, active: 0, funded: 0, totalAmount: 0 }, leads: { total: 0, new: 0, conversionRate: 0, converted: 0 }, stageDistribution: {} } } };
        }
      }
    },
    enabled: true,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      try {
        return await base44.entities.ReportDefinition.filter({ is_system: true });
      } catch (e) {
        return [
          { id: '1', name: 'Pipeline Report', description: 'View all deals in your pipeline', report_type: 'PIPELINE' },
          { id: '2', name: 'Production Report', description: 'Monthly production metrics', report_type: 'PRODUCTION' },
          { id: '3', name: 'Conversion Funnel', description: 'Lead to close conversion rates', report_type: 'CONVERSION' },
        ];
      }
    }
  });

  const data = kpis?.data;
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const filteredReports = reports.filter(r => !selectedCategory || selectedCategory === 'CUSTOM' || r.report_type === selectedCategory);
  const categories = ['PIPELINE', 'PRODUCTION', 'SCORECARD', 'LENDER', 'CONVERSION', 'CUSTOM'];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">View analytics and generate reports</p>
        </div>
        <Link to={createPageUrl('ReportBuilder')}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {kpisLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                    <Zap className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.kpis?.deals?.total || 0}</div>
                    <p className="text-xs text-gray-500">{data?.kpis?.deals?.active || 0} active</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Funded</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${((data?.kpis?.deals?.totalAmount || 0) / 1000000).toFixed(1)}M</div>
                    <p className="text-xs text-gray-500">{data?.kpis?.deals?.funded || 0} closed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                    <Users className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.kpis?.leads?.total || 0}</div>
                    <p className="text-xs text-gray-500">{data?.kpis?.leads?.new || 0} new</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.kpis?.leads?.conversionRate || 0}%</div>
                    <p className="text-xs text-gray-500">{data?.kpis?.leads?.converted || 0} converted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Stage Distribution</CardTitle>
                    <CardDescription>Current deals by stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(data?.kpis?.stageDistribution || {}).map(([name, value]) => ({
                            name: name.charAt(0).toUpperCase() + name.slice(1),
                            value,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deal Performance</CardTitle>
                    <CardDescription>Loan volume and funding trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                        <span>Total Deals</span>
                        <span className="text-2xl font-bold">{data?.kpis?.deals?.total || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                        <span>Total Loan Amount</span>
                        <span className="text-2xl font-bold">${((data?.kpis?.deals?.totalAmount || 0) / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                        <span>Average Deal Size</span>
                        <span className="text-2xl font-bold">${((data?.kpis?.deals?.totalAmount || 0) / (data?.kpis?.deals?.total || 1) / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Category Navigation */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
                size="sm"
              >
                {cat.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {/* Reports Grid */}
          {reportsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading reports...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}

          {!reportsLoading && filteredReports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No reports in this category</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({ report }) {
  const mutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateReport', {
      org_id: 'default',
      report_id: report.id,
      filters: {}
    })
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{report.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{report.description}</p>
        
        <div className="flex gap-2">
          <Link to={createPageUrl(`ReportViewer?id=${report.id}`)}>
            <Button size="sm" className="gap-2" variant="outline">
              <Eye className="h-4 w-4" />
              View
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Download className="h-4 w-4" />
            {mutation.isPending ? 'Running...' : 'Run'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}