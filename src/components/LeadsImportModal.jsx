import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function LeadsImportModal({ trigger, onImportComplete }) {
  const [step, setStep] = useState(1);
  const [sheetUrl, setSheetUrl] = useState('');
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sheetsImport', {
        action: 'preview',
        source_type: 'csv',
        sheet_url: sheetUrl
      });
      return response.data;
    },
    onSuccess: (data) => {
      setHeaders(data.headers || []);
      setPreviewRows(data.rows || []);
      setMapping(data.suggested_mapping || {});
      setStep(2);
    },
    onError: (error) => {
      alert('Preview failed: ' + error.message);
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sheetsImport', {
        action: 'import',
        source_type: 'csv',
        sheet_url: sheetUrl,
        mapping
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStep(3);
      setTimeout(() => {
        setIsOpen(false);
        onImportComplete?.();
      }, 2000);
    },
    onError: (error) => {
      alert('Import failed: ' + error.message);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><Upload className="h-4 w-4" />Import Leads</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from Google Sheet</DialogTitle>
        </DialogHeader>

        {/* Step 1: URL Input */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Google Sheets URL</Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">Share the sheet publicly (Viewer access) or use a public link</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => previewMutation.mutate()} disabled={!sheetUrl || previewMutation.isPending}>
                {previewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && (
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div>
              <h4 className="font-semibold mb-3">Map columns to fields:</h4>
              <div className="space-y-2">
                {headers.map((header) => (
                  <div key={header} className="flex gap-2 items-center">
                    <span className="text-sm font-medium w-32">{header}</span>
                    <Select value={mapping[header] || ''} onValueChange={(v) => setMapping({ ...mapping, [header]: v })}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Skip field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip</SelectItem>
                        <SelectItem value="first_name">First Name</SelectItem>
                        <SelectItem value="last_name">Last Name</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="source">Source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
              <p className="font-semibold">Preview (first 3 rows):</p>
              {previewRows.slice(0, 3).map((row, idx) => (
                <p key={idx} className="text-gray-600">
                  {Object.values(row).slice(0, 3).join(' | ')}
                </p>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {previewRows.length} Leads
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h4 className="font-semibold">Import Complete!</h4>
              <p className="text-sm text-gray-600">
                {importMutation.data?.imported_count || 0} leads imported successfully
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}