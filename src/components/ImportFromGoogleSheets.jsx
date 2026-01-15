import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle, Loader, ToggleRight, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function ImportFromGoogleSheets({ onImportSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Leads');
  const [autoImport, setAutoImport] = useState(false);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importLeadsFromGoogleSheets', {
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsOpen(false);
      setSpreadsheetId('');
      setSheetName('Leads');
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    },
    onError: (error) => {
      alert('Import failed: ' + error.message);
    },
  });

  const handleImport = () => {
    if (!spreadsheetId.trim()) {
      alert('Please enter a Google Sheets spreadsheet ID');
      return;
    }
    importMutation.mutate();
  };

  const autoImportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('setupGoogleSheetsAutoImport', data);
      return response.data;
    },
    onSuccess: () => {
      setAutoImport(true);
      alert('Auto-import enabled! Leads will sync daily at 6 AM.');
    },
    onError: (error) => {
      alert('Failed to enable auto-import: ' + error.message);
      setAutoImport(false);
    },
  });

  const handleAutoImportToggle = async (checked) => {
    if (checked && !spreadsheetId.trim()) {
      alert('Please enter a spreadsheet ID first');
      return;
    }
    
    if (checked) {
      autoImportMutation.mutate({
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import from Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Leads from Google Sheets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>How it works:</strong> Your spreadsheet needs column headers like "First Name", "Last Name", "Email", "Phone", "Loan Amount", etc.
            </p>
          </div>

          {/* Spreadsheet ID Input */}
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-id">Google Sheets Spreadsheet ID</Label>
            <Input
              id="spreadsheet-id"
              placeholder="e.g., 1BxiMVs0XRA5nFMKUVfIvzNRqKhMDIBWfGQEZMWTG..."
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-slate-500">
              Find this in the URL: <code className="bg-gray-100 px-1 rounded">docs.google.com/spreadsheets/d/[ID]/</code>
            </p>
          </div>

          {/* Sheet Name Input */}
          <div className="space-y-2">
            <Label htmlFor="sheet-name">Sheet Name</Label>
            <Input
              id="sheet-name"
              placeholder="e.g., Leads"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
            <p className="text-xs text-slate-500">The name of the sheet tab to import from</p>
          </div>

          {/* Auto-Import Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-Import Daily</p>
                <p className="text-xs text-slate-500">Automatically sync leads from this sheet every day at 6 AM</p>
              </div>
            </div>
            <Switch
              checked={autoImport}
              onCheckedChange={handleAutoImportToggle}
              disabled={!spreadsheetId.trim()}
            />
          </div>

          {/* Status Messages */}
          {importMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-800">
                  <p className="font-semibold">Import successful!</p>
                  <p>{importMutation.data?.imported_count} leads imported</p>
                  {importMutation.data?.errors && (
                    <p className="mt-1">{importMutation.data.errors.length} rows had errors</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {importMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-semibold">Import failed</p>
                  <p>{importMutation.error?.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !spreadsheetId.trim()}
              className="flex-1 gap-2"
            >
              {importMutation.isPending && <Loader className="h-4 w-4 animate-spin" />}
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}