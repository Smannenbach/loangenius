import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, 
  Download, ArrowRight, ArrowLeft, Save, X, FileText, Table
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Source', icon: FileSpreadsheet },
  { id: 2, title: 'Mapping', icon: Table },
  { id: 3, title: 'Preview', icon: FileText },
  { id: 4, title: 'Import', icon: Upload },
];

export default function LeadImportWizard({ trigger, onImportComplete }) {
  const queryClient = useQueryClient();
  const { orgId } = useOrgId();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [connectorError, setConnectorError] = useState(null);
  
  // Source state
  const [sourceType, setSourceType] = useState('csv');
  const [sheetUrl, setSheetUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Preview state
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState({});
  const [leadFields, setLeadFields] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Saved mappings
  const [selectedMappingId, setSelectedMappingId] = useState('');
  const [saveMappingName, setSaveMappingName] = useState('');
  
  // Import result state
  const [importResult, setImportResult] = useState(null);

  const { data: savedMappings = [] } = useQuery({
    queryKey: ['leadMappingProfiles'],
    queryFn: async () => {
      const response = await base44.functions.invoke('leadImport', { action: 'list_mappings' });
      return response.data?.profiles || [];
    },
    enabled: isOpen
  });

  const resetWizard = () => {
    setStep(1);
    setSourceType('csv');
    setSheetUrl('');
    setSpreadsheetId('');
    setSheetName('');
    setCsvData('');
    setFileName('');
    setHeaders([]);
    setPreviewRows([]);
    setTotalRows(0);
    setMapping({});
    setValidationErrors([]);
    setImportResult(null);
    setSelectedMappingId('');
    setSaveMappingName('');
  };

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target.result);
    };
    reader.readAsText(file);
  }, []);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        action: 'preview',
        source_type: sourceType,
      };

      if (sourceType === 'csv') {
        if (csvData) {
          payload.data = csvData;
        } else if (sheetUrl) {
          payload.sheet_url = sheetUrl;
        }
      } else if (sourceType === 'google_sheets') {
        payload.spreadsheet_id = spreadsheetId;
        payload.sheet_name = sheetName || 'Sheet1';
      }

      const response = await base44.functions.invoke('leadImport', payload);
      return response.data;
    },
    onSuccess: (data) => {
      setHeaders(data.headers || []);
      setPreviewRows(data.rows || []);
      setTotalRows(data.total_rows || data.rows?.length || 0);
      setMapping(data.suggested_mapping || {});
      setLeadFields(data.lead_fields || []);
      setValidationErrors(data.validation_errors || []);
      setStep(2);
      toast.success(`Found ${data.total_rows || data.rows?.length || 0} rows to import`);
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || error.message;
      // Check for connector errors
      if (errorMsg.includes('not authorized') || errorMsg.includes('Google Sheets')) {
          setConnectorError(errorMsg);
      } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('expired')) {
        setConnectorError('Google Sheets authorization expired. Please re-authorize in Admin → Integrations.');
      }
      toast.error('Preview failed: ' + errorMsg);
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        action: 'import',
        source_type: sourceType,
        mapping
      };

      if (sourceType === 'csv') {
        if (csvData) {
          payload.data = csvData;
        } else if (sheetUrl) {
          payload.sheet_url = sheetUrl;
        }
      } else if (sourceType === 'google_sheets') {
        payload.spreadsheet_id = spreadsheetId;
        payload.sheet_name = sheetName || 'Sheet1';
      }

      const response = await base44.functions.invoke('leadImport', payload);
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setStep(4);
      // Invalidate leads query with proper org scoping
      queryClient.invalidateQueries({ queryKey: ['Lead', 'org', orgId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Successfully imported ${data.imported} leads!`);
    },
    onError: (error) => {
      toast.error('Import failed: ' + (error.response?.data?.error || error.message));
    }
  });

  const saveMappingMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('leadImport', {
        action: 'save_mapping',
        name: saveMappingName,
        mapping_json: mapping
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadMappingProfiles'] });
      toast.success('Mapping saved!');
      setSaveMappingName('');
    }
  });

  const applySelectedMapping = (profileId) => {
    const profile = savedMappings.find(m => m.id === profileId);
    if (profile?.mapping_json) {
      setMapping(profile.mapping_json);
      toast.success('Mapping applied');
    }
  };

  const handleExportErrors = () => {
    if (!importResult?.error_details?.length) return;
    
    const csvContent = [
      'Row,Error',
      ...importResult.error_details.map(e => `${e.row},"${e.errors?.join('; ') || 'Unknown error'}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMappedFieldCount = () => {
    return Object.values(mapping).filter(v => v && v !== 'skip').length;
  };

  const getValidPreviewCount = () => {
    return previewRows.filter(row => {
      const lead = {};
      for (const [col, field] of Object.entries(mapping)) {
        if (field && field !== 'skip' && row[col]) lead[field] = row[col];
      }
      return lead.first_name || lead.last_name || lead.home_email || lead.mobile_phone;
    }).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetWizard();
    }}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><Upload className="h-4 w-4" />Import Leads</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Import Leads
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isComplete = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-100' : isComplete ? 'bg-green-100' : 'bg-gray-100'
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
          {/* STEP 1: Source Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <Tabs value={sourceType} onValueChange={setSourceType}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">CSV / Public Sheet</TabsTrigger>
                  <TabsTrigger value="google_sheets">Google Sheets API</TabsTrigger>
                </TabsList>

                <TabsContent value="csv" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Upload CSV File</Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="csv-upload"
                          />
                          <label htmlFor="csv-upload" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              {fileName || 'Click to upload CSV file'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-500">OR</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      <div className="space-y-2">
                        <Label>Google Sheets URL (Public)</Label>
                        <Input
                          placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit"
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          Share your sheet with "Anyone with the link can view"
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="google_sheets" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {connectorError ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">Google Sheets Not Connected</p>
                              <p className="text-sm text-amber-700 mt-1">
                                {connectorError}
                              </p>
                              <p className="text-sm text-amber-700 mt-2">
                                To connect Google Sheets, go to <strong>Admin → Integrations</strong> and authorize Google Sheets access.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <p className="text-sm text-green-800">
                              Google Sheets is connected. You can import from private sheets.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Spreadsheet ID</Label>
                        <Input
                          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          value={spreadsheetId}
                          onChange={(e) => setSpreadsheetId(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          From URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Sheet Name (Tab)</Label>
                        <Input
                          placeholder="Sheet1"
                          value={sheetName}
                          onChange={(e) => setSheetName(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button
                  onClick={() => previewMutation.mutate()}
                  disabled={previewMutation.isPending || (!csvData && !sheetUrl && !spreadsheetId)}
                  className="gap-2"
                >
                  {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Preview Data
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Map Columns to Lead Fields</h3>
                  <p className="text-sm text-gray-500">{getMappedFieldCount()} of {headers.length} columns mapped</p>
                </div>
                
                <div className="flex gap-2">
                  {savedMappings.length > 0 && (
                    <Select value={selectedMappingId} onValueChange={(v) => { setSelectedMappingId(v); applySelectedMapping(v); }}>
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
              </div>

              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-4 p-3 hover:bg-gray-50">
                    <div className="w-1/3">
                      <span className="text-sm font-medium">{header}</span>
                      {previewRows[0]?.[header] && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          e.g., {previewRows[0][header]}
                        </p>
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
                          <span className="text-gray-400">-- Skip this column --</span>
                        </SelectItem>
                        {leadFields.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
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
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={getMappedFieldCount() === 0}>
                  Preview Import
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validate */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalRows}</div>
                    <p className="text-sm text-gray-500">Total Rows</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{getValidPreviewCount()}</div>
                    <p className="text-sm text-gray-500">Valid (preview)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{validationErrors.length}</div>
                    <p className="text-sm text-gray-500">Potential Issues</p>
                  </CardContent>
                </Card>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Validation Warnings</p>
                      <ul className="text-xs text-amber-700 mt-1 space-y-1">
                        {validationErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>Row {err.row}: {err.message}</li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>...and {validationErrors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium">Preview (first 10 rows)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        {Object.entries(mapping).filter(([_, v]) => v && v !== 'skip').map(([col, field]) => (
                          <th key={col} className="px-3 py-2 text-left">{field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{row._rowIndex || idx + 2}</td>
                          {Object.entries(mapping).filter(([_, v]) => v && v !== 'skip').map(([col]) => (
                            <td key={col} className="px-3 py-2 truncate max-w-32">{row[col] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {totalRows} Leads
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
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <p className="text-sm text-gray-500">Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                    <p className="text-sm text-gray-500">Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                    <p className="text-sm text-gray-500">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                    <p className="text-sm text-gray-500">Errors</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors > 0 && importResult.error_details?.length > 0 && (
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
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.error_details.slice(0, 5).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.errors?.join(', ') || 'Unknown error'}</li>
                    ))}
                    {importResult.error_details.length > 5 && (
                      <li className="text-red-500 italic">...and {importResult.error_details.length - 5} more errors</li>
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