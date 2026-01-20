import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Info, RefreshCw, Download, FileCode, Shield, Zap, Hash
} from 'lucide-react';
import { toast } from 'sonner';

export default function MISMOValidator() {
  const [xmlContent, setXmlContent] = useState('');
  const [selectedPack, setSelectedPack] = useState('PACK_A_GENERIC_MISMO_34_B324');
  const [validationResult, setValidationResult] = useState(null);
  const [conformanceReport, setConformanceReport] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Fetch available schema packs
  const { data: packsData } = useQuery({
    queryKey: ['mismo-schema-packs'],
    queryFn: async () => {
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'list_packs'
      });
      return response.data;
    }
  });

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setXmlContent(e.target?.result || '');
        setValidationResult(null);
        setConformanceReport(null);
      };
      reader.readAsText(file);
    }
  }, []);

  // Run validation
  const runValidation = async () => {
    if (!xmlContent.trim()) return;

    setIsValidating(true);
    setValidationResult(null);
    setConformanceReport(null);

    try {
      // Step 1: Validate XML
      const validationResponse = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'validate_xml',
        xml_content: xmlContent,
        pack_id: selectedPack
      });

      setValidationResult(validationResponse.data);

      // Step 2: Generate conformance report
      const reportResponse = await base44.functions.invoke('mismoConformanceReport', {
        action: 'generate',
        context: 'import',
        validation_result: validationResponse.data?.validation,
        pack_id: selectedPack,
        run_id: `VAL-${Date.now()}`
      });

      setConformanceReport(reportResponse.data?.report);

    } catch (error) {
      setValidationResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Compute hash
  const computeHash = async () => {
    if (!xmlContent.trim()) return;

    try {
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'compute_hash',
        xml_content: xmlContent
      });
      
      if (response.data?.success) {
        toast.success(`Hash: ${response.data.hash} (${response.data.content_length} bytes)`);
        toast.info(`Content Hash: ${response.data.hash.substring(0, 32)}...`, {
          description: `Length: ${response.data.content_length} bytes`,
          duration: 5000
        });
      }
    } catch (error) {
      toast.error('Hash computation failed');
    }
  };

  // Download sample
  const downloadSample = async () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xlink="http://www.w3.org/1999/xlink" MISMOVersionID="3.4.0">
  <MESSAGE_HEADER>
    <MISMOLogicalDataDictionaryIdentifier>urn:fdc:mismo.org:ldd:3.4.324</MISMOLogicalDataDictionaryIdentifier>
  </MESSAGE_HEADER>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN SequenceNumber="1">
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>SAMPLE-001</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <TERMS_OF_LOAN>
                <BaseLoanAmount>500000.00</BaseLoanAmount>
                <LoanPurposeType>Purchase</LoanPurposeType>
                <MortgageType>Conventional</MortgageType>
                <NoteRatePercent>7.250000</NoteRatePercent>
              </TERMS_OF_LOAN>
            </LOAN>
          </LOANS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

    setXmlContent(sampleXml);
    setUploadedFileName('sample.xml');
    setValidationResult(null);
    setConformanceReport(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />PASS</Badge>;
      case 'PASS_WITH_WARNINGS':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />PASS (Warnings)</Badge>;
      case 'FAIL':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />FAIL</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            MISMO XML Validator
          </h1>
          <p className="text-gray-500 mt-1">
            Validate MISMO v3.4 Build 324 XML files against schema packs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSample}>
            <Download className="w-4 h-4 mr-2" />
            Load Sample
          </Button>
          <Button variant="outline" onClick={computeHash} disabled={!xmlContent}>
            <Hash className="w-4 h-4 mr-2" />
            Compute Hash
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              XML Input
            </CardTitle>
            <CardDescription>
              Upload an XML file or paste content directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xml,text/xml"
                onChange={handleFileUpload}
                className="hidden"
                id="xml-upload"
              />
              <label htmlFor="xml-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {uploadedFileName || 'Click to upload XML file'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or drag and drop
                </p>
              </label>
            </div>

            {/* Schema Pack Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Schema Pack</label>
              <Select value={selectedPack} onValueChange={setSelectedPack}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packsData?.packs?.map(pack => (
                    <SelectItem key={pack.id} value={pack.id}>
                      <div className="flex items-center gap-2">
                        {pack.strict_mode && <Zap className="w-3 h-3 text-yellow-500" />}
                        {pack.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* XML Content */}
            <Textarea
              value={xmlContent}
              onChange={(e) => {
                setXmlContent(e.target.value);
                setValidationResult(null);
                setConformanceReport(null);
              }}
              placeholder="Paste MISMO XML content here..."
              className="font-mono text-xs h-64"
            />

            {/* Validate Button */}
            <Button 
              onClick={runValidation} 
              disabled={!xmlContent.trim() || isValidating}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validate XML
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Panel - Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Validation Results
              </span>
              {validationResult?.validation?.status && getStatusBadge(validationResult.validation.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!validationResult && !conformanceReport && (
              <div className="text-center py-12 text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Upload and validate an XML file to see results</p>
              </div>
            )}

            {validationResult && (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                  <TabsTrigger value="warnings">Warnings</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {validationResult.validation?.summary?.total_errors || 0}
                      </div>
                      <div className="text-xs text-red-600">Errors</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {validationResult.validation?.summary?.total_warnings || 0}
                      </div>
                      <div className="text-xs text-yellow-600">Warnings</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {validationResult.validation?.info?.length || 0}
                      </div>
                      <div className="text-xs text-blue-600">Info</div>
                    </div>
                  </div>

                  {/* Pack Info */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Schema Pack</AlertTitle>
                    <AlertDescription>
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Pack:</span> {validationResult.pack_id}</div>
                        <div><span className="font-medium">LDD:</span> {validationResult.ldd_identifier}</div>
                        <div><span className="font-medium">Hash:</span> <code className="text-xs">{validationResult.pack_hash?.substring(0, 20)}...</code></div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Categories */}
                  {conformanceReport?.categories && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Categories</h4>
                      <div className="space-y-1">
                        {Object.entries(conformanceReport.categories).map(([name, cat]) => (
                          <div key={name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                            <span className="capitalize">{name.replace(/_/g, ' ')}</span>
                            {getStatusBadge(cat.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {validationResult.validation?.errors?.map((error, idx) => (
                      <Alert key={idx} variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle className="flex items-center justify-between">
                          <span>{error.code}</span>
                          <Badge variant="outline" className="text-xs">Line {error.line}</Badge>
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                          <p>{error.message}</p>
                          {error.xpath && (
                            <code className="text-xs block mt-1 bg-red-100 p-1 rounded">{error.xpath}</code>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {(!validationResult.validation?.errors || validationResult.validation.errors.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p>No errors found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="warnings" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {validationResult.validation?.warnings?.map((warning, idx) => (
                      <Alert key={idx}>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <AlertTitle className="flex items-center justify-between">
                          <span>{warning.code}</span>
                          {warning.line && <Badge variant="outline" className="text-xs">Line {warning.line}</Badge>}
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                          <p>{warning.message}</p>
                          {warning.xpath && (
                            <code className="text-xs block mt-1 bg-yellow-100 p-1 rounded">{warning.xpath}</code>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {(!validationResult.validation?.warnings || validationResult.validation.warnings.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p>No warnings found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="info" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {validationResult.validation?.info?.map((info, idx) => (
                      <Alert key={idx}>
                        <Info className="h-4 w-4" />
                        <AlertTitle>{info.code}</AlertTitle>
                        <AlertDescription className="text-sm">
                          {info.message}
                          {info.namespaces && (
                            <div className="mt-2 space-y-1">
                              {info.namespaces.map((ns, i) => (
                                <div key={i} className="text-xs bg-gray-100 p-1 rounded">
                                  <span className="font-medium">{ns.prefix}:</span> {ns.uri}
                                </div>
                              ))}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {(!validationResult.validation?.info || validationResult.validation.info.length === 0) && (
                      <div className="text-center py-8 text-gray-400">
                        <Info className="w-8 h-8 mx-auto mb-2" />
                        <p>No additional information</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}