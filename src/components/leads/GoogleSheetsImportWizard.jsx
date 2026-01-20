import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, 
  Download, ArrowRight, ArrowLeft, Save, RefreshCw, Table, Link2
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Connect', icon: Link2 },
  { id: 2, title: 'Select Sheet', icon: FileSpreadsheet },
  { id: 3, title: 'Map Columns', icon: Table },
  { id: 4, title: 'Import', icon: Upload },
];

export default function GoogleSheetsImportWizard({ trigger, onImportComplete }) {
  const queryClient = useQueryClient();
  const { orgId, user } = useOrgId();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, disconnected
  
  // Sheet selection state
  const [sheetUrl, setSheetUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  
  // Mapping state
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [leadFields, setLeadFields] = useState([]);
  const [suggestedMapping, setSuggestedMapping] = useState({});
  
  // Import options
  const [dedupeMode, setDedupeMode] = useState('skip');
  
  // Saved mappings
  const [selectedMappingId, setSelectedMappingId] = useState('');
  const [saveMappingName, setSaveMappingName] = useState('');
  
  // Import results
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Check connection on open
  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Try listing tabs from a known sheet to verify connection
      const result = await base44.functions.invoke('googleSheetsListTabs', {
        spreadsheet_id_or_url: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Google's sample sheet
      });
      if (result.data?.ok || result.data?.sheets) {
        setConnectionStatus('connected');
      } else if (result.data?.needs_reconnect) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connected'); // Assume connected if no error
      }
    } catch (e) {
      // Check error type
      if (e.response?.data?.needs_reconnect) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connected'); // Connection might be fine, sheet access issue
      }
    }
  };

  const { data: savedMappings = [] } = useQuery({
    queryKey: ['leadMappingProfiles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const profiles = await base44.entities.LeadMappingProfile.filter({ org_id: orgId });
      return profiles;
    },
    enabled: !!orgId && isOpen,
  });

  const { data: importHistory = [] } = useQuery({
    queryKey: ['importRuns', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const runs = await base44.entities.ImportRun.filter({ org_id: orgId, source_type: 'google_sheets' });
      return runs.sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 10);
    },
    enabled: !!orgId && isOpen,
  });

  const resetWizard = () => {
    setStep(1);
    setSheetUrl('');
    setSpreadsheetId('');
    setSpreadsheetTitle('');
    setAvailableSheets([]);
    setSelectedSheet('');
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setDedupeMode('skip');
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
  };

  // List tabs mutation
  const listTabsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('googleSheetsListTabs', {
        spreadsheet_id_or_url: sheetUrl
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!data.ok && data.needs_reconnect) {
        setConnectionStatus('disconnected');
        toast.error('Please reconnect Google Sheets');
        return;
      }
      setSpreadsheetId(data.spreadsheetId);
      setSpreadsheetTitle(data.title);
      setAvailableSheets(data.sheets || []);
      if (data.sheets?.length > 0) {
        setSelectedSheet(data.sheets[0].title);
      }
      toast.success(`Found ${data.sheets?.length || 0} sheet(s)`);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      if (msg.includes('reconnect') || msg.includes('authorization')) {
        setConnectionStatus('disconnected');
      }
      toast.error('Failed to load spreadsheet: ' + msg);
    }
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('googleSheetsPreview', {
        spreadsheetId,
        sheetTitle: selectedSheet,
        headerRow: 1,
        sampleRows: 25
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!data.ok && data.needs_reconnect) {
        setConnectionStatus('disconnected');
        return;
      }
      setHeaders(data.headers || []);
      setPreviewRows(data.rows || []);
      setSuggestedMapping(data.suggestedMapping || {});
      setMapping(data.suggestedMapping || {});
      setLeadFields(data.leadFields || []);
      setStep(3);
      toast.success(`Found ${data.totalRows} rows`);
    },
    onError: (error) => {
      toast.error('Failed to preview: ' + (error.response?.data?.error || error.message));
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('googleSheetsImportLeads', {
        spreadsheetId,
        sheetTitle: selectedSheet,
        headerRow: 1,
        mapping,
        dedupeMode,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setStep(4);
      // Invalidate leads query
      queryClient.invalidateQueries({ queryKey: ['Lead'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['importRuns'] });
      
      const msg = `Created ${data.created_count}, Updated ${data.updated_count}, Skipped ${data.skipped_count}`;
      if (data.error_count > 0) {
        toast.warning(`Import completed with ${data.error_count} errors. ${msg}`);
      } else {
        toast.success(`Import complete! ${msg}`);
      }
    },
    onError: (error) => {
      toast.error('Import failed: ' + (error.response?.data?.error || error.message));
    }
  });

  // Save mapping mutation
  const saveMappingMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.LeadMappingProfile.create({
        org_id: orgId,
        name: saveMappingName,
        mapping_json: mapping,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadMappingProfiles'] });
      toast.success('Mapping saved!');
      setSaveMappingName('');
    },
    onError: (error) => {
      toast.error('Failed to save mapping: ' + error.message);
    }
  });

  const applyMapping = (profileId) => {
    const profile = savedMappings.find(m => m.id === profileId);
    if (profile?.mapping_json) {
      setMapping(profile.mapping_json);
      toast.success('Mapping applied');
    }
  };

  const handleExportErrors = () => {
    if (!importResult?.errors_sample?.length) return;
    
    const csvContent = [
      'Row,Errors',
      ...importResult.errors_sample.map(e => `${e.row},"${e.errors?.join('; ') || 'Unknown'}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMappedCount = () => Object.values(mapping).filter(v => v && v !== 'skip').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetWizard();
    }}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><FileSpreadsheet className="h-4 w-4" />Import from Sheets</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import Leads from Google Sheets
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-4 px-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isComplete = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 ${isActive ? 'text-green-600' : isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-green-100' : isComplete ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {/* STEP 1: Connect */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Connection Status */}
              <Card className={connectionStatus === 'connected' ? 'border-green-200 bg-green-50' : 
                              connectionStatus === 'disconnected' ? 'border-amber-200 bg-amber-50' : ''}>
                <CardContent className="pt-6">
                  {connectionStatus === 'checking' && (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span>Checking Google Sheets connection...</span>
                    </div>
                  )}
                  {connectionStatus === 'connected' && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Google Sheets Connected</p>
                        <p className="text-sm text-green-600">You can import from private spreadsheets</p>
                      </div>
                    </div>
                  )}
                  {connectionStatus === 'disconnected' && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Google Sheets Not Connected</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Please connect Google Sheets in Admin → Integrations to import private spreadsheets.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={checkConnection}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check Again
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sheet URL Input */}
              <div className="space-y-3">
                <Label>Spreadsheet URL or ID</Label>
                <Input
                  placeholder="Paste Google Sheets URL..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Example: https://docs.google.com/spreadsheets/d/1ABC.../edit
                </p>
              </div>

              {/* Import History */}
              {importHistory.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent Imports</Label>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {importHistory.slice(0, 5).map((run) => (
                      <div key={run.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium">{run.source_ref?.split('/')[1] || 'Import'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(run.started_at).toLocaleDateString()} • 
                            {run.imported_count} created, {run.updated_count} updated
                          </p>
                        </div>
                        <Badge className={run.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {run.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => listTabsMutation.mutate()}
                  disabled={!sheetUrl || listTabsMutation.isPending || connectionStatus === 'disconnected'}
                  className="gap-2"
                >
                  {listTabsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load Spreadsheet
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Sheet Tab */}
          {step === 1 && availableSheets.length > 0 && (
            <div className="space-y-4 mt-6 pt-6 border-t">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">{spreadsheetTitle}</span>
              </div>
              
              <div className="space-y-2">
                <Label>Select Sheet Tab</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map((sheet) => (
                      <SelectItem key={sheet.sheetId} value={sheet.title}>
                        {sheet.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => previewMutation.mutate()}
                  disabled={!selectedSheet || previewMutation.isPending}
                  className="gap-2"
                >
                  {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Preview Data
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Map Columns */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Map Columns to Lead Fields</h3>
                  <p className="text-sm text-gray-500">{getMappedCount()} of {headers.length} columns mapped</p>
                </div>
                
                {savedMappings.length > 0 && (
                  <Select value={selectedMappingId} onValueChange={(v) => { setSelectedMappingId(v); applyMapping(v); }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Load saved mapping" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedMappings.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Column Mapping */}
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-4 p-3 hover:bg-gray-50">
                    <div className="w-1/3">
                      <span className="text-sm font-medium">{header}</span>
                      {previewRows[0]?.[header] && (
                        <p className="text-xs text-gray-400 truncate">e.g., {previewRows[0][header]}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <Select
                      value={mapping[header] || 'skip'}
                      onValueChange={(v) => setMapping({ ...mapping, [header]: v === 'skip' ? null : v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">
                          <span className="text-gray-400">-- Skip --</span>
                        </SelectItem>
                        {leadFields.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Dedupe Options */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <Label className="font-semibold">Duplicate Handling</Label>
                <p className="text-sm text-gray-600">
                  Duplicates are detected by email (primary) or phone (secondary).
                </p>
                <RadioGroup value={dedupeMode} onValueChange={setDedupeMode} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="cursor-pointer">Skip duplicates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update" className="cursor-pointer">Update existing leads</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Save Mapping */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Save className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Save this mapping as..."
                  value={saveMappingName}
                  onChange={(e) => setSaveMappingName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!saveMappingName || saveMappingMutation.isPending}
                  onClick={() => saveMappingMutation.mutate()}
                >
                  Save
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setStep(1); setAvailableSheets([]); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={getMappedCount() === 0 || importMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {previewRows.length}+ Leads
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && importResult && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Import Complete!</h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.created_count}</div>
                    <p className="text-sm text-gray-500">Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated_count}</div>
                    <p className="text-sm text-gray-500">Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">{importResult.skipped_count}</div>
                    <p className="text-sm text-gray-500">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.error_count}</div>
                    <p className="text-sm text-gray-500">Errors</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.error_count > 0 && importResult.errors_sample?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Error Details</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportErrors}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Errors
                    </Button>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors_sample.slice(0, 10).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.errors?.join(', ') || 'Unknown'}</li>
                    ))}
                    {importResult.errors_sample.length > 10 && (
                      <li className="italic">...and {importResult.errors_sample.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => { setIsOpen(false); resetWizard(); }}>
                  Close
                </Button>
                <Button onClick={() => { setIsOpen(false); resetWizard(); onImportComplete?.(); }}>
                  View Leads
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}