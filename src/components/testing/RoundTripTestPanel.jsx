import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  RefreshCw,
  FileCode,
  GitCompare,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function RoundTripTestPanel({ orgId }) {
  const [testCount, setTestCount] = useState(50);
  const [corpusResult, setCorpusResult] = useState(null);
  const [singleResult, setSingleResult] = useState(null);
  const [suiteResult, setSuiteResult] = useState(null);
  const [activeTab, setActiveTab] = useState('corpus');

  const generateCorpusMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('mismoRoundTripTestHarness', {
        action: 'generate_test_corpus',
        test_count: testCount,
        org_id: orgId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setCorpusResult(data);
      toast.success(`Generated ${data.test_count} test cases`);
    },
    onError: (error) => {
      toast.error('Failed to generate corpus: ' + error.message);
    }
  });

  const runSingleMutation = useMutation({
    mutationFn: async (testId) => {
      const res = await base44.functions.invoke('mismoRoundTripTestHarness', {
        action: 'run_single_test',
        test_id: testId,
        org_id: orgId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSingleResult(data);
      toast.success(`Test ${data.test_id}: ${data.status}`);
    },
    onError: (error) => {
      toast.error('Test failed: ' + error.message);
    }
  });

  const runSuiteMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('mismoRoundTripTestHarness', {
        action: 'run_full_suite',
        test_count: testCount,
        org_id: orgId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSuiteResult(data);
      toast.success(`Suite complete: ${data.success_rate} pass rate`);
    },
    onError: (error) => {
      toast.error('Suite failed: ' + error.message);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-purple-600" />
          Round-Trip Test Harness
        </CardTitle>
        <CardDescription>
          Generate test applications, export to MISMO XML, import back, and compare canonical JSON
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="corpus">Generate Corpus</TabsTrigger>
            <TabsTrigger value="single">Single Test</TabsTrigger>
            <TabsTrigger value="suite">Full Suite</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="corpus" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Test Count</Label>
                <Input
                  type="number"
                  value={testCount}
                  onChange={(e) => setTestCount(parseInt(e.target.value) || 50)}
                  min={1}
                  max={100}
                />
              </div>
              <Button
                onClick={() => generateCorpusMutation.mutate()}
                disabled={generateCorpusMutation.isPending}
                className="gap-2"
              >
                {generateCorpusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Generate Corpus
              </Button>
            </div>

            {corpusResult && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-800">
                    Generated {corpusResult.test_count} test cases
                  </p>
                  <p className="text-sm text-green-600">
                    Corpus ID: {corpusResult.corpus_id}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Branch Coverage</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(corpusResult.branch_coverage || {}).map(([branch, coverage]) => (
                      <div key={branch} className="p-2 bg-gray-50 rounded border">
                        <p className="text-xs font-medium text-gray-700">{branch}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={parseFloat(coverage.percentage)} className="h-2 flex-1" />
                          <span className="text-xs text-gray-500">{coverage.percentage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="single" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 5, 10].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  size="sm"
                  onClick={() => runSingleMutation.mutate(`test_${n}`)}
                  disabled={runSingleMutation.isPending}
                >
                  Run Test #{n}
                </Button>
              ))}
            </div>

            {runSingleMutation.isPending && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-700">Running test...</span>
              </div>
            )}

            {singleResult && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  singleResult.status === 'passed' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {singleResult.status === 'passed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      Test {singleResult.test_id}: {singleResult.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500 ml-auto">
                      {singleResult.duration_ms}ms
                    </span>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Test Steps</h4>
                  {singleResult.steps?.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      {step.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>{step.step}</span>
                      {step.diff_count !== undefined && (
                        <Badge variant="secondary" className="ml-auto">
                          {step.diff_count} diffs
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Diffs */}
                {singleResult.diffs?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-red-700">
                      Differences Found ({singleResult.diffs.length})
                    </h4>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {singleResult.diffs.slice(0, 20).map((diff, idx) => (
                        <div key={idx} className="p-2 border-b text-xs">
                          <div className="font-mono text-red-600">{diff.path}</div>
                          <div className="flex gap-4 mt-1">
                            <span className="text-gray-500">Before: {JSON.stringify(diff.before)}</span>
                            <span className="text-gray-500">After: {JSON.stringify(diff.after)}</span>
                          </div>
                        </div>
                      ))}
                      {singleResult.diffs.length > 20 && (
                        <div className="p-2 text-center text-gray-500">
                          ... and {singleResult.diffs.length - 20} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suite" className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <Label>Tests to Run</Label>
                <Input
                  type="number"
                  value={testCount}
                  onChange={(e) => setTestCount(parseInt(e.target.value) || 50)}
                  min={1}
                  max={100}
                  className="w-24"
                />
              </div>
              <Button
                onClick={() => runSuiteMutation.mutate()}
                disabled={runSuiteMutation.isPending}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {runSuiteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Full Suite
              </Button>
            </div>

            {runSuiteMutation.isPending && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-purple-700">Running test suite...</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
            )}

            {suiteResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg border ${
                  suiteResult.summary?.acceptance_criteria_met 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {suiteResult.summary?.acceptance_criteria_met ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      Suite Complete: {suiteResult.success_rate}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center text-sm">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{suiteResult.passed}</p>
                      <p className="text-gray-500">Passed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{suiteResult.failed}</p>
                      <p className="text-gray-500">Failed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{suiteResult.errors}</p>
                      <p className="text-gray-500">Errors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{suiteResult.total_diffs}</p>
                      <p className="text-gray-500">Total Diffs</p>
                    </div>
                  </div>
                </div>

                {/* Individual Test Results */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Test Results</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {suiteResult.tests?.map((test, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border-b text-sm">
                        {test.status === 'passed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : test.status === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-mono">{test.test_id}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {test.diff_count} diffs
                        </Badge>
                        <span className="text-gray-400 text-xs">{test.duration_ms}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Run tests to see detailed results</p>
              <p className="text-sm mt-2">
                Results include canonical JSON comparisons, unmapped elements, and diff reports
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}