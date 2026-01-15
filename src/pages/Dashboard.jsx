import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
} from 'lucide-react';

export default function Dashboard() {
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.filter({ is_deleted: false }),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.filter({ is_deleted: false }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.filter({ status: 'pending' }),
  });

  // Calculate metrics
  const totalPipeline = deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
  const activeDeals = deals.filter(d => !['funded', 'denied', 'withdrawn'].includes(d.status)).length;
  const fundedThisMonth = deals.filter(d => {
    if (d.status !== 'funded' || !d.actual_close_date) return false;
    const closeDate = new Date(d.actual_close_date);
    const now = new Date();
    return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
  }).length;
  const newLeads = leads.filter(l => l.status === 'new').length;

  const stats = [
    {
      title: 'Pipeline Value',
      value: `$${(totalPipeline / 1000000).toFixed(1)}M`,
      change: '+12%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue',
    },
    {
      title: 'Active Deals',
      value: activeDeals.toString(),
      change: '+3',
      trend: 'up',
      icon: FileText,
      color: 'emerald',
    },
    {
      title: 'Funded This Month',
      value: fundedThisMonth.toString(),
      change: '+2',
      trend: 'up',
      icon: CheckCircle2,
      color: 'violet',
    },
    {
      title: 'New Leads',
      value: newLeads.toString(),
      change: '+8',
      trend: 'up',
      icon: Users,
      color: 'amber',
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-700',
      application: 'bg-blue-100 text-blue-700',
      processing: 'bg-yellow-100 text-yellow-700',
      underwriting: 'bg-purple-100 text-purple-700',
      conditional_approval: 'bg-indigo-100 text-indigo-700',
      clear_to_close: 'bg-emerald-100 text-emerald-700',
      closing: 'bg-teal-100 text-teal-700',
      funded: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const recentDeals = deals.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back. Here's your pipeline overview.</p>
        </div>
        <Link to={createPageUrl('NewDeal')}>
          <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals */}
        <Card className="lg:col-span-2 border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Deals</CardTitle>
            <Link to={createPageUrl('Deals')}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No deals yet</p>
                  <Link to={createPageUrl('NewDeal')}>
                    <Button variant="link" className="text-blue-600">Create your first deal</Button>
                  </Link>
                </div>
              ) : (
                recentDeals.map((deal) => (
                  <Link 
                    key={deal.id} 
                    to={createPageUrl(`DealDetail?id=${deal.id}`)}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900">{deal.deal_number || 'Draft'}</p>
                          <Badge className={getStatusColor(deal.status)}>
                            {deal.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {deal.loan_type?.replace(/_/g, ' ')} • ${(deal.loan_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks & Alerts */}
        <Card className="border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Tasks & Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>All caught up!</p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    {task.priority === 'urgent' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to={createPageUrl('NewDeal')}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm">New Deal</span>
              </Button>
            </Link>
            <Link to={createPageUrl('Leads')}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300">
                <Users className="h-5 w-5 text-emerald-600" />
                <span className="text-sm">Add Lead</span>
              </Button>
            </Link>
            <Link to={createPageUrl('Calculator')}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-violet-50 hover:border-violet-300">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                <span className="text-sm">Calculator</span>
              </Button>
            </Link>
            <Link to={createPageUrl('QuoteGenerator')}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-amber-50 hover:border-amber-300">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <span className="text-sm">Generate Quote</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}