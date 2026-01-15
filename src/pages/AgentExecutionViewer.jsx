import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2, Zap, TrendingUp } from 'lucide-react';

export default function AgentExecutionViewer() {
  const [execution, setExecution] = useState(null);
  const [agentSteps, setAgentSteps] = useState([]);

  // Mock real-time execution data
  useEffect(() => {
    const mockExecution = {
      deal_id: 'DL-202501-0042',
      workflow: 'DSCR End-to-End',
      status: 'in_progress',
      started_at: new Date(Date.now() - 45000),
      current_agent: 'DSCR Underwriter',
      progress: 65,
      agents_completed: [
        { name: 'Document Intelligence', status: 'completed', confidence: 0.94, duration: '2.3s' },
        { name: 'Lead Qualification', status: 'completed', confidence: 0.88, duration: '1.1s' }
      ],
      agents_running: [
        { name: 'DSCR Underwriter', status: 'running', progress: 45, confidence: 0.0, duration: '1.2s' }
      ],
      agents_pending: [
        { name: 'Pricing & Lock', status: 'pending' },
        { name: 'Loan Officer', status: 'pending' }
      ]
    };
    setExecution(mockExecution);

    const steps = [
      { id: 1, agent: 'Document Intelligence', step: 'Extracting rental income...', status: 'completed', confidence: 0.94 },
      { id: 2, agent: 'Document Intelligence', step: 'Classifying documents...', status: 'completed', confidence: 0.98 },
      { id: 3, agent: 'Lead Qualification', step: 'Scoring borrower credit...', status: 'completed', confidence: 0.88 },
      { id: 4, agent: 'DSCR Underwriter', step: 'Calculating NOI (Net Operating Income)...', status: 'running', confidence: 0.0 },
      { id: 5, agent: 'DSCR Underwriter', step: 'Computing DSCR ratio...', status: 'running', confidence: 0.0 }
    ];
    setAgentSteps(steps);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  if (!execution) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Agent Execution Viewer</h1>
          <p className="text-gray-600 mt-1">Real-time visibility into agent workflows and decision-making</p>
        </div>

        {/* Execution Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Deal ID</p>
                <p className="text-xl font-bold">{execution.deal_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Workflow</p>
                <p className="text-xl font-bold">{execution.workflow}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Agent</p>
                <p className="text-xl font-bold flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  {execution.current_agent}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${execution.progress}%` }}></div>
                  </div>
                  <p className="text-sm font-bold mt-1">{execution.progress}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList>
            <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
            <TabsTrigger value="agents">Agent Status</TabsTrigger>
            <TabsTrigger value="decisions">Decisions & Confidence</TabsTrigger>
          </TabsList>

          {/* Execution Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentSteps.map((step, idx) => (
                    <div key={step.id} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          {getStatusIcon(step.status)}
                        </div>
                        {idx < agentSteps.length - 1 && (
                          <div className="mt-1 h-8 w-0.5 bg-gray-200" />
                        )}
                      </div>

                      {/* Step details */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{step.step}</p>
                            <p className="text-sm text-gray-600">{step.agent}</p>
                          </div>
                          {step.confidence > 0 && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {(step.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Status */}
          <TabsContent value="agents">
            <div className="space-y-4">
              {/* Completed Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {execution.agents_completed.map((agent, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-semibold text-green-900">{agent.name}</p>
                          <p className="text-sm text-green-700">Completed in {agent.duration}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">{(agent.confidence * 100).toFixed(0)}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Running Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    Running
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {execution.agents_running.map((agent, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="font-semibold text-blue-900">{agent.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${agent.progress}%` }}></div>
                        </div>
                        <p className="text-sm text-blue-700">{agent.progress}% complete</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Agents */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {execution.agents_pending.map((agent, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 text-gray-600">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        {agent.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Decisions & Confidence */}
          <TabsContent value="decisions">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Scores & Key Decisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Document Classification</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-11/12 bg-green-500" />
                      </div>
                      <span className="text-sm font-bold">94%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Lease, rent roll, bank statement</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Borrower Credit Score</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-10/12 bg-green-500" />
                      </div>
                      <span className="text-sm font-bold">88%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">780+ FICO score verified</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Rental Income Extraction</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-green-500" />
                      </div>
                      <span className="text-sm font-bold">98%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">$5,200/month multi-unit</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">NOI Calculation</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-yellow-500" />
                      </div>
                      <span className="text-sm font-bold">75%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Pending expense verification</p>
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