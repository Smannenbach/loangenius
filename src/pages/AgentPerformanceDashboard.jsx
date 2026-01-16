import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckCircle, Clock, Zap, Target, Activity } from 'lucide-react';

export default function AgentPerformanceDashboard() {
  const agentMetrics = [
    { name: 'Document Intelligence', successRate: 98.5, avgLatency: 320, runs: 1245, errors: 18 },
    { name: 'DSCR Underwriter', successRate: 97.2, avgLatency: 850, runs: 892, errors: 25 },
    { name: 'Lead Qualification', successRate: 99.1, avgLatency: 120, runs: 2103, errors: 19 },
    { name: 'Pricing & Lock', successRate: 99.8, avgLatency: 320, runs: 756, errors: 2 },
    { name: 'Fraud Detection', successRate: 96.8, avgLatency: 450, runs: 1024, errors: 33 },
    { name: 'Loan Officer', successRate: 98.9, avgLatency: 290, runs: 1567, errors: 17 },
    { name: 'Loan Processor', successRate: 97.5, avgLatency: 210, runs: 934, errors: 23 },
    { name: 'Document QC', successRate: 98.1, avgLatency: 320, runs: 1189, errors: 23 },
  ];

  const performanceTrend = [
    { date: '1/10', successRate: 97.2, avgLatency: 425 },
    { date: '1/11', successRate: 97.8, avgLatency: 412 },
    { date: '1/12', successRate: 98.1, avgLatency: 398 },
    { date: '1/13', successRate: 98.3, avgLatency: 385 },
    { date: '1/14', successRate: 98.6, avgLatency: 372 },
    { date: '1/15', successRate: 98.8, avgLatency: 365 },
    { date: '1/16', successRate: 98.5, avgLatency: 358 },
  ];

  const runVolume = [
    { date: '1/10', runs: 412 },
    { date: '1/11', runs: 438 },
    { date: '1/12', runs: 501 },
    { date: '1/13', runs: 489 },
    { date: '1/14', runs: 523 },
    { date: '1/15', runs: 567 },
    { date: '1/16', runs: 592 },
  ];

  const totalRuns = agentMetrics.reduce((sum, a) => sum + a.runs, 0);
  const avgSuccessRate = (agentMetrics.reduce((sum, a) => sum + a.successRate, 0) / agentMetrics.length).toFixed(1);
  const avgLatency = (agentMetrics.reduce((sum, a) => sum + a.avgLatency, 0) / agentMetrics.length).toFixed(0);
  const totalErrors = agentMetrics.reduce((sum, a) => sum + a.errors, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          Agent Performance Analytics
        </h1>
        <p className="text-gray-500 mt-1">Real-time metrics and performance tracking for all AI agents</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Runs (7d)</p>
                <p className="text-2xl font-bold text-gray-900">{totalRuns.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{avgSuccessRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Latency</p>
                <p className="text-2xl font-bold text-purple-600">{avgLatency}ms</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Errors</p>
                <p className="text-2xl font-bold text-orange-600">{totalErrors}</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="agents">Agent Metrics</TabsTrigger>
          <TabsTrigger value="volume">Run Volume</TabsTrigger>
        </TabsList>

        {/* Performance Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[95, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Latency Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgLatency" stroke="#3b82f6" name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Metrics */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentMetrics.map((agent) => (
                  <div key={agent.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <Badge className={agent.successRate >= 98 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {agent.successRate}% Success
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Runs</p>
                        <p className="font-bold text-gray-900">{agent.runs.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Latency</p>
                        <p className="font-bold text-gray-900">{agent.avgLatency}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Errors</p>
                        <p className="font-bold text-orange-600">{agent.errors}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Error Rate</p>
                        <p className="font-bold text-gray-900">{((agent.errors / agent.runs) * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Run Volume */}
        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle>Daily Run Volume (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={runVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="runs" fill="#3b82f6" name="Agent Runs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}