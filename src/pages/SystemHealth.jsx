import React from 'react';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminRoute from '@/components/AdminRoute';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemHealth() {
  return (
    <AdminRoute>
      <SystemHealthContent />
    </AdminRoute>
  );
}

function SystemHealthContent() {
  const { orgId, userRole } = useOrgId();

  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testSystemHealth', {});
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const runE2EMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('e2eTestRunner', {});
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('All E2E tests passed');
      } else {
        toast.error('Some E2E tests failed');
      }
    },
  });

  const getStatusIcon = (status) => {
    if (status === 'pass') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'fail') return <XCircle className="h-5 w-5 text-red-600" />;
    if (status === 'warn') return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'pass') return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
    if (status === 'fail') return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
    if (status === 'warn') return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600">Monitor system status and run diagnostic tests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => runE2EMutation.mutate()} disabled={runE2EMutation.isPending}>
            {runE2EMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run E2E Tests
          </Button>
        </div>
      </div>

      {health && (
        <Card className={`mb-6 ${health.ok ? 'border-green-500' : 'border-red-500'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Overall Status</CardTitle>
              <Badge className={health.status === 'healthy' ? 'bg-green-100 text-green-800 text-lg px-4 py-2' : 'bg-red-100 text-red-800 text-lg px-4 py-2'}>
                {health.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{health.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Running health checks...</span>
              </div>
            ) : health?.checks ? (
              <div className="space-y-3">
                {health.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{check.name}</span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-gray-600">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No health data available</p>
            )}
          </CardContent>
        </Card>

        {runE2EMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle>E2E Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Badge className={runE2EMutation.data.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {runE2EMutation.data.summary}
                </Badge>
              </div>
              <div className="space-y-2">
                {runE2EMutation.data.tests?.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 border rounded">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <span className="font-medium text-sm">{test.name}</span>
                      <p className="text-xs text-gray-500">{test.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}