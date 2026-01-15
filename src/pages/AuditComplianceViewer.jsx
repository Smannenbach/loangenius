import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, Lock, FileText, Search } from 'lucide-react';

const auditEvents = [
  {
    id: 1,
    timestamp: '2025-01-15 14:32:45 UTC',
    action: 'DSCR_LOCK_FIRM',
    deal_id: 'DL-202501-0042',
    agent: 'Pricing & Lock',
    status: 'success',
    details: 'Firm rate lock executed. DSCR verified at 1.28x. Lock duration: 45 days.',
    user: 'john@loangenius.com'
  },
  {
    id: 2,
    timestamp: '2025-01-15 14:31:20 UTC',
    action: 'DSCR_CALCULATION_COMPLETE',
    deal_id: 'DL-202501-0042',
    agent: 'DSCR Underwriter',
    status: 'success',
    details: 'NOI: $62,400. Debt Service: $48,600. DSCR: 1.28x (exceeds 1.20x minimum).',
    user: 'system'
  },
  {
    id: 3,
    timestamp: '2025-01-15 14:29:15 UTC',
    action: 'DOCUMENT_INTELLIGENCE_COMPLETE',
    deal_id: 'DL-202501-0042',
    agent: 'Document Intelligence',
    status: 'success',
    details: 'Extracted rental income from lease: $5,200/mo. Confidence: 96%.',
    user: 'system'
  },
  {
    id: 4,
    timestamp: '2025-01-15 14:15:30 UTC',
    action: 'FRAUD_CHECK_PASSED',
    deal_id: 'DL-202501-0042',
    agent: 'Fraud Detection',
    status: 'warning',
    details: 'OFAC check completed. Applicant flagged (low risk). Manual review recommended.',
    user: 'system'
  },
  {
    id: 5,
    timestamp: '2025-01-15 14:05:00 UTC',
    action: 'WORKFLOW_INITIATED',
    deal_id: 'DL-202501-0042',
    agent: 'Workflow Orchestrator',
    status: 'info',
    details: 'DSCR end-to-end workflow started. 22 agents queued.',
    user: 'loan.officer@loangenius.com'
  }
];

const complianceChecks = [
  { id: 1, name: 'SAME (Pricing)', status: 'passed', timestamp: '2025-01-15 14:32:45' },
  { id: 2, name: 'TRID Compliance', status: 'passed', timestamp: '2025-01-15 14:20:00' },
  { id: 3, name: 'TILA Disclosure', status: 'passed', timestamp: '2025-01-15 14:25:30' },
  { id: 4, name: 'Fair Lending (AUS)', status: 'warning', timestamp: '2025-01-15 14:15:00' },
  { id: 5, name: 'ECOA Disparate Impact', status: 'passed', timestamp: '2025-01-15 14:10:15' }
];

export default function AuditComplianceViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = auditEvents.filter(event =>
    event.deal_id.includes(searchTerm) ||
    event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.agent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Audit & Compliance Viewer</h1>
          <p className="text-gray-600 mt-1">Immutable audit log with agent decisions, compliance checks, and explainability</p>
        </div>

        <Tabs defaultValue="audit" className="w-full">
          <TabsList>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Checks</TabsTrigger>
            <TabsTrigger value="provenance">Data Provenance</TabsTrigger>
          </TabsList>

          {/* Audit Log */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Immutable Event Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by deal ID, action, or agent..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Events */}
                <div className="space-y-3">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedEvent?.id === event.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {getStatusIcon(event.status)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900">{event.action}</p>
                            <span className="text-xs text-gray-600">{event.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{event.details}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{event.deal_id}</Badge>
                            <Badge variant="outline" className="text-xs">{event.agent}</Badge>
                            <Badge variant="outline" className="text-xs">By: {event.user}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedEvent?.id === event.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                            <p className="text-gray-700">{event.details}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-700">Event ID</p>
                              <p className="text-gray-600 font-mono">evt_{event.id}_d8e9f0c1</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Hash</p>
                              <p className="text-gray-600 font-mono">sha256_a1b2c3...</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Signed By</p>
                              <p className="text-gray-600">LoanGenius Authority</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Immutable</p>
                              <p className="text-green-600 font-bold">Yes (Blockchain)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Checks */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Check Results (Deal: DL-202501-0042)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceChecks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <p className="font-semibold text-gray-900">{check.name}</p>
                          <p className="text-xs text-gray-600">{check.timestamp}</p>
                        </div>
                      </div>
                      <Badge className={
                        check.status === 'passed' ? 'bg-green-100 text-green-800' :
                        check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-semibold text-yellow-900 mb-2">⚠ Fair Lending Warning</p>
                  <p className="text-sm text-yellow-800">AUS noted potential disparate impact concern. Pricing is 15bps higher than similarly-situated borrower. Recommend manual review by underwriter.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Provenance */}
          <TabsContent value="provenance">
            <Card>
              <CardHeader>
                <CardTitle>Data Provenance & Chain of Custody</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-semibold text-sm text-gray-900 border-b">
                    DSCR Calculation: 1.28x
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-4">
                      <div className="text-xs text-gray-600 font-mono min-w-fit">Step 1</div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Document Intelligence → Extract Rental Income</p>
                        <p className="text-xs text-gray-600">Source: Lease agreement (pages 1-2) | Confidence: 96% | Extracted: $5,200/mo</p>
                      </div>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 ml-4">
                      <div className="flex gap-4">
                        <div className="text-xs text-gray-600 font-mono min-w-fit">Step 2</div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Document Intelligence → Extract Expenses</p>
                          <p className="text-xs text-gray-600">Source: Schedule E form | Taxes: $1,200/mo, Insurance: $400/mo, Maintenance: $650/mo</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 ml-4">
                      <div className="flex gap-4">
                        <div className="text-xs text-gray-600 font-mono min-w-fit">Step 3</div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">DSCR Underwriter → Calculate NOI</p>
                          <p className="text-xs text-gray-600">NOI = Rental Income - Operating Expenses = $62,400/yr</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 ml-4">
                      <div className="flex gap-4">
                        <div className="text-xs text-gray-600 font-mono min-w-fit">Step 4</div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">DSCR Underwriter → Compute DSCR</p>
                          <p className="text-xs text-gray-600">Annual Debt Service = $48,600. DSCR = $62,400 / $48,600 = 1.28x</p>
                        </div>
                      </div>
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