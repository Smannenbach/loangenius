import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileCode, Download, CheckCircle, AlertTriangle, XCircle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import MISMOExportModeSelector from '@/components/testing/MISMOExportModeSelector';
import ConformanceReportViewer from '@/components/testing/ConformanceReportViewer';

export default function MISMOExportPanel({ dealId }) {
  const [exportMode, setExportMode] = useState('GENERIC_MISMO_34');
  const [skipPreflight, setSkipPreflight] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('mismoExportOrchestrator', {
        deal_id: dealId,
        export_mode: exportMode,
        skip_preflight: skipPreflight
      });
      return response.data;
    },
    onSuccess: (data) => {
      setExportResult(data);
      
      if (data.success) {
        if (data.export_run.status === 'completed') {
          toast.success('✓ Export completed successfully!');
        } else if (data.export_run.status === 'completed_with_warnings') {
          toast.warning('Export completed with warnings');
        }
      } else {
        if (data.blocked_reason === 'preflight_failed') {
          toast.error('Export blocked: Preflight validation failed');
        } else if (data.blocked_reason === 'xsd_validation_failed') {
          toast.error('Export blocked: XSD validation failed');
        }
      }
    },
    onError: (error) => {
      toast.error('Export failed: ' + error.message);
    }
  });

  const downloadXml = () => {
    if (!exportResult?.xml_content) return;
    
    const blob = new Blob([exportResult.xml_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename || `mismo_34_${dealId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('XML downloaded');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-blue-600" />
            MISMO 3.4 XML Export
          </CardTitle>
          <CardDescription>
            Production-grade export with XSD validation, extensions, and conformance reporting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MISMOExportModeSelector
            value={exportMode}
            onChange={setExportMode}
            onExport={() => exportMutation.mutate()}
            isExporting={exportMutation.isPending}
          />

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Skip Preflight Validation</Label>
              <p className="text-xs text-gray-500">Not recommended for production exports</p>
            </div>
            <Switch
              checked={skipPreflight}
              onCheckedChange={setSkipPreflight}
            />
          </div>

          {!exportResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">Export Process:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Preflight validation (enums, datatypes, required fields)</li>
                <li>Build LG extension block (MEG-0025 compliant)</li>
                <li>Generate deterministic MISMO XML</li>
                <li>XSD schema validation</li>
                <li>Compute content hash</li>
                <li>Generate conformance report</li>
                <li>Audit logging</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Result */}
      {exportResult && (
        <>
          {/* Status Card */}
          <Card className={`border-2 ${
            exportResult.success 
              ? exportResult.export_run.status === 'completed' 
                ? 'border-green-300 bg-green-50'
                : 'border-yellow-300 bg-yellow-50'
              : 'border-red-300 bg-red-50'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {exportResult.success ? (
                    exportResult.export_run.status === 'completed' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    )
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">
                      {exportResult.success ? 'Export Successful' : 'Export Blocked'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {exportResult.export_run.message || exportResult.export_run.status}
                    </p>
                  </div>
                </div>

                {exportResult.success && (
                  <Button onClick={downloadXml} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4" />
                    Download XML
                  </Button>
                )}
              </div>

              {/* Export Metadata */}
              {exportResult.export_run && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                  <div className="text-sm">
                    <p className="text-gray-600">Export ID</p>
                    <p className="font-mono text-xs">{exportResult.export_run.export_id}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Schema Pack</p>
                    <Badge variant="outline" className="mt-1">
                      {exportResult.export_run.pack_id?.split('_')[1] || 'GENERIC'}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">File Size</p>
                    <p className="font-medium">{(exportResult.export_run.byte_size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">LG Extensions</p>
                    <p className="font-medium">{exportResult.export_run.extension_fields_count || 0} fields</p>
                  </div>
                </div>
              )}

              {exportResult.export_run?.content_hash && (
                <div className="mt-3 p-2 bg-white rounded border text-xs font-mono text-gray-600">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Hash: {exportResult.export_run.content_hash}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conformance Report */}
          {exportResult.export_run?.conformance_report && (
            <ConformanceReportViewer report={exportResult.export_run.conformance_report} />
          )}
        </>
      )}
    </div>
  );
}