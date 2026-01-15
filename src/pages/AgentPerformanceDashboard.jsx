import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

const performanceData = [
  { time: '12:00', latency: 320, errors: 0, tokens: 1200 },
  { time: '13:00', latency: 350, errors: 2, tokens: 1450 },
  { time: '14:00', latency: 285, errors: 0, tokens: 1100 },
  { time: '15:00', latency: 420, errors: 5, tokens: 1800 },
  { time: '16:00', latency: 310, errors: 1, tokens: 1300 },
  { time: '17:00', latency: 290, errors: 0, tokens: 1050 }
];

const agentCosts = [
  { agent: 'Document Intelligence', tokens: 2400, cost: '$0.48', usage: 45 },
  { agent: 'DSCR Underwriter', tokens: 1800, cost: '$0.36', usage: 34 },
  { agent: 'Pricing & Lock', tokens: 1200, cost: '$0.24', usage: 23 },
  { agent: 'Loan Officer', tokens: 900, cost: '$0.18', usage: 17 },
  { agent: 'Lead Qualification', tokens: 650, cost: '$0.13', usage: 12 }
];

export default function AgentPerformanceDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor costs, latency, and SLA compliance</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Latency</p>
                  <p className="text-2xl font-bold">335ms</p>
                </div>
                <TrendingDown className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-green-600 mt-2">↓ 12% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Tokens Used</p>
                  <p className="text-2xl font-bold">12.4M</p>
                </div>
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-xs text-orange-600 mt-2">↑ 8% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">LLM Cost</p>
                  <p className="text-2xl font-bold">$24.80</p>
                </div>
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-xs text-red-600 mt-2">↑ 10% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Uptime SLA</p>
                  <p className="text-2xl font-bold">99.82%</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-green-600 mt-2">Target: 99.9%</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="latency" className="w-full">
          <TabsList>
            <TabsTrigger value="latency">Latency Trends</TabsTrigger>
            <TabsTrigger value="costs">Token & Cost Analysis</TabsTrigger>
            <TabsTrigger value="errors">Error Rates</TabsTrigger>
            <TabsTrigger value="sla">SLA Compliance</TabsTrigger>
          </TabsList>

          {/* Latency Trends */}
          <TabsContent value="latency">
            <Card>
              <CardHeader>
                <CardTitle>P95 Latency Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#3b82f6"
                      name="P95 Latency (ms)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token & Cost Analysis */}
          <TabsContent value="costs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Usage by Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentCosts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="tokens" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agentCosts.map((agent, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{agent.agent}</p>
                        <p className="text-xs text-gray-600">{agent.tokens.toLocaleString()} tokens</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{agent.cost}</p>
                        <p className="text-xs text-gray-600">{agent.usage}%</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t font-bold flex justify-between">
                    <span>Total Cost (24h)</span>
                    <span>$24.80</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Error Rates */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Rates Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: 'Errors', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="errors" fill="#ef4444" name="Error Count" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Error Rate: 0.13%</p>
                    <p className="text-sm text-green-700">8 errors out of 6,284 executions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SLA Compliance */}
          <TabsContent value="sla">
            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900 mb-3">Uptime SLA</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Target: 99.9%</span>
                          <span className="text-sm font-bold">99.82%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: '99.82%' }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">8 minutes of downtime (under budget)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-900 mb-3">Latency SLA</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Target: &lt;500ms p95</span>
                          <span className="text-sm font-bold">335ms</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: '67%' }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">Exceeding target by 33%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}