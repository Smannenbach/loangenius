import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Database,
  FileText,
  MessageSquare,
  Settings,
  Zap
} from 'lucide-react';

export default function TestingValidationHub() {
  const [results, setResults] = useState({});
  const [testingInProgress, setTestingInProgress] = useState(false);

  const tests = [
    {
      id: 'dashboard_kpis',
      name: 'Dashboard KPIs',
      function: 'getDashboardKPIs',
      payload: { period: 'month' },
      icon: Database,
      category: 'Core'
    },
    {
      id: 'ai_status',
      name: 'AI Service Status',
      function: 'aiStatus',
      payload: {},
      icon: Zap,
      category: 'AI'
    },
    {
      id: 'ai_assistant',
      name: 'AI Assistant Chat',
      function: 'aiAssistantChat',
      payload: { message: 'Test query for DSCR loans' },
      icon: MessageSquare,
      category: 'AI'
    },
    {
      id: 'seed_data',
      name: 'Seed Test Data',
      function: 'seedComprehensiveTestData',
      payload: {},
      icon: Database,
      category: 'Data'
    },
    {
      id: 'orchestrator_status',
      name: 'Orchestrator Status',
      function: 'orchestratorGetStatus',
      payload: { run_id: 'test-123' },
      icon: Settings,
      category: 'Agents'
    },
  ];

  const runTest = async (test) => {
    setResults({ ...results, [test.id]: { status: 'running' } });
    
    try {
      const response = await base44.functions.invoke(test.function, test.payload);
      setResults({ 
        ...results, 
        [test.id]: { 
          status: 'passed', 
          data: response.data,
          duration: response.duration
        } 
      });
    } catch (error) {
      setResults({ 
        ...results, 
        [test.id]: { 
          status: 'failed', 
          error: error.message 
        } 
      });
    }
  };

  const runAllTests = async () => {
    setTestingInProgress(true);
    setResults({});
    
    for (const test of tests) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTestingInProgress(false);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  const totalTests = tests.length;
  const completedTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.status === 'passed').length;
  const failedTests = Object.values(results).filter(r => r.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Testing & Validation Hub</h1>
            <p className="text-gray-600 mt-2">Comprehensive system testing and validation</p>
          </div>
          <Button 
            onClick={runAllTests}
            disabled={testingInProgress}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {testingInProgress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        {completedTests > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{completedTests}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Groups */}
        {Object.entries(groupedTests).map(([category, categoryTests]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-xl">{category} Tests</CardTitle>
              <CardDescription>{categoryTests.length} tests in this category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryTests.map((test) => {
                const result = results[test.id];
                const Icon = test.icon;
                
                return (
                  <div 
                    key={test.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Icon className="h-6 w-6 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{test.name}</div>
                        <div className="text-sm text-gray-500">{test.function}</div>
                        {result?.error && (
                          <div className="text-sm text-red-600 mt-1">{result.error}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {result?.duration && (
                        <Badge variant="outline" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      )}
                      {getStatusIcon(result?.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runTest(test)}
                        disabled={result?.status === 'running'}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Results Details */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(results).map(([testId, result]) => {
                  const test = tests.find(t => t.id === testId);
                  if (!test || !result.data) return null;
                  
                  return (
                    <div key={testId} className="space-y-2">
                      <div className="font-medium text-gray-900">{test.name}</div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}