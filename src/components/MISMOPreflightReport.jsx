import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function MISMOPreflightReport({ dealId }) {
  const { data: preflight, isLoading } = useQuery({
    queryKey: ['preflight', dealId],
    queryFn: () => base44.functions.invoke('mismoValidator', { dealId })
  });

  if (isLoading) return <div className="animate-pulse h-48 bg-gray-200 rounded-lg" />;
  if (!preflight) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {preflight.canExport ? (
            <CheckCircle className="text-green-500" />
          ) : (
            <AlertCircle className="text-red-500" />
          )}
          Preflight Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{width: `${preflight.completionPercent}%`}}
          />
        </div>
        <p className="text-sm text-gray-600">
          {preflight.requiredFieldsComplete}/{preflight.requiredFieldsTotal} required fields complete
        </p>

        {preflight.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600">Errors (must fix)</h4>
            {preflight.errors.map((error, i) => (
              <div key={i} className="p-2 bg-red-50 rounded text-sm">
                {error.message}
              </div>
            ))}
          </div>
        )}

        {preflight.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-600">Warnings</h4>
            {preflight.warnings.map((warning, i) => (
              <div key={i} className="p-2 bg-yellow-50 rounded text-sm">
                {warning.message}
              </div>
            ))}
          </div>
        )}

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-500"
          disabled={!preflight.canExport}
        >
          Export MISMO XML
        </Button>
      </CardContent>
    </Card>
  );
}