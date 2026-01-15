import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KPICard from '@/components/analytics/KPICard';
import PipelineChart from '@/components/analytics/PipelineChart';
import { DollarSign, Percent, TrendingUp, Clock, Download } from 'lucide-react';

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState('30');

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboardKPIs', timePeriod],
    queryFn: () => base44.functions.invoke('getDashboardKPIs', { time_period: timePeriod })
  });

  const { data: pipelineReport } = useQuery({
    queryKey: ['pipelineReport'],
    queryFn: () => base44.functions.invoke('generatePipelineReport', {})
  });

  const { data: productionReport } = useQuery({
    queryKey: ['productionReport', timePeriod],
    queryFn: () => base44.functions.invoke('generateProductionReport', { time_period: timePeriod })
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-gray-600 mt-1">Business intelligence and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isLoading && kpis?.data?.kpis && (
            <>
              <KPICard
                title="Pipeline Value"
                value={`$${(kpis.data.kpis.total_pipeline_value / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                color="blue"
              />
              <KPICard
                title="Conversion Rate"
                value={`${kpis.data.kpis.conversion_rate}%`}
                icon={Percent}
                color="green"
              />
              <KPICard
                title="Avg Loan Amount"
                value={`$${(kpis.data.kpis.avg_loan_amount / 1000).toFixed(0)}K`}
                icon={TrendingUp}
                color="purple"
              />
              <KPICard
                title="Avg Days to Close"
                value={kpis.data.kpis.avg_days_to_close}
                unit="days"
                icon={Clock}
                color="orange"
              />
            </>
          )}
        </div>

        {/* Charts & Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {kpis?.data?.stage_breakdown && (
              <PipelineChart data={kpis.data.stage_breakdown} />
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kpis?.data?.kpis && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Deals</span>
                    <span className="font-medium">{kpis.data.kpis.total_deals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-medium text-green-600">{kpis.data.kpis.completed_deals}</span>
                  </div>
                  <div className="border-t pt-3 mt-3 flex justify-between">
                    <span className="text-gray-600">Production Value</span>
                    <span className="font-medium">${(kpis.data.kpis.completed_value / 1000000).toFixed(1)}M</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Report</CardTitle>
              </CardHeader>
              <CardContent>
                {pipelineReport?.data?.data ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 px-2 font-medium">Deal</th>
                          <th className="text-left py-2 px-2 font-medium">Product</th>
                          <th className="text-right py-2 px-2 font-medium">Amount</th>
                          <th className="text-left py-2 px-2 font-medium">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineReport.data.data.slice(0, 10).map(deal => (
                          <tr key={deal.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">{deal.deal_name}</td>
                            <td className="py-2 px-2">{deal.loan_product}</td>
                            <td className="text-right py-2 px-2 font-medium">${(deal.loan_amount / 1000).toFixed(0)}K</td>
                            <td className="py-2 px-2">{deal.days_in_pipeline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600">No data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production">
            <Card>
              <CardHeader>
                <CardTitle>Production Report</CardTitle>
              </CardHeader>
              <CardContent>
                {productionReport?.data?.data ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">Completed Loans</p>
                      <p className="text-2xl font-bold text-blue-600">{productionReport.data.total_completed}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2 px-2 font-medium">Deal</th>
                            <th className="text-right py-2 px-2 font-medium">Amount</th>
                            <th className="text-right py-2 px-2 font-medium">Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReport.data.data.slice(0, 10).map(deal => (
                            <tr key={deal.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-2">{deal.deal_name}</td>
                              <td className="text-right py-2 px-2 font-medium">${(deal.loan_amount / 1000).toFixed(0)}K</td>
                              <td className="text-right py-2 px-2">{deal.days_to_close}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No completed loans</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}