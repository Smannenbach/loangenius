import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, AlertTriangle, XCircle, Loader2, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import ConformanceReportViewer from '@/components/testing/ConformanceReportViewer';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MISMOImportPanel({ orgId }) {
  const [xmlContent, setXmlContent] = useState('');
  const [packId, setPackId] = useState('auto');
  const [rawOnlyMode, setRawOnlyMode] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setXmlContent(event.target.result);
      toast.success('File loaded - ready to import');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!xmlContent.trim()) {
        throw new Error('No XML content to import');
      }

      const response = await base44.functions.invoke('mismoImportOrchestrator', {
        xml_content: xmlContent,
        pack_id: packId === 'auto' ? null : packId,
        raw_only_mode: rawOnlyMode,
        org_id: orgId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      
      if (data.success) {
        if (data.import_run.status === 'imported') {
          toast.success('✓ Import completed - Deal created!');
          queryClient.invalidateQueries(['deals']);
        } else if (data.import_run.status === 'imported_raw_only') {
          toast.warning('Import completed in quarantine mode');
        }
      } else {
        if (data.blocked_reason === 'xsd_validation_failed') {
          toast.error('Import blocked: XSD validation failed');
        }
      }
    },
    onError: (error) => {
      toast.error('Import failed: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-600" />
            MISMO 3.4 XML Import
          </CardTitle>
          <CardDescription>
            Import MISMO XML with validation, mapping, and unmapped field retention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Schema Pack</Label>
              <Select value={packId} onValueChange={setPackId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect from XML</SelectItem>
                  <SelectItem value="PACK_A_GENERIC_MISMO_34_B324">Generic MISMO 3.4 B324</SelectItem>
                  <SelectItem value="PACK_B_DU_ULAD_STRICT_34_B324">DU/ULAD Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
                id="mismo-import-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('mismo-import-upload').click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </div>
          </div>

          <div>
            <Label>XML Content</Label>
            <Textarea
              value={xmlContent}
              onChange={(e) => setXmlContent(e.target.value)}
              placeholder="Paste MISMO 3.4 XML here or upload a file..."
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Raw-Only Mode (Quarantine)</Label>
              <p className="text-xs text-yellow-700">
                Store in raw storage without writing to canonical tables
              </p>
            </div>
            <Switch
              checked={rawOnlyMode}
              onCheckedChange={setRawOnlyMode}
            />
          </div>

          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || !xmlContent.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {importMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Importing & Validating...</>
            ) : (
              <><Upload className="h-4 w-4" />Import MISMO XML</>
            )}
          </Button>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Import Process:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Auto-detect MISMO version & LDD identifier</li>
              <li>XSD schema validation</li>
              <li>Map recognized fields to canonical model</li>
              <li>Retain unmapped fields in raw storage (no silent data loss)</li>
              <li>Generate conformance report</li>
              <li>Create Deal record (if validation passes)</li>
              <li>Audit logging with PII redaction</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <>
          {/* Status Card */}
          <Card className={`border-2 ${
            importResult.success 
              ? importResult.import_run.status === 'imported' 
                ? 'border-green-300 bg-green-50'
                : 'border-yellow-300 bg-yellow-50'
              : 'border-red-300 bg-red-50'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {importResult.success ? (
                    importResult.import_run.status === 'imported' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    )
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">
                      {importResult.success ? 'Import Successful' : 'Import Blocked'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {importResult.import_run.message || importResult.import_run.status}
                    </p>
                  </div>
                </div>

                {importResult.created_deal_id && (
                  <Link to={createPageUrl(`DealDetail?id=${importResult.created_deal_id}`)}>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700">
                      View Created Deal
                    </Button>
                  </Link>
                )}
              </div>

              {/* Import Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-sm">
                  <p className="text-gray-600">Import ID</p>
                  <p className="font-mono text-xs">{importResult.import_run.import_id}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">Detected Pack</p>
                  <Badge variant="outline" className="mt-1">
                    {importResult.import_run.detected_pack?.split('_')[1] || importResult.import_run.pack_id?.split('_')[1] || 'GENERIC'}
                  </Badge>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">Mapped Fields</p>
                  <p className="font-medium text-green-600">{importResult.import_run.mapped_fields_count || 0}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">Unmapped Nodes</p>
                  <p className={`font-medium ${
                    importResult.import_run.unmapped_nodes_count > 0 ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {importResult.import_run.unmapped_nodes_count || 0}
                  </p>
                </div>
              </div>

              {importResult.import_run.unmapped_nodes_count > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <FileWarning className="h-4 w-4 inline mr-2 text-yellow-600" />
                  <span className="text-yellow-800">
                    {importResult.import_run.unmapped_nodes_count} fields were not mapped to canonical model 
                    (retained in raw storage for future mapping)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conformance Report */}
          {importResult.import_run?.conformance_report && (
            <ConformanceReportViewer report={importResult.import_run.conformance_report} />
          )}
        </>
      )}
    </div>
  );
}