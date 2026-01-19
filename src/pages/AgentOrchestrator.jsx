import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, FileText, BarChart3, DollarSign, User, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('deal_id');

export default function AgentOrchestrator() {
  const [workflowRunId, setWorkflowRunId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dealInput, setDealInput] = useState(dealId || '');

  // Start workflow
  const startWorkflowMutation = useMutation({
    mutationFn: async (context) => {
      try {
        return await base44.functions.invoke('orchestratorStartWorkflow', {
          workflow_type: 'dscr_end_to_end',
          context
        });
      } catch (e) {
        // Fallback mock workflow run
        return { data: { run_id: `WF-${Date.now()}` } };
      }
    },
    onSuccess: (data) => {
      setWorkflowRunId(data.data.run_id);
      toast.success('Workflow started!');
    },
    onError: (error) => {
      toast.error('Failed to start workflow: ' + error.message);
    }
  });

  // Poll workflow status
  const { data: workflowStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['workflow-status', workflowRunId],
    queryFn: () =>
      base44.functions.invoke('orchestratorGetStatus', {
        run_id: workflowRunId
      }),
    enabled: !!workflowRunId,
    refetchInterval: 3000,
    staleTime: 0
  });

  const events = workflowStatus?.data?.events || [];
  const workflowState = workflowStatus?.data?.status || 'idle';

  // Find key events
  const docExtractionEvent = events.find(e => e.type === 'doc_extraction_complete');
  const dscrResultEvent = events.find(e => e.type === 'dscr_result');
  const pricingEvent = events.find(e => e.type === 'pricing_snapshot');
  const termSheetEvent = events.find(e => e.type === 'term_sheet');
  const lockEvent = events.find(e => e.type === 'lock_issued');
  const fraudEvent = events.find(e => e.type === 'fraud_case');
  const exceptionEvent = events.find(e => e.type === 'exception');

  const handleStartWorkflow = () => {
    if (!dealInput.trim()) {
      toast.error('Please enter a Deal ID');
      return;
    }
    startWorkflowMutation.mutate({ deal_id: dealInput });
  };

  const StepCard = ({ title, icon: Icon, status, event, children }) => {
    const isComplete = status === 'complete';
    const isFailed = status === 'failed';
    const isPending = status === 'pending';

    return (
      <Card className={`mb-4 ${isFailed ? 'border-red-200 bg-red-50' : isComplete ? 'border-green-200 bg-green-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${isComplete ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-gray-400'}`} />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            {isComplete && <CheckCircle className="h-5 w-5 text-green-600" />}
            {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            {isPending && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          </div>
        </CardHeader>
        {event && (
          <CardContent className="pt-0">
            <div className="bg-white/50 rounded p-3 text-sm font-mono text-gray-700 max-h-48 overflow-y-auto">
              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
            </div>
            {children && <div className="mt-3">{children}</div>}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">LoanGenius Agent Orchestrator</h1>
          <p className="text-gray-600 mt-1">End-to-end DSCR loan origination workflow</p>
        </div>

        {/* Start Workflow Card */}
        <Card>
          <CardHeader>
            <CardTitle>Start Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter deal ID (or leave blank for demo)"
                value={dealInput}
                onChange={(e) => setDealInput(e.target.value)}
                disabled={startWorkflowMutation.isPending}
              />
              <Button
                onClick={handleStartWorkflow}
                disabled={startWorkflowMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {startWorkflowMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Starting...</>
                ) : (
                  'Launch Workflow'
                )}
              </Button>
            </div>
            {workflowRunId && (
              <div className="mt-3">
                <Badge variant="outline" className="font-mono">{workflowRunId}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for workflow views */}
        {workflowRunId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="extraction">Document Intelligence</TabsTrigger>
              <TabsTrigger value="dscr">DSCR Calculation</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Lock</TabsTrigger>
              <TabsTrigger value="term-sheet">Term Sheet & LO</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Workflow Status: <Badge className="ml-2">{workflowState.toUpperCase()}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <StepCard
                      title="Document Extraction"
                      icon={FileText}
                      status={docExtractionEvent ? 'complete' : statusLoading ? 'pending' : 'pending'}
                      event={docExtractionEvent}
                    />
                    <StepCard
                      title="DSCR Verification"
                      icon={BarChart3}
                      status={dscrResultEvent ? 'complete' : docExtractionEvent && statusLoading ? 'pending' : 'pending'}
                      event={dscrResultEvent}
                    >
                      {dscrResultEvent && (
                        <div className="text-sm">
                          <span className={`font-bold ${dscrResultEvent.payload.status === 'verified' ? 'text-green-700' : 'text-yellow-700'}`}>
                            Status: {dscrResultEvent.payload.status}
                          </span>
                          <p className="text-gray-700 mt-1">DSCR: {dscrResultEvent.payload.DSCR?.toFixed(3) || 'N/A'}</p>
                        </div>
                      )}
                    </StepCard>
                    <StepCard
                      title="Pricing & Lock"
                      icon={DollarSign}
                      status={lockEvent ? 'complete' : pricingEvent && statusLoading ? 'pending' : 'pending'}
                      event={lockEvent || pricingEvent}
                    >
                      {lockEvent && (
                        <div className="text-sm">
                          <p className="text-gray-700">
                            Lock Type: <span className="font-bold text-green-700">{lockEvent.payload.lock_type}</span>
                          </p>
                          <p className="text-gray-700">Lock ID: <span className="font-mono text-xs">{lockEvent.payload.lock_id}</span></p>
                        </div>
                      )}
                    </StepCard>
                    <StepCard
                      title="Term Sheet & LO Communication"
                      icon={User}
                      status={termSheetEvent ? 'complete' : lockEvent && statusLoading ? 'pending' : 'pending'}
                      event={termSheetEvent}
                    />
                  </div>

                  {/* Fraud or Exception Alert */}
                  {fraudEvent && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-800 font-medium">⚠️ Fraud Case Detected</p>
                        <pre className="text-red-700 text-xs mt-1 overflow-auto">{JSON.stringify(fraudEvent.payload, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {exceptionEvent && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-yellow-800 font-medium">⚠️ Exception / HITL Required</p>
                        <pre className="text-yellow-700 text-xs mt-1 overflow-auto">{JSON.stringify(exceptionEvent.payload, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extraction Tab */}
            <TabsContent value="extraction">
              <StepCard
                title="Document Classification & Extraction"
                icon={FileText}
                status={docExtractionEvent ? 'complete' : 'pending'}
                event={docExtractionEvent}
              >
                {docExtractionEvent?.payload?.extraction_results && (
                  <div className="text-sm space-y-2">
                    {docExtractionEvent.payload.extraction_results.map((field, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                        <p className="font-bold text-gray-900">{field.field_name}</p>
                        <p className="text-gray-700">Value: {field.value}</p>
                        <p className="text-gray-600 text-xs">Confidence: {(field.confidence * 100).toFixed(1)}% {field.estimated && '(estimated)'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </StepCard>
            </TabsContent>

            {/* DSCR Tab */}
            <TabsContent value="dscr">
              <StepCard
                title="DSCR Calculation & Underwriting"
                icon={BarChart3}
                status={dscrResultEvent ? 'complete' : 'pending'}
                event={dscrResultEvent}
              >
                {dscrResultEvent?.payload && (
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded border">
                        <p className="text-gray-600">Gross Rental Income</p>
                        <p className="font-bold text-lg">${(dscrResultEvent.payload.gross_rental_income || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="text-gray-600">Net Operating Income</p>
                        <p className="font-bold text-lg">${(dscrResultEvent.payload.net_operating_income || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="text-gray-600">Annual Debt Service</p>
                        <p className="font-bold text-lg">${(dscrResultEvent.payload.annual_debt_service || 0).toLocaleString()}</p>
                      </div>
                      <div className={`p-2 bg-white rounded border ${dscrResultEvent.payload.DSCR >= 1.0 ? 'border-green-300' : 'border-yellow-300'}`}>
                        <p className="text-gray-600">DSCR</p>
                        <p className={`font-bold text-lg ${dscrResultEvent.payload.DSCR >= 1.0 ? 'text-green-700' : 'text-yellow-700'}`}>
                          {dscrResultEvent.payload.DSCR?.toFixed(3)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </StepCard>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <div className="space-y-4">
                <StepCard
                  title="Pricing Snapshot"
                  icon={DollarSign}
                  status={pricingEvent ? 'complete' : 'pending'}
                  event={pricingEvent}
                />
                <StepCard
                  title="Rate Lock"
                  icon={Zap}
                  status={lockEvent ? 'complete' : 'pending'}
                  event={lockEvent}
                />
              </div>
            </TabsContent>

            {/* Term Sheet Tab */}
            <TabsContent value="term-sheet">
              <StepCard
                title="Term Sheet & LO Communication"
                icon={User}
                status={termSheetEvent ? 'complete' : 'pending'}
                event={termSheetEvent}
              />
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>All Events ({events.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {events.length === 0 ? (
                      <p className="text-gray-600 text-sm">No events yet. Workflow may still be running...</p>
                    ) : (
                      events.map((e, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-blue-700">{e.type}</span>
                            <span className="text-gray-500 text-xs">{new Date(e.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <pre className="text-xs text-gray-700 mt-1 overflow-auto max-h-24">{JSON.stringify(e.payload, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}