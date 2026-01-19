import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode, Upload, Download, History } from 'lucide-react';
import MISMOExportPanel from '@/components/deal-detail/MISMOExportPanel';
import MISMOImportPanel from '@/components/deal-detail/MISMOImportPanel';
import { Badge } from '@/components/ui/badge';

export default function MISMOImportExport() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  const { data: exportRuns = [] } = useQuery({
    queryKey: ['exportRuns', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.ExportRun.filter({ org_id: orgId });
      } catch {
        return [];
      }
    },
    enabled: !!orgId
  });

  const { data: importRuns = [] } = useQuery({
    queryKey: ['importRuns', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.ImportRun.filter({ org_id: orgId });
      } catch {
        return [];
      }
    },
    enabled: !!orgId
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileCode className="h-8 w-8 text-blue-600" />
          MISMO Import/Export Center
        </h1>
        <p className="text-gray-500 mt-2">
          Production-grade MISMO v3.4 B324 export/import with XSD validation, 
          PII redaction, and conformance reporting
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import XML
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export XML
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <MISMOImportPanel orgId={orgId} />
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Select Deal to Export</CardTitle>
              <CardDescription>Choose a deal, then use the MISMO Export tab in Deal Details</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Navigate to any deal's detail page to access the full MISMO export panel with 
                schema pack selection, preflight validation, and conformance reporting.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">Export Features:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
                  <li>Preflight validation (enums, datatypes, required fields)</li>
                  <li>MEG-0025 compliant LG extensions</li>
                  <li>Deterministic XML output</li>
                  <li>XSD schema validation</li>
                  <li>Conformance reporting</li>
                  <li>PII-safe audit logging</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                Recent Exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportRuns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No exports yet
                </div>
              ) : (
                <div className="space-y-2">
                  {exportRuns.slice(0, 10).map((run) => (
                    <div key={run.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{run.export_id || run.id}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(run.created_date).toLocaleString()} • {run.created_by}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{run.pack_id?.split('_')[1] || 'GENERIC'}</Badge>
                        <Badge className={
                          run.validation_status === 'PASS' ? 'bg-green-100 text-green-700' :
                          run.validation_status === 'PASS_WITH_WARNINGS' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {run.validation_status || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                Recent Imports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importRuns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No imports yet
                </div>
              ) : (
                <div className="space-y-2">
                  {importRuns.slice(0, 10).map((run) => (
                    <div key={run.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{run.import_id || run.id}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(run.created_date).toLocaleString()} • {run.created_by}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{run.pack_id?.split('_')[1] || run.detected_pack?.split('_')[1] || 'AUTO'}</Badge>
                          <Badge className={
                            run.validation_status === 'PASS' ? 'bg-green-100 text-green-700' :
                            run.validation_status === 'PASS_WITH_WARNINGS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {run.validation_status || 'UNKNOWN'}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Mapped:</span>{' '}
                          <span className="font-medium text-green-600">{run.mapped_fields_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Unmapped:</span>{' '}
                          <span className="font-medium text-yellow-600">{run.unmapped_nodes_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Size:</span>{' '}
                          <span className="font-medium">{((run.raw_xml_size || 0) / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}