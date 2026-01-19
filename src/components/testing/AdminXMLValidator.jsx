import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Play, Loader2, FileCode, Shield, Hash, Box, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ConformanceReportViewer from './ConformanceReportViewer';

export default function AdminXMLValidator() {
  const [xmlContent, setXmlContent] = useState('');
  const [packId, setPackId] = useState('PACK_A_GENERIC_MISMO_34_B324');
  const [validationReport, setValidationReport] = useState(null);
  const [structureInfo, setStructureInfo] = useState(null);
  const [extensionSummary, setExtensionSummary] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setXmlContent(event.target.result);
      toast.success('File loaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!xmlContent.trim()) {
        throw new Error('No XML content to validate');
      }

      // Call validation function
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'validate_xml',
        xml_content: xmlContent,
        pack_id: packId
      });

      return response.data;
    },
    onSuccess: (data) => {
      setValidationReport(data.validation);
      analyzeStructure();
      analyzeExtensions();
      
      if (data.validation.status === 'PASS') {
        toast.success('✓ Validation passed!');
      } else if (data.validation.status === 'PASS_WITH_WARNINGS') {
        toast.warning(`Passed with ${data.validation.warnings.length} warning(s)`);
      } else {
        toast.error(`Validation failed with ${data.validation.errors.length} error(s)`);
      }
    },
    onError: (error) => {
      toast.error('Validation failed: ' + error.message);
    }
  });

  const analyzeStructure = () => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const root = xmlDoc.documentElement;

      const info = {
        root_element: root.tagName,
        namespaces: extractNamespaces(root),
        mismo_version: extractTextContent(xmlDoc, 'MISMOVersionIdentifier'),
        ldd_identifier: extractTextContent(xmlDoc, 'MISMOLogicalDataDictionaryIdentifier'),
        party_count: xmlDoc.getElementsByTagName('PARTY').length,
        asset_count: xmlDoc.getElementsByTagName('ASSET').length,
        reo_count: xmlDoc.getElementsByTagName('REO_PROPERTY').length,
        declaration_count: xmlDoc.getElementsByTagName('DECLARATION').length,
      };

      setStructureInfo(info);
    } catch (e) {
      setStructureInfo({ error: e.message });
    }
  };

  const analyzeExtensions = () => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      const extensions = xmlDoc.getElementsByTagName('EXTENSION');
      const summary = {
        total_extensions: extensions.length,
        namespaces_found: [],
        lg_fields: []
      };

      for (let i = 0; i < extensions.length; i++) {
        const ext = extensions[i];
        const otherElement = ext.getElementsByTagName('OTHER')[0];
        
        if (otherElement) {
          // Find all namespace declarations
          const attrs = otherElement.attributes;
          for (let j = 0; j < attrs.length; j++) {
            if (attrs[j].name.startsWith('xmlns:')) {
              const prefix = attrs[j].name.replace('xmlns:', '');
              summary.namespaces_found.push({
                prefix,
                uri: attrs[j].value
              });
            }
          }

          // Find LG fields
          const children = otherElement.childNodes;
          for (let j = 0; j < children.length; j++) {
            const child = children[j];
            if (child.nodeType === 1) {
              const tagName = child.tagName || child.nodeName;
              if (tagName.startsWith('LG:')) {
                summary.lg_fields.push({
                  name: tagName,
                  value: child.textContent?.substring(0, 50)
                });
              }
            }
          }
        }
      }

      setExtensionSummary(summary);
    } catch (e) {
      setExtensionSummary({ error: e.message });
    }
  };

  const extractNamespaces = (element) => {
    const namespaces = [];
    const attrs = element.attributes;
    for (let i = 0; i < attrs.length; i++) {
      if (attrs[i].name.startsWith('xmlns')) {
        namespaces.push({
          declaration: attrs[i].name,
          uri: attrs[i].value
        });
      }
    }
    return namespaces;
  };

  const extractTextContent = (xmlDoc, tagName) => {
    const elements = xmlDoc.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent?.trim() : null;
  };

  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xlink="http://www.w3.org/1999/xlink">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <DataVersionIdentifier>MISMO_3.4.0_B324</DataVersionIdentifier>
      <MISMOLogicalDataDictionaryIdentifier>MISMO_3.4.0_B324</MISMOLogicalDataDictionaryIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <LOAN_DETAIL>
                <LoanPurposeType>Purchase</LoanPurposeType>
              </LOAN_DETAIL>
            </LOAN>
          </LOANS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Admin XML Validator
          </CardTitle>
          <CardDescription>
            Upload and validate MISMO XML files without external tooling
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
                id="xml-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('xml-upload').click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload XML
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setXmlContent(sampleXml)}
            >
              Load Sample
            </Button>
          </div>

          <div>
            <Label>XML Content</Label>
            <Textarea
              value={xmlContent}
              onChange={(e) => setXmlContent(e.target.value)}
              placeholder="Paste MISMO XML here or upload a file..."
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <Button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending || !xmlContent.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {validateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Validating...</>
            ) : (
              <><Play className="h-4 w-4" />Run Validation</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Structure Analysis */}
      {structureInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-blue-600" />
              XML Structure Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {structureInfo.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                Parse error: {structureInfo.error}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">Root Element</div>
                    <div className="font-mono font-semibold">{structureInfo.root_element}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">MISMO Version</div>
                    <div className="font-semibold">{structureInfo.mismo_version || 'Not found'}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">LDD Identifier</div>
                    <div className="font-mono text-xs">{structureInfo.ldd_identifier || 'Not found'}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded text-center">
                    <div className="text-2xl font-bold text-blue-700">{structureInfo.party_count}</div>
                    <div className="text-xs text-gray-600">Parties</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded text-center">
                    <div className="text-2xl font-bold text-green-700">{structureInfo.asset_count}</div>
                    <div className="text-xs text-gray-600">Assets</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded text-center">
                    <div className="text-2xl font-bold text-purple-700">{structureInfo.reo_count}</div>
                    <div className="text-xs text-gray-600">REO</div>
                  </div>
                </div>

                {structureInfo.namespaces?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Namespaces</h4>
                    <div className="space-y-1">
                      {structureInfo.namespaces.map((ns, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded font-mono">
                          <code className="text-blue-600 font-bold">{ns.declaration}</code>
                          <code className="text-gray-600 break-all">{ns.uri}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extension Analysis */}
      {extensionSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-green-600" />
              Extension Nodes Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extensionSummary.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                Analysis error: {extensionSummary.error}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center flex-1">
                    <div className="text-2xl font-bold text-green-700">{extensionSummary.total_extensions}</div>
                    <div className="text-xs text-gray-600">Extension Blocks</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center flex-1">
                    <div className="text-2xl font-bold text-blue-700">{extensionSummary.namespaces_found.length}</div>
                    <div className="text-xs text-gray-600">Custom Namespaces</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center flex-1">
                    <div className="text-2xl font-bold text-purple-700">{extensionSummary.lg_fields.length}</div>
                    <div className="text-xs text-gray-600">LG Fields</div>
                  </div>
                </div>

                {extensionSummary.namespaces_found.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Extension Namespaces</h4>
                    <div className="space-y-1">
                      {extensionSummary.namespaces_found.map((ns, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded">
                          <Badge variant="outline">{ns.prefix}</Badge>
                          <code className="text-gray-600 text-xs break-all">{ns.uri}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extensionSummary.lg_fields.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">LoanGenius Extension Fields</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {extensionSummary.lg_fields.slice(0, 10).map((field, idx) => (
                        <div key={idx} className="p-2 bg-green-50 rounded text-xs">
                          <code className="font-bold text-green-700">{field.name}</code>
                          <div className="text-gray-600 mt-1 truncate">{field.value}</div>
                        </div>
                      ))}
                    </div>
                    {extensionSummary.lg_fields.length > 10 && (
                      <p className="text-xs text-gray-500 mt-2">
                        ...and {extensionSummary.lg_fields.length - 10} more fields
                      </p>
                    )}
                  </div>
                )}

                {extensionSummary.total_extensions === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No EXTENSION blocks found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Report */}
      {validationReport && (
        <ConformanceReportViewer 
          report={{
            report_id: `ADMIN-${Date.now()}`,
            run_id: 'admin-validation',
            context: 'admin-upload',
            status: validationReport.status,
            pack_info: {
              pack_id: packId,
              mismo_version: '3.4.0',
              build: 'B324'
            },
            summary: {
              total_errors: validationReport.errors?.length || 0,
              total_warnings: validationReport.warnings?.length || 0,
              by_category: categorizeIssues(validationReport)
            },
            errors: validationReport.errors || [],
            warnings: validationReport.warnings || [],
            metadata: {
              generated_at: new Date().toISOString(),
              generated_by: 'admin-validator',
              pii_redacted: true
            }
          }}
        />
      )}
    </div>
  );
}

function categorizeIssues(validation) {
  const errors = validation.errors || [];
  const warnings = validation.warnings || [];
  
  return {
    well_formedness: errors.filter(e => e.category === 'well-formedness').length,
    xsd: errors.filter(e => e.category === 'structure' || e.category === 'xsd').length,
    enum: 0,
    missing_required: 0,
    conditionality: 0,
    mapping_gaps: warnings.length
  };
}