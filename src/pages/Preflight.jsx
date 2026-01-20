import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminRoute from '@/components/AdminRoute';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Rocket } from 'lucide-react';

export default function Preflight() {
  return (
    <AdminRoute>
      <PreflightContent />
    </AdminRoute>
  );
}

function PreflightContent() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['preflight'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testSystemHealth', {});
      return response.data;
    },
  });

  const passCount = data?.checks?.filter(c => c.status === 'pass').length || 0;
  const totalCount = data?.checks?.length || 0;
  const allPass = passCount === totalCount;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
          <Rocket className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Production Preflight</h1>
        <p className="text-lg text-gray-600">Verify system readiness before launch</p>
      </div>

      <Card className={`mb-6 ${allPass ? 'border-green-500' : 'border-yellow-500'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Readiness Score</CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">
                {passCount}/{totalCount}
              </div>
              <Button onClick={() => refetch()} disabled={isLoading} variant="outline">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allPass ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">System Ready for Launch</p>
                <p className="text-sm text-green-700">All critical checks passed</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Action Required</p>
                <p className="text-sm text-yellow-700">Review and fix failing checks before launch</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data?.checks?.map((check, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {check.status === 'pass' && <CheckCircle className="h-6 w-6 text-green-600" />}
                  {check.status === 'fail' && <XCircle className="h-6 w-6 text-red-600" />}
                  {check.status === 'warn' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{check.name}</h3>
                    <Badge className={
                      check.status === 'pass' ? 'bg-green-100 text-green-800' :
                      check.status === 'fail' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-gray-700">{check.message}</p>
                  {check.status === 'fail' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-semibold text-red-900">Fix Required:</p>
                      <p className="text-sm text-red-700 mt-1">
                        {check.name === 'Encryption Key' && 'Set INTEGRATION_ENCRYPTION_KEY in Base44 secrets'}
                        {check.name === 'Database' && 'Check database connection and credentials'}
                        {check.name === 'Org Resolution' && 'Run seedOrgAndUsers function'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allPass && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-500 rounded-xl text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready for Launch! 🚀</h2>
          <p className="text-gray-700">All preflight checks passed. System is go for production deployment.</p>
        </div>
      )}
    </div>
  );
}