import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  Info,
  Package,
  Code,
  List,
} from 'lucide-react';
import { toast } from 'sonner';

// Schema Pack configuration - versioned and visible
const SCHEMA_PACK = {
  version: '1.0.0',
  build_date: '2024-01-15',
  mismo_version: '3.4',
  mismo_build: 'B324',
  namespaces: {
    MISMO: 'http://www.mismo.org/residential/2009/schemas',
    xlink: 'http://www.w3.org/1999/xlink',
    xsi: 'http://www.w3.org/2001/XMLSchema-instance',
    DU: 'http://www.datamodelextension.org',
    LG: 'urn:loangenius:extension:1.0',
  },
  schema_locations: {
    MISMO: 'http://www.mismo.org/residential/2009/schemas MISMO_3.4.0_B324.xsd',
    DU: 'http://www.datamodelextension.org DU_MISMO_3.4.xsd',
  },
  extensions: [
    { prefix: 'LG', uri: 'urn:loangenius:extension:1.0', description: 'LoanGenius custom fields' },
    { prefix: 'DU', uri: 'http://www.datamodelextension.org', description: 'Desktop Underwriter wrapper' },
  ],
};

// Extension Registry
const EXTENSION_REGISTRY = [
  { code: 'MEG-0001', field: 'is_interest_only', xpath: 'EXTENSION/OTHER/LG:IsInterestOnly', type: 'boolean' },
  { code: 'MEG-0002', field: 'interest_only_period_months', xpath: 'EXTENSION/OTHER/LG:InterestOnlyPeriodMonths', type: 'integer' },
  { code: 'MEG-0003', field: 'is_arm', xpath: 'EXTENSION/OTHER/LG:IsARM', type: 'boolean' },
  { code: 'MEG-0004', field: 'arm_index', xpath: 'EXTENSION/OTHER/LG:ARMIndex', type: 'string' },
  { code: 'MEG-0005', field: 'arm_margin', xpath: 'EXTENSION/OTHER/LG:ARMMargin', type: 'decimal' },
  { code: 'MEG-0006', field: 'arm_caps', xpath: 'EXTENSION/OTHER/LG:ARMCaps', type: 'string' },
  { code: 'MEG-0007', field: 'is_bridge', xpath: 'EXTENSION/OTHER/LG:IsBridge', type: 'boolean' },
  { code: 'MEG-0008', field: 'bridge_exit_strategy', xpath: 'EXTENSION/OTHER/LG:BridgeExitStrategy', type: 'string' },
  { code: 'MEG-0009', field: 'prepay_penalty_type', xpath: 'EXTENSION/OTHER/LG:PrepayPenaltyType', type: 'string' },
  { code: 'MEG-0010', field: 'prepay_penalty_term_months', xpath: 'EXTENSION/OTHER/LG:PrepayPenaltyTermMonths', type: 'integer' },
  { code: 'MEG-0011', field: 'dscr', xpath: 'EXTENSION/OTHER/LG:DSCR', type: 'decimal' },
  { code: 'MEG-0012', field: 'monthly_pitia', xpath: 'EXTENSION/OTHER/LG:MonthlyPITIA', type: 'decimal' },
  { code: 'MEG-0013', field: 'gross_rent_monthly', xpath: 'PROPERTY/EXTENSION/OTHER/LG:GrossRentMonthly', type: 'decimal' },
  { code: 'MEG-0014', field: 'other_income_monthly', xpath: 'PROPERTY/EXTENSION/OTHER/LG:OtherIncomeMonthly', type: 'decimal' },
  { code: 'MEG-0015', field: 'maintenance_monthly', xpath: 'PROPERTY/EXTENSION/OTHER/LG:MaintenanceMonthly', type: 'decimal' },
  { code: 'MEG-0016', field: 'year_built', xpath: 'PROPERTY/EXTENSION/OTHER/LG:YearBuilt', type: 'integer' },
  { code: 'MEG-0017', field: 'sqft', xpath: 'PROPERTY/EXTENSION/OTHER/LG:SquareFootage', type: 'integer' },
  { code: 'MEG-0018', field: 'lot_sqft', xpath: 'PROPERTY/EXTENSION/OTHER/LG:LotSquareFootage', type: 'integer' },
  { code: 'MEG-0019', field: 'beds', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Bedrooms', type: 'integer' },
  { code: 'MEG-0020', field: 'baths', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Bathrooms', type: 'decimal' },
  { code: 'MEG-0021', field: 'stories', xpath: 'PROPERTY/EXTENSION/OTHER/LG:Stories', type: 'integer' },
  { code: 'MEG-0022', field: 'pool', xpath: 'PROPERTY/EXTENSION/OTHER/LG:HasPool', type: 'boolean' },
  { code: 'MEG-0023', field: 'hoa_name', xpath: 'PROPERTY/EXTENSION/OTHER/LG:HOAName', type: 'string' },
  { code: 'MEG-0024', field: 'month_year_acquired', xpath: 'PROPERTY/EXTENSION/OTHER/LG:MonthYearAcquired', type: 'string' },
  { code: 'MEG-0025', field: 'deal_number', xpath: 'EXTENSION/OTHER/LG:DealNumber', type: 'string' },
];

export default function XMLValidatorPanel() {
  const [activeTab, setActiveTab] = useState('upload');
  const [xmlContent, setXmlContent] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [schemaPack, setSchemaPack] = useState('standard');

  const validateMutation = useMutation({
    mutationFn: async (xml) => {
      return base44.functions.invoke('mismoSchemaValidator', {
        xml_content: xml,
        schema_pack: schemaPack,
        context: 'import',
      });
    },
    onSuccess: (result) => {
      setValidationResult(result.data);
      if (result.data.validation_status === 'PASS') {
        toast.success('XML validation passed!');
      } else if (result.data.validation_status === 'PASS_WITH_WARNINGS') {
        toast.warning('XML valid with warnings');
      } else {
        toast.error('XML validation failed');
      }
    },
    onError: (err) => {
      toast.error('Validation error: ' + err.message);
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast.error('Please upload an XML file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      setXmlContent(content);
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
  };

  const handleValidate = () => {
    if (!xmlContent.trim()) {
      toast.error('Please upload or paste XML content');
      return;
    }
    validateMutation.mutate(xmlContent);
  };

  const downloadSchemaPack = () => {
    const packInfo = JSON.stringify(SCHEMA_PACK, null, 2);
    const blob = new Blob([packInfo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-pack-${SCHEMA_PACK.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Schema Pack downloaded');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-blue-600" />
          XML Validator & Schema Inspector
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload & Validate
            </TabsTrigger>
            <TabsTrigger value="schemapack" className="gap-2">
              <Package className="h-4 w-4" />
              Schema Pack
            </TabsTrigger>
            <TabsTrigger value="namespaces" className="gap-2">
              <Code className="h-4 w-4" />
              Namespaces
            </TabsTrigger>
            <TabsTrigger value="extensions" className="gap-2">
              <List className="h-4 w-4" />
              Extension Registry
            </TabsTrigger>
          </TabsList>

          {/* Upload & Validate Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Upload XML File</label>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="w-48">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Schema Pack</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={schemaPack}
                  onChange={(e) => setSchemaPack(e.target.value)}
                >
                  <option value="standard">Standard (MISMO 3.4)</option>
                  <option value="strict">Strict (DU Wrapper)</option>
                </select>
              </div>
              <Button
                onClick={handleValidate}
                disabled={!xmlContent || validateMutation.isPending}
                className="gap-2"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Validate
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Or Paste XML Content</label>
              <Textarea
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
                placeholder="Paste MISMO 3.4 XML here..."
                className="font-mono text-xs h-48"
              />
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`border rounded-lg p-4 ${
                  validationResult.validation_status === 'PASS'
                    ? 'bg-green-50 border-green-200'
                    : validationResult.validation_status === 'PASS_WITH_WARNINGS'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {validationResult.validation_status === 'PASS' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : validationResult.validation_status === 'PASS_WITH_WARNINGS' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`font-medium ${
                        validationResult.validation_status === 'PASS'
                          ? 'text-green-800'
                          : validationResult.validation_status === 'PASS_WITH_WARNINGS'
                          ? 'text-yellow-800'
                          : 'text-red-800'
                      }`}
                    >
                      Validation: {validationResult.validation_status}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {validationResult.schema_pack}
                    </Badge>
                  </div>
                </div>

                {/* Summary Checks */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    {validationResult.report?.summary?.well_formed ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Well-formed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {validationResult.report?.summary?.structure_valid ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Structure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {validationResult.report?.summary?.data_valid ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span>Data Types</span>
                  </div>
                </div>

                {/* Grouped Errors */}
                {validationResult.report?.errors?.length > 0 && (
                  <div className="mt-3 p-2 bg-red-100 rounded text-sm">
                    <p className="font-medium text-red-800 mb-1">
                      Errors ({validationResult.report.errors.length}):
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {validationResult.report.errors.map((e, i) => (
                        <div key={i} className="text-red-700 font-mono text-xs">
                          <span className="bg-red-200 px-1 rounded">{e.code}</span> Line {e.line}:{' '}
                          {e.message}
                          {e.xpath && <span className="text-red-500 ml-1">({e.xpath})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped Warnings */}
                {validationResult.report?.warnings?.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-100 rounded text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                      Warnings ({validationResult.report.warnings.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {validationResult.report.warnings.map((w, i) => (
                        <div key={i} className="text-yellow-700 font-mono text-xs">
                          <span className="bg-yellow-200 px-1 rounded">{w.code}</span> Line {w.line}:{' '}
                          {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Schema Pack Tab */}
          <TabsContent value="schemapack" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Production Schema Pack</h3>
                <p className="text-sm text-gray-500">
                  Currently deployed schema configuration for MISMO validation
                </p>
              </div>
              <Button variant="outline" onClick={downloadSchemaPack} className="gap-2">
                <Download className="h-4 w-4" />
                Download Pack
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Pack Version</p>
                <p className="font-mono font-semibold">{SCHEMA_PACK.version}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Build Date</p>
                <p className="font-mono font-semibold">{SCHEMA_PACK.build_date}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">MISMO Version</p>
                <p className="font-mono font-semibold">{SCHEMA_PACK.mismo_version}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">MISMO Build</p>
                <p className="font-mono font-semibold">{SCHEMA_PACK.mismo_build}</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Schema Location</p>
                  <p className="font-mono text-xs mt-1">{SCHEMA_PACK.schema_locations.MISMO}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Namespaces Tab */}
          <TabsContent value="namespaces" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Namespace Declarations</h3>
              <p className="text-sm text-gray-500 mb-4">
                XML namespace prefixes and URIs used in MISMO exports
              </p>
            </div>

            <div className="space-y-2">
              {Object.entries(SCHEMA_PACK.namespaces).map(([prefix, uri]) => (
                <div key={prefix} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Badge variant="outline" className="font-mono">
                      xmlns:{prefix}
                    </Badge>
                  </div>
                  <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded">{uri}</code>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Extension Registry Tab */}
          <TabsContent value="extensions" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Extension Registry</h3>
              <p className="text-sm text-gray-500 mb-4">
                LoanGenius custom extension fields mapped to MISMO EXTENSION elements
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 font-medium">Code</th>
                    <th className="text-left p-2 font-medium">Field</th>
                    <th className="text-left p-2 font-medium">XPath</th>
                    <th className="text-left p-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {EXTENSION_REGISTRY.map((ext) => (
                    <tr key={ext.code} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">
                        <Badge variant="outline">{ext.code}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{ext.field}</td>
                      <td className="p-2 font-mono text-xs text-gray-600">{ext.xpath}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-xs">
                          {ext.type}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}