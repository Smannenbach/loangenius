import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Zap, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner';

const AGENTS = [
  { id: 'document-intelligence-agent', name: 'Document Intelligence', status: 'active', latency: '320ms' },
  { id: 'dscr-underwriter', name: 'DSCR Underwriter', status: 'active', latency: '850ms' },
  { id: 'credit-aus-agent', name: 'Credit/AUS', status: 'active', latency: '250ms' },
  { id: 'portfolio-dscr-aggregator', name: 'Portfolio Aggregator', status: 'active', latency: '180ms' },
  { id: 'pricing-rate-lock-agent', name: 'Pricing & Lock', status: 'active', latency: '320ms' },
  { id: 'loan-officer-agent', name: 'Loan Officer', status: 'active', latency: '290ms' },
  { id: 'workflow-orchestrator', name: 'Orchestrator', status: 'active', latency: '450ms' },
  { id: 'connector-agent', name: 'Connectors', status: 'active', latency: '1200ms' },
  { id: 'lead-qualification-agent', name: 'Lead Qualification', status: 'active', latency: '120ms' },
  { id: 'broker-channel-manager', name: 'Broker Channel', status: 'active', latency: '95ms' },
  { id: 'fraud-detection-agent', name: 'Fraud Detection', status: 'active', latency: '450ms' },
  { id: 'loan-processor-agent', name: 'Loan Processor', status: 'active', latency: '210ms' },
  { id: 'document-qc-agent', name: 'Document QC', status: 'active', latency: '320ms' },
  { id: 'closing-title-agent', name: 'Closing/Title', status: 'active', latency: '380ms' },
  { id: 'accounting-agent', name: 'Accounting', status: 'active', latency: '250ms' },
  { id: 'servicing-agent', name: 'Servicing', status: 'active', latency: '310ms' },
  { id: 'surveillance-analytics-agent', name: 'Surveillance', status: 'active', latency: '420ms' },
  { id: 'exceptions-hitl-agent', name: 'Exceptions/HITL', status: 'active', latency: '180ms' },
  { id: 'compliance-audit-agent', name: 'Compliance/Audit', status: 'active', latency: '520ms' },
  { id: 'admin-observability-agent', name: 'Admin/Observability', status: 'active', latency: '150ms' },
  { id: 'pricing-compliance-agent', name: 'Pricing Compliance', status: 'active', latency: '380ms' },
  { id: 'hedging-investor-agent', name: 'Hedging/Investor', status: 'active', latency: '620ms' }
];

export default function AdminAgents() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);

  const { data: agentMetrics } = useQuery({
    queryKey: ['agent-metrics'],
    queryFn: async () => {
      // Simulate metrics fetch
      return {
        agents: AGENTS.map(a => ({
          ...a,
          uptime: 99.8 + Math.random() * 0.2,
          error_rate: Math.random() * 0.05,
          run_count: Math.floor(Math.random() * 500) + 100
        }))
      };
    },
    staleTime: 30000
  });

  const metrics = agentMetrics?.agents || AGENTS;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">LoanGenius Agent Management</h1>
          <p className="text-gray-600 mt-1">Monitor and configure 22 agents powering the DSCR loan origination platform</p>
        </div>

        {/* Agent Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.length}</div>
              <p className="text-gray-600 text-sm">Total Agents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{metrics.filter(a => a.status === 'active').length}</div>
              <p className="text-gray-600 text-sm">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">99.8%</div>
              <p className="text-gray-600 text-sm">Avg Uptime</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">450ms</div>
              <p className="text-gray-600 text-sm">Avg Latency</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="agents" className="w-full">
          <TabsList>
            <TabsTrigger value="agents">All Agents</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="alerts">Alerts & SLAs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* All Agents Tab */}
          <TabsContent value="agents">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Agent List */}
              <Card>
                <CardHeader>
                  <CardTitle>Agent Registry</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {metrics.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedAgent.id === agent.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{agent.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{agent.latency}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedAgent.name}</span>
                    <Badge>{selectedAgent.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Agent ID</p>
                    <p className="text-sm font-mono text-gray-800">{selectedAgent.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Avg Latency</p>
                      <p className="text-lg font-bold">{selectedAgent.latency}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Uptime</p>
                      <p className="text-lg font-bold text-green-600">99.8%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Run Count (24h)</p>
                      <p className="text-lg font-bold">245</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Error Rate</p>
                      <p className="text-lg font-bold text-green-600">0.02%</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <Button className="w-full" variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" /> View Metrics
                    </Button>
                    <Button className="w-full" variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" /> Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows">
            <Card>
              <CardHeader>
                <CardTitle>Agent Orchestration Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2">DSCR End-to-End</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge>Document Intelligence</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>DSCR Underwriter</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Pricing & Lock</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Loan Officer</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2">Lead Scoring & Routing</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge>Lead Qualification</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Credit/AUS</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Broker Channel</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2">Compliance & Closing</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge>Fraud Detection</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Compliance/Audit</Badge>
                      <Zap className="h-4 w-4" />
                      <Badge>Closing/Title</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>SLA Monitoring & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-900">All agents within SLA</p>
                      <p className="text-green-700">All 22 agents operating normally</p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <p className="font-semibold text-gray-900 mb-2">Alert Thresholds</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Latency p99 {'>'} 2000ms: Warning</li>
                      <li>• Error rate {'>'} 1%: Critical</li>
                      <li>• Uptime {'<'} 99.5%: Warning</li>
                      <li>• Response time increase {'>'} 30%: Info</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Global Agent Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Default Mode</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>Production</option>
                      <option>Staging</option>
                      <option>Sandbox</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Minimum Confidence Threshold</label>
                    <input type="number" min="0" max="1" step="0.05" defaultValue="0.70" className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Orchestrator Timeout (seconds)</label>
                    <input type="number" min="30" max="300" step="10" defaultValue="120" className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm font-semibold">Enable audit logging for all agents</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm font-semibold">Enable real-time metrics collection</span>
                    </label>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={() => { toast.success('Settings saved successfully!'); }}>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}