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
} from 'lucide-react';
import { toast } from 'sonner';

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
      { id: 'deal_create', name: 'Deal Creation', function: 'createOrUpdateDeal', description: 'Tests creating a new deal with borrowers and properties' },
      { id: 'ai_status', name: 'AI Service Status', function: 'aiStatus', description: 'Checks if AI services are operational' },
      { id: 'ai_chat', name: 'AI Chat Response', function: 'aiAssistantChat', description: 'Tests AI assistant chat functionality' },
    ],
    'MISMO Export': [
      { id: 'export_generic', name: 'Generic MISMO 3.4 Export', function: 'exportDealMISMO', description: 'Requires existing deal' },
      { id: 'export_profile', name: 'Profile-Based Export', function: 'exportWithProfile', description: 'Requires deal and profile' },
    ],
    'Workflows': [
      { id: 'autosave', name: 'BPA Wizard Autosave', function: 'applicationAutosave', description: 'Requires existing application' },
      { id: 'resume', name: 'Resume Application', function: 'applicationResume', description: 'Requires resume token' },
      { id: 'submit', name: 'Submit Application', function: 'applicationSubmit', description: 'Requires completed application' },
    ],
    'Integrations': [
      { id: 'sheets_import', name: 'Google Sheets Import', function: 'importLeadsFromGoogleSheets', description: 'Requires Sheets configuration' },
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
          <Card>
            <CardHeader>
              <CardTitle>MISMO 3.4 Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>MISMO validation tests coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}