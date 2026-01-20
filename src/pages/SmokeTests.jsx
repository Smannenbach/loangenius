import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FlaskConical, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Copy,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

function TestResultItem({ result }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusConfig = {
    PASS: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' },
    FAIL: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' },
    SKIP: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800' },
  };
  
  const config = statusConfig[result.status] || statusConfig.FAIL;
  const Icon = config.icon;
  
  return (
    <div className={`border rounded-lg ${config.bg} overflow-hidden`}>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div className="text-left">
            <p className="font-medium text-gray-900">{result.name}</p>
            <p className="text-sm text-gray-600">{result.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={config.badge}>{result.status}</Badge>
          <span className="text-xs text-gray-500">{result.duration_ms}ms</span>
          {result.details && (
            expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>
      
      {expanded && result.details && (
        <div className="px-4 pb-4 pt-0">
          <pre className="bg-white/50 rounded p-3 text-xs font-mono overflow-x-auto max-h-48">
            {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SmokeTests() {
  const [testResults, setTestResults] = useState(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('e2eTestRunner', {});
      return response.data;
    },
    onSuccess: (data) => {
      setTestResults(data);
      // Invalidate leads query since we may have created/deleted a test lead
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      if (data.ok) {
        toast.success(`All tests passed! (${data.summary?.passed || 0}/${data.summary?.total || 0})`);
      } else {
        toast.error(`${data.summary?.failed || 0} test(s) failed`);
      }
    },
    onError: (error) => {
      toast.error(`Test run failed: ${error.message}`);
      setTestResults({
        ok: false,
        error: error.message,
        results: []
      });
    }
  });

  const copyResults = () => {
    if (!testResults) return;
    navigator.clipboard.writeText(JSON.stringify(testResults, null, 2));
    toast.success('Results copied to clipboard');
  };

  // Check admin access
  if (userLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600">
              Smoke tests can only be run by administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-purple-600" />
            Smoke Tests
          </h1>
          <p className="text-gray-500 mt-1">End-to-end verification of core app functionality</p>
        </div>
        <div className="flex items-center gap-3">
          {testResults && (
            <Button variant="outline" onClick={copyResults} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy JSON
            </Button>
          )}
          <Button 
            onClick={() => runTestsMutation.mutate()}
            disabled={runTestsMutation.isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {runTestsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Smoke Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Description */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">What Gets Tested</CardTitle>
          <CardDescription>
            These tests verify core functionality without affecting production data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-gray-500">Verifies admin user session</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Organization Resolver</p>
                <p className="text-gray-500">Tests org_id resolution from membership</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Leads Read</p>
                <p className="text-gray-500">Queries leads for current org</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Leads Write/Delete (Safe)</p>
                <p className="text-gray-500">Creates and deletes a test lead</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Google Sheets Integration</p>
                <p className="text-gray-500">Validates encrypted credentials (if connected)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">AI Providers</p>
                <p className="text-gray-500">Lists configured AI providers (if any)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {testResults && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className={testResults.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {testResults.ok ? (
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  ) : (
                    <XCircle className="h-10 w-10 text-red-600" />
                  )}
                  <div>
                    <h2 className={`text-xl font-bold ${testResults.ok ? 'text-green-800' : 'text-red-800'}`}>
                      {testResults.ok ? 'All Tests Passed' : 'Some Tests Failed'}
                    </h2>
                    <p className="text-gray-600">
                      {testResults.summary?.passed || 0} passed, {testResults.summary?.failed || 0} failed, {testResults.summary?.skipped || 0} skipped
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {testResults.duration_ms}ms total
                  </div>
                  <div className="text-xs">
                    {new Date(testResults.completed_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.results?.map((result, idx) => (
                <TestResultItem key={result.id || idx} result={result} />
              ))}
              
              {testResults.error && !testResults.results?.length && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Error: {testResults.error}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!testResults && !runTestsMutation.isPending && (
        <Card>
          <CardContent className="p-12 text-center">
            <FlaskConical className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Run Tests</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Click "Run Smoke Tests" to verify that all core app functionality is working correctly.
            </p>
            <Button 
              onClick={() => runTestsMutation.mutate()}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Play className="h-4 w-4" />
              Run Smoke Tests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {runTestsMutation.isPending && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-16 w-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Running Tests...</h3>
            <p className="text-gray-500">
              Testing authentication, org resolution, leads CRUD, integrations...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}