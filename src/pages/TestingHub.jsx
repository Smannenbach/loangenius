import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FlaskConical, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  FileCode,
  Database,
  Workflow,
  AlertTriangle,
  Network,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MISMORelationshipGraph from '@/components/MISMORelationshipGraph';

function MISMOTestPanel() {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [mismoResult, setMismoResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [schemaPack, setSchemaPack] = useState('standard');
  
  const { data: deals = [] } = useQuery({
    queryKey: ['mismoTestDeals'],
    queryFn: () => base44.entities.Deal.list(),
  });
  
  const runMISMOTest = async () => {
    if (!selectedDeal) {
      toast.error('Please select a deal first');
      return;
    }
    
    setIsLoading(true);
    setValidationResult(null);
    try {
      const result = await base44.functions.invoke('generateMISMO34', { deal_id: selectedDeal });
      setMismoResult(result.data);
      
      // Auto-validate generated XML
      if (result.data?.xml_content) {
        setIsValidating(true);
        const validation = await base44.functions.invoke('mismoSchemaValidator', {
          xml_content: result.data.xml_content,
          schema_pack: schemaPack,
          context: 'export'
        });
        setValidationResult(validation.data);
        setIsValidating(false);
        
        if (validation.data.validation_status === 'FAIL') {
          toast.error('XSD validation failed - download blocked');
        } else if (validation.data.validation_status === 'PASS_WITH_WARNINGS') {
          toast.warning('XML generated with warnings');
        } else {
          toast.success('MISMO 3.4 XML validated successfully!');
        }
      }
    } catch (err) {
      toast.error('MISMO generation failed: ' + err.message);
      setMismoResult({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadXML = () => {
    if (!mismoResult?.xml_content) return;
    if (validationResult?.validation_status === 'FAIL') {
      toast.error('Cannot download - XSD validation failed');
      return;
    }
    const blob = new Blob([mismoResult.xml_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mismoResult.filename || 'mismo_34_export.xml';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Select Deal</label>
          <select 
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={selectedDeal || ''}
            onChange={(e) => setSelectedDeal(e.target.value)}
          >
            <option value="">Select a deal...</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.deal_number || d.id} - ${(d.loan_amount || 0).toLocaleString()} {d.loan_product}
              </option>
            ))}
          </select>
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
          onClick={runMISMOTest} 
          disabled={!selectedDeal || isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Generate & Validate
        </Button>
      </div>
      
      {deals.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">No deals found</p>
          <Link to={createPageUrl('LoanApplicationWizard')} className="text-blue-600 hover:underline text-sm">
            Create a deal first →
          </Link>
        </div>
      )}
      
      {/* XSD Validation Report */}
      {validationResult && (
        <div className={`border rounded-lg p-4 ${
          validationResult.validation_status === 'PASS' ? 'bg-green-50 border-green-200' :
          validationResult.validation_status === 'PASS_WITH_WARNINGS' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {validationResult.validation_status === 'PASS' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : validationResult.validation_status === 'PASS_WITH_WARNINGS' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                validationResult.validation_status === 'PASS' ? 'text-green-800' :
                validationResult.validation_status === 'PASS_WITH_WARNINGS' ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                XSD Validation: {validationResult.validation_status}
              </span>
              <Badge variant="outline" className="text-xs">
                {validationResult.schema_pack}
              </Badge>
            </div>
            {validationResult.validation_status !== 'FAIL' && (
              <Button variant="outline" size="sm" onClick={downloadXML} className="gap-1">
                <FileCode className="h-3 w-3" />
                Download XML
              </Button>
            )}
          </div>
          
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              {validationResult.report?.summary?.well_formed ? 
                <CheckCircle className="h-3 w-3 text-green-600" /> : 
                <XCircle className="h-3 w-3 text-red-600" />}
              <span>Well-formed</span>
            </div>
            <div className="flex items-center gap-1">
              {validationResult.report?.summary?.structure_valid ? 
                <CheckCircle className="h-3 w-3 text-green-600" /> : 
                <XCircle className="h-3 w-3 text-red-600" />}
              <span>Structure</span>
            </div>
            <div className="flex items-center gap-1">
              {validationResult.report?.summary?.data_valid ? 
                <CheckCircle className="h-3 w-3 text-green-600" /> : 
                <XCircle className="h-3 w-3 text-red-600" />}
              <span>Data Types</span>
            </div>
          </div>

          {/* Errors */}
          {validationResult.report?.errors?.length > 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded text-sm">
              <p className="font-medium text-red-800 mb-1">Errors ({validationResult.report.errors.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {validationResult.report.errors.map((e, i) => (
                  <div key={i} className="text-red-700 font-mono text-xs">
                    <span className="bg-red-200 px-1 rounded">{e.code}</span> Line {e.line}: {e.message}
                    {e.xpath && <span className="text-red-500 ml-1">({e.xpath})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.report?.warnings?.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-100 rounded text-sm">
              <p className="font-medium text-yellow-800 mb-1">Warnings ({validationResult.report.warnings.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {validationResult.report.warnings.map((w, i) => (
                  <div key={i} className="text-yellow-700 font-mono text-xs">
                    <span className="bg-yellow-200 px-1 rounded">{w.code}</span> Line {w.line}: {w.message}
                    {w.xpath && <span className="text-yellow-600 ml-1">({w.xpath})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File info (only show if we have result and validation passed) */}
      {mismoResult && !mismoResult.error && validationResult?.validation_status !== 'FAIL' && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Filename:</span> {mismoResult.filename}
            </div>
            <div>
              <span className="text-gray-600">Size:</span> {(mismoResult.byte_size / 1024).toFixed(1)} KB
            </div>
            {mismoResult.deal_summary && (
              <>
                <div>
                  <span className="text-gray-600">Borrowers:</span> {mismoResult.deal_summary.borrower_count || 0}
                </div>
                <div>
                  <span className="text-gray-600">Properties:</span> {mismoResult.deal_summary.property_count || 0}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {mismoResult?.error && (
        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Generation Failed</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{mismoResult.error}</p>
        </div>
      )}
    </div>
  );
}

export default function TestingHub() {
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());

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

  const testSuites = {
    'Core Functions': [
      { id: 'ai_status', name: 'AI Service Status', function: 'aiStatus', description: 'Checks if AI services are operational' },
      { id: 'ai_chat', name: 'AI Chat Response', function: 'aiAssistantChat', description: 'Tests AI assistant chat functionality' },
      { id: 'dashboard_kpi', name: 'Dashboard KPIs', function: 'getDashboardKPIs', description: 'Tests dashboard KPI loading' },
    ],
    'MISMO Export': [
      { id: 'mismo_34', name: 'MISMO 3.4 Export', function: 'generateMISMO34', description: 'Tests MISMO 3.4 XML generation' },
      { id: 'export_generic', name: 'Generic Deal Export', function: 'exportDealMISMO', description: 'Requires existing deal' },
    ],
    'Workflows': [
      { id: 'autosave', name: 'BPA Wizard Autosave', function: 'applicationAutosave', description: 'Requires existing application' },
      { id: 'prequal', name: 'Pre-Qualification Check', function: 'preQualifyBorrower', description: 'Tests pre-qualification logic' },
    ],
    'Integrations': [
      { id: 'sheets_import', name: 'Google Sheets Import', function: 'importLeadsFromGoogleSheets', description: 'Requires Sheets configuration' },
      { id: 'send_email', name: 'Send Email', function: 'sendCommunication', description: 'Tests email sending' },
    ],
  };

  const runTest = async (testId, functionName) => {
    setRunningTests(prev => new Set([...prev, testId]));
    
    try {
      let payload = {};
      
      // Configure test payloads based on function requirements
      switch (functionName) {
        case 'exportDealMISMO':
          // This needs a real deal_id, so we skip with a message
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires existing deal - create a deal first to test export',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'exportWithProfile':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires existing deal and profile - create both to test',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'createOrUpdateDeal':
          payload = {
            action: 'create',
            dealData: {
              loan_product: 'DSCR',
              loan_purpose: 'Purchase',
              loan_amount: 500000,
              interest_rate: 7.5,
              loan_term_months: 360,
              borrowers: [{
                firstName: 'Test',
                lastName: 'Borrower',
                email: 'test@example.com',
                phone: '555-555-5555',
                role: 'primary'
              }],
              properties: [{
                street: '123 Test St',
                city: 'Test City',
                state: 'CA',
                zip: '90210',
                propertyType: 'SFR',
                occupancyType: 'Investment'
              }]
            }
          };
          break;
          
        case 'aiStatus':
          payload = {};
          break;
          
        case 'aiAssistantChat':
          payload = { message: 'What is DSCR?', conversation_context: [] };
          break;
          
        case 'getDashboardKPIs':
          payload = { org_id: orgId, period: 'month' };
          break;
          
        case 'generateMISMO34':
          // Get a real deal to test with
          try {
            const deals = await base44.entities.Deal.list();
            if (deals.length > 0) {
              payload = { deal_id: deals[0].id };
            } else {
              setTestResults(prev => ({
                ...prev,
                [testId]: {
                  status: 'skip',
                  message: 'No deals found - create a deal first to test MISMO export',
                },
              }));
              setRunningTests(prev => {
                const next = new Set(prev);
                next.delete(testId);
                return next;
              });
              return;
            }
          } catch (e) {
            setTestResults(prev => ({
              ...prev,
              [testId]: {
                status: 'fail',
                message: 'Failed to fetch deals: ' + e.message,
              },
            }));
            setRunningTests(prev => {
              const next = new Set(prev);
              next.delete(testId);
              return next;
            });
            return;
          }
          break;
          
        case 'preQualifyBorrower':
          payload = {
            borrower_data: {
              credit_score: 720,
              annual_income: 150000,
              total_debt: 2000,
            },
            loan_data: {
              loan_amount: 500000,
              property_value: 625000,
              loan_type: 'DSCR',
            }
          };
          break;
          
        case 'sendCommunication':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Email test skipped - would send actual email',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'applicationAutosave':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires existing application - start an application first',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'applicationResume':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires resume token - start an application first',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'applicationSubmit':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires completed application - complete an application first',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        case 'syncGoogleSheets':
        case 'importLeadsFromGoogleSheets':
          setTestResults(prev => ({
            ...prev,
            [testId]: {
              status: 'skip',
              message: 'Requires Google Sheets configuration',
            },
          }));
          setRunningTests(prev => {
            const next = new Set(prev);
            next.delete(testId);
            return next;
          });
          return;
          
        default:
          payload = {};
      }

      const result = await base44.functions.invoke(functionName, payload);
      
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'pass',
          message: 'Test passed successfully',
          data: result.data,
        },
      }));
      
      toast.success(`✓ ${testId} passed`);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'fail',
          message: errorMsg,
          error,
        },
      }));
      
      toast.error(`✗ ${testId} failed: ${errorMsg}`);
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const runAllTests = async (category) => {
    const tests = testSuites[category];
    for (const test of tests) {
      await runTest(test.id, test.function);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-purple-600" />
            Testing & Validation Hub
          </h1>
          <p className="text-gray-500 mt-1">Comprehensive system testing and validation</p>
        </div>
      </div>

      <Tabs defaultValue="functional">
        <TabsList>
          <TabsTrigger value="functional" className="gap-2">
            <Workflow className="h-4 w-4" />
            Functional Tests
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Data Integrity
          </TabsTrigger>
          <TabsTrigger value="mismo" className="gap-2">
            <FileCode className="h-4 w-4" />
            MISMO Validation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functional" className="space-y-6 mt-6">
          {Object.entries(testSuites).map(([category, tests]) => (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAllTests(category)}
                    className="gap-2"
                  >
                    <Play className="h-3 w-3" />
                    Run All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tests.map((test) => {
                    const result = testResults[test.id];
                    const isRunning = runningTests.has(test.id);
                    
                    return (
                      <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          ) : result?.status === 'pass' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : result?.status === 'fail' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : result?.status === 'skip' ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{test.name}</p>
                            <p className="text-xs text-gray-400">{test.description}</p>
                            {result?.message && (
                              <p className={`text-xs mt-1 ${
                                result.status === 'fail' ? 'text-red-600' : 
                                result.status === 'skip' ? 'text-yellow-600' : 
                                result.status === 'pass' ? 'text-green-600' :
                                'text-gray-500'
                              }`}>
                                {result.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runTest(test.id, test.function)}
                          disabled={isRunning}
                        >
                          {isRunning ? 'Running...' : 'Run'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Integrity Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Data integrity tests coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mismo" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MISMO 3.4 Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Test MISMO 3.4 XML export with real deal data</p>
                <MISMOTestPanel />
              </CardContent>
            </Card>
            
            {/* Relationship Graph Debug */}
            <MISMORelationshipGraph />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}