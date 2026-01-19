import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Play, CheckCircle, XCircle, AlertTriangle, Loader2, 
  Package, Download, FileCode, TrendingUp, TestTube 
} from 'lucide-react';
import { toast } from 'sonner';

export default function GoldenTestPackPanel() {
  const [packId, setPackId] = useState('PACK_A_GENERIC_MISMO_34_B324');
  const [regressionResults, setRegressionResults] = useState(null);

  const generatePackMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('mismoGoldenTestPackGenerator', {
        action: 'generate_pack',
        pack_id: packId
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.pack.test_count} test cases`);
    },
    onError: (error) => {
      toast.error('Generation failed: ' + error.message);
    }
  });

  const runRegressionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('mismoGoldenTestPackGenerator', {
        action: 'run_regression',
        pack_id: packId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setRegressionResults(data.regression_results);
      if (data.regression_results.overall_status === 'PASS') {
        toast.success(`✓ All ${data.regression_results.total_tests} tests passed!`);
      } else {
        toast.error(`✗ ${data.regression_results.failed} of ${data.regression_results.total_tests} tests failed`);
      }
    },
    onError: (error) => {
      toast.error('Regression failed: ' + error.message);
    }
  });

  const successRate = regressionResults 
    ? ((regressionResults.passed / regressionResults.total_tests) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-purple-600" />
            Golden Test Pack Generator
          </CardTitle>
          <CardDescription>
            Generate 30+ test cases covering all MISMO scenarios with round-trip validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Schema Pack</label>
              <Select value={packId} onValueChange={setPackId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PACK_A_GENERIC_MISMO_34_B324">Generic MISMO 3.4 B324</SelectItem>
                  <SelectItem value="PACK_B_DU_ULAD_STRICT_34_B324">DU/ULAD Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => generatePackMutation.mutate()}
              disabled={generatePackMutation.isPending}
              className="gap-2"
            >
              {generatePackMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Package className="h-4 w-4" />Generate Pack</>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Test Coverage</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-medium text-blue-800">Loan Purposes</div>
                <div className="text-blue-600 text-xs">Purchase, Refi, Cash-Out, No-Cash-Out</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="font-medium text-green-800">Vesting Types</div>
                <div className="text-green-600 text-xs">Individual, LLC, Corp, GP, Trust</div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="font-medium text-purple-800">Applicants</div>
                <div className="text-purple-600 text-xs">0, 1, 2 borrowers</div>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <div className="font-medium text-orange-800">Assets</div>
                <div className="text-orange-600 text-xs">0, 1, 2, 3, 5 rows</div>
              </div>
              <div className="p-2 bg-pink-50 rounded">
                <div className="font-medium text-pink-800">REO Properties</div>
                <div className="text-pink-600 text-xs">0, 2, 6, 9 rows</div>
              </div>
              <div className="p-2 bg-red-50 rounded">
                <div className="font-medium text-red-800">Declarations</div>
                <div className="text-red-600 text-xs">Bankruptcy, Undisclosed Money</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regression Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Round-Trip Regression Suite
          </CardTitle>
          <CardDescription>
            Export → Validate → Import → Diff for all test cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => runRegressionMutation.mutate()}
            disabled={runRegressionMutation.isPending}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {runRegressionMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Running Regression...</>
            ) : (
              <><Play className="h-4 w-4" />Run Full Regression Suite</>
            )}
          </Button>

          {regressionResults && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg text-center ${
                  regressionResults.overall_status === 'PASS' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`text-2xl font-bold ${
                    regressionResults.overall_status === 'PASS' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {regressionResults.passed}
                  </div>
                  <div className="text-xs text-gray-600">Passed</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">{regressionResults.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-700">{regressionResults.xsd_failures}</div>
                  <div className="text-xs text-gray-600">XSD Errors</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700">{regressionResults.diff_failures}</div>
                  <div className="text-xs text-gray-600">Diffs</div>
                </div>
              </div>

              {/* Overall Status */}
              <div className={`p-4 rounded-lg border-2 ${
                regressionResults.overall_status === 'PASS' 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center gap-3">
                  {regressionResults.overall_status === 'PASS' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <div className={`text-lg font-bold ${
                      regressionResults.overall_status === 'PASS' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {regressionResults.overall_status === 'PASS' 
                        ? '✓ All Tests Passed - Ready to Merge' 
                        : '✗ Regression Failed - Blocking Merge'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {regressionResults.passed} / {regressionResults.total_tests} tests passed ({successRate}%)
                    </div>
                  </div>
                </div>
                <Progress 
                  value={(regressionResults.passed / regressionResults.total_tests) * 100} 
                  className="mt-3"
                />
              </div>

              {/* Test Results */}
              {regressionResults.failed > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-800">Failed Tests</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {regressionResults.test_results
                      .filter(t => !t.passed)
                      .map((test) => (
                        <div key={test.test_id} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{test.test_id}</Badge>
                            <div className="flex gap-1">
                              {test.validation_status === 'FAIL' && (
                                <Badge className="bg-red-600 text-xs">XSD Failed</Badge>
                              )}
                              {test.diff_count > 0 && (
                                <Badge className="bg-purple-600 text-xs">{test.diff_count} Diffs</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            {test.summary && Object.entries(test.summary).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                {value ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* CI Integration Note */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileCode className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">CI Integration</p>
                    <p className="text-xs mt-1">
                      This regression suite can be integrated into your CI/CD pipeline to block merges 
                      if any test fails. Configure webhook to run on every commit to mapping files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}