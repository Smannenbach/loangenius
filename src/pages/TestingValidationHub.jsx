import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2, Play, RefreshCw, Download, Eye } from 'lucide-react';

const testSuites = [
  { id: 1, name: 'DSCR Golden Path', tests: 5, passed: 5, failed: 0, duration: '12.3s', status: 'passed' },
  { id: 2, name: 'Edge Cases (No Ratio)', tests: 3, passed: 3, failed: 0, duration: '8.1s', status: 'passed' },
  { id: 3, name: 'Blanket Allocation', tests: 4, passed: 4, failed: 0, duration: '15.7s', status: 'passed' },
  { id: 4, name: 'Document Validation', tests: 6, passed: 5, failed: 1, duration: '18.2s', status: 'failed' },
  { id: 5, name: 'Fraud Detection', tests: 8, passed: 8, failed: 0, duration: '22.1s', status: 'passed' }
];

const testDetails = [
  { id: 1, name: 'Simple DSCR (Income-Verified)', status: 'passed', duration: '2.1s', confidence: 0.96 },
  { id: 2, name: 'Co-Borrower DSCR', status: 'passed', duration: '2.4s', confidence: 0.94 },
  { id: 3, name: 'Multi-Unit DSCR', status: 'passed', duration: '2.3s', confidence: 0.98 },
  { id: 4, name: 'No-Ratio DSCR', status: 'passed', duration: '1.9s', confidence: 0.92 },
  { id: 5, name: 'Blanket Aggregate', status: 'passed', duration: '3.6s', confidence: 0.89 }
];

export default function TestingValidationHub() {
  const [selectedSuite, setSelectedSuite] = useState(testSuites[0]);
  const [running, setRunning] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Testing & Validation Hub</h1>
            <p className="text-gray-600 mt-1">Run end-to-end tests, validate agent outputs, debug failures</p>
          </div>
          <Button
            onClick={() => setRunning(!running)}
            className={running ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {running ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                Stop Tests
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Total Tests</p>
              <p className="text-2xl font-bold">26</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Passed</p>
              <p className="text-2xl font-bold text-green-600">25</p>
              <p className="text-xs text-green-600 mt-1">96.2%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-600">1</p>
              <p className="text-xs text-red-600 mt-1">3.8%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
              <p className="text-2xl font-bold">14.5s</p>
              <p className="text-xs text-gray-600 mt-1">Last run</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suites" className="w-full">
          <TabsList>
            <TabsTrigger value="suites">Test Suites</TabsTrigger>
            <TabsTrigger value="details">Test Details</TabsTrigger>
            <TabsTrigger value="failures">Failures & Debug</TabsTrigger>
            <TabsTrigger value="coverage">Coverage Report</TabsTrigger>
          </TabsList>

          {/* Test Suites */}
          <TabsContent value="suites">
            <Card>
              <CardHeader>
                <CardTitle>Available Test Suites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testSuites.map((suite) => (
                    <div
                      key={suite.id}
                      onClick={() => setSelectedSuite(suite)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSuite.id === suite.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(suite.status)}
                          <div>
                            <p className="font-semibold text-gray-900">{suite.name}</p>
                            <p className="text-xs text-gray-600">{suite.tests} tests</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 mb-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {suite.passed} passed
                            </Badge>
                            {suite.failed > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {suite.failed} failed
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{suite.duration}</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-full bg-green-600 rounded-full"
                          style={{ width: `${(suite.passed / suite.tests) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Details */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedSuite.name}</span>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-run Suite
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testDetails.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <p className="font-semibold text-gray-900">{test.name}</p>
                          <p className="text-xs text-gray-600">Duration: {test.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 text-blue-800">{(test.confidence * 100).toFixed(0)}%</Badge>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failures & Debug */}
          <TabsContent value="failures">
            <Card>
              <CardHeader>
                <CardTitle>Failed Tests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                  <p className="font-semibold text-red-900 mb-2">Document Validation - Test 4</p>
                  <p className="text-sm text-red-800 mb-3">Expected confidence 0.95, got 0.82 for W-2 extraction</p>
                  <div className="space-y-2 text-xs text-red-700 font-mono bg-white p-2 rounded border border-red-200 max-h-32 overflow-auto">
                    <p>Error: Confidence threshold not met</p>
                    <p>Agent: Document Intelligence</p>
                    <p>Document type: W-2 Tax Form</p>
                    <p>Field: Gross income extraction</p>
                    <p>Reason: Faded ink, OCR degradation</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Download className="h-4 w-4 mr-2" />
                    Download Debug Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coverage Report */}
          <TabsContent value="coverage">
            <Card>
              <CardHeader>
                <CardTitle>Test Coverage Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-3">Loan Products</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>DSCR</span>
                        <Badge className="bg-green-100 text-green-800">100%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Blanket DSCR</span>
                        <Badge className="bg-green-100 text-green-800">95%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Commercial</span>
                        <Badge className="bg-yellow-100 text-yellow-800">60%</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-3">Agent Coverage</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Document Intelligence</span>
                        <Badge className="bg-green-100 text-green-800">98%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>DSCR Underwriter</span>
                        <Badge className="bg-green-100 text-green-800">100%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Fraud Detection</span>
                        <Badge className="bg-green-100 text-green-800">92%</Badge>
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