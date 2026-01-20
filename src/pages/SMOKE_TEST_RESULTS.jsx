import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  RefreshCw, 
  Clock, 
  AlertTriangle,
  Play,
  Server
} from 'lucide-react';

export default function SMOKE_TEST_RESULTS() {
  const [testResults, setTestResults] = useState(null);

  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('e2eTestRunner', {});
      return response.data;
    },
    onSuccess: (data) => {
      setTestResults(data);
    },
    onError: (error) => {
      setTestResults({
        success: false,
        timestamp: new Date().toISOString(),
        tests_run: 0,
        tests_passed: 0,
        tests_failed: 1,
        details: [{
          name: 'Test Runner',
          status: 'FAIL',
          error: error.message || 'Failed to run tests'
        }]
      });
    }
  });

  const getStatusIcon = (status) => {
    if (status === 'PASS') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'FAIL') return <XCircle className="h-5 w-5 text-red-600" />;
    if (status === 'SKIP') return <Clock className="h-5 w-5 text-gray-400" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const passRate = testResults 
    ? Math.round((testResults.tests_passed / testResults.tests_run) * 100) || 0
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-600" />
            Smoke Test Results
          </h1>
          <p className="text-gray-500 mt-1">End-to-end backend function tests</p>
        </div>
        <Button 
          onClick={() => runTestsMutation.mutate()}
          disabled={runTestsMutation.isPending}
          className="gap-2"
        >
          {runTestsMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {/* No Results State */}
      {!testResults && !runTestsMutation.isPending && (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Test Results Yet</h3>
            <p className="text-gray-500 mb-4">Click "Run Tests" to execute the e2e test suite</p>
            <Button onClick={() => runTestsMutation.mutate()}>
              <Play className="h-4 w-4 mr-2" />
              Run Tests Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {runTestsMutation.isPending && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Running Tests...</h3>
            <p className="text-gray-500">This may take a minute</p>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {testResults && !runTestsMutation.isPending && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className={testResults.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardContent className="pt-6 text-center">
                {testResults.success ? (
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                )}
                <p className="font-bold text-lg">{testResults.success ? 'PASSED' : 'FAILED'}</p>
                <p className="text-sm text-gray-600">Overall</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{testResults.tests_run}</p>
                <p className="text-sm text-gray-600">Tests Run</p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{testResults.tests_passed}</p>
                <p className="text-sm text-gray-600">Passed</p>
              </CardContent>
            </Card>

            <Card className={testResults.tests_failed > 0 ? "border-red-200" : ""}>
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${testResults.tests_failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {testResults.tests_failed}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-gray-400">{testResults.tests_skipped || 0}</p>
                <p className="text-sm text-gray-600">Skipped</p>
              </CardContent>
            </Card>
          </div>

          {/* Pass Rate Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Pass Rate</span>
                <span className={`font-bold ${passRate === 100 ? 'text-green-600' : passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {passRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    passRate === 100 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last run: {new Date(testResults.timestamp).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Details</CardTitle>
              <CardDescription>Individual test results with error messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Group by category */}
                {Object.entries(
                  (testResults.details || []).reduce((acc, test) => {
                    const cat = test.category || 'Other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(test);
                    return acc;
                  }, {})
                ).map(([category, tests]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{category}</h3>
                    {tests.map((test, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${
                          test.status === 'PASS' 
                            ? 'bg-green-50 border-green-200' 
                            : test.status === 'SKIP'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(test.status)}
                            <div>
                              <p className="font-medium">{test.name}</p>
                              {test.message && (
                                <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                              )}
                              {test.error && (
                                <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700 font-mono">
                                  <strong>Error:</strong> {test.error}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className={
                            test.status === 'PASS' ? 'bg-green-100 text-green-800' : 
                            test.status === 'SKIP' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-800'
                          }>
                            {test.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}