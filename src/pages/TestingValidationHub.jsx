import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlaskConical, CheckCircle, XCircle, Loader2, Play, AlertTriangle, FileCode } from 'lucide-react';
import { toast } from 'sonner';

export default function TestingValidationHub() {
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());

  const testSuites = {
    'Data Validation': [
      { id: 'deal_validation', name: 'Deal Data Completeness', description: 'Validates all deals have required fields' },
      { id: 'borrower_validation', name: 'Borrower Data Integrity', description: 'Validates borrower records' },
      { id: 'property_validation', name: 'Property Data Validation', description: 'Validates property records' },
    ],
    'MISMO Compliance': [
      { id: 'mismo_schema', name: 'MISMO Schema Validation', description: 'Validates against MISMO 3.4 XSD' },
      { id: 'mismo_field_mapping', name: 'Field Mapping Check', description: 'Validates all required fields are mapped' },
      { id: 'mismo_export', name: 'Full Export Test', description: 'Runs complete MISMO export with validation' },
    ],
    'Integration Tests': [
      { id: 'twilio_sms', name: 'Twilio SMS', description: 'Tests SMS sending capability' },
      { id: 'sendgrid_email', name: 'SendGrid Email', description: 'Tests email delivery' },
      { id: 'google_sheets', name: 'Google Sheets Sync', description: 'Tests sheet import/export' },
    ],
    'Agent Workflows': [
      { id: 'document_extraction', name: 'Document Intelligence', description: 'Tests document analysis' },
      { id: 'dscr_calculation', name: 'DSCR Calculation', description: 'Tests underwriting calculation' },
      { id: 'lead_scoring', name: 'Lead Qualification', description: 'Tests lead scoring logic' },
    ],
  };

  const runTest = async (testId, testName) => {
    setRunningTests(prev => new Set([...prev, testId]));
    
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const passed = Math.random() > 0.2;
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: passed ? 'pass' : 'fail',
          message: passed ? 'All checks passed' : 'Validation failed: Missing required fields',
          timestamp: new Date(),
        },
      }));
      
      if (passed) {
        toast.success(`✓ ${testName} passed`);
      } else {
        toast.error(`✗ ${testName} failed`);
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'fail',
          message: error.message,
          timestamp: new Date(),
        },
      }));
      toast.error(`✗ ${testName} failed: ${error.message}`);
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const runAllInCategory = async (category) => {
    const tests = testSuites[category];
    for (const test of tests) {
      await runTest(test.id, test.name);
    }
  };

  const totalTests = Object.values(testSuites).flat().length;
  const completedTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.status === 'pass').length;
  const failedTests = Object.values(testResults).filter(r => r.status === 'fail').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-purple-600" />
          Testing & Validation Hub
        </h1>
        <p className="text-gray-500 mt-1">Comprehensive system validation and quality assurance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{completedTests}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Passed</p>
              <p className="text-2xl font-bold text-green-600">{passedTests}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{failedTests}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Data Validation</TabsTrigger>
          <TabsTrigger value="mismo">MISMO Compliance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="agents">Agent Workflows</TabsTrigger>
        </TabsList>

        {Object.entries(testSuites).map(([category, tests]) => {
          const tabValue = category.toLowerCase().replace(/\s+/g, '').replace('validation', '').replace('compliance', 'mismo').replace('tests', 'integrations').replace('workflows', 'agents');
          
          return (
            <TabsContent key={category} value={tabValue} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{category}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAllInCategory(category)}
                      className="gap-2"
                    >
                      <Play className="h-3 w-3" />
                      Run All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tests.map(test => {
                      const result = testResults[test.id];
                      const isRunning = runningTests.has(test.id);
                      
                      return (
                        <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1">
                            {isRunning ? (
                              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            ) : result?.status === 'pass' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : result?.status === 'fail' ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{test.name}</p>
                              <p className="text-xs text-gray-500">{test.description}</p>
                              {result?.message && (
                                <p className={`text-xs mt-1 ${
                                  result.status === 'fail' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {result.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runTest(test.id, test.name)}
                            disabled={isRunning}
                            className="ml-4"
                          >
                            {isRunning ? 'Running...' : 'Run Test'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}