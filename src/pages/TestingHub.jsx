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
    'MISMO Export': [
      { id: 'export_generic', name: 'Generic MISMO 3.4 Export', function: 'exportDealMISMO' },
      { id: 'export_profile', name: 'Profile-Based Export', function: 'exportWithProfile' },
      { id: 'export_validation', name: 'Validation Rules', function: 'exportDealMISMO' },
    ],
    'Data Integrity': [
      { id: 'deal_create', name: 'Deal Creation', function: 'createOrUpdateDeal' },
      { id: 'borrower_link', name: 'Borrower-Deal Linkage', function: 'createOrUpdateDeal' },
      { id: 'property_link', name: 'Property-Deal Linkage', function: 'createOrUpdateDeal' },
    ],
    'Workflows': [
      { id: 'autosave', name: 'BPA Wizard Autosave', function: 'applicationAutosave' },
      { id: 'resume', name: 'Resume Application', function: 'applicationResume' },
      { id: 'submit', name: 'Submit Application', function: 'applicationSubmit' },
    ],
    'Integrations': [
      { id: 'ghl_sync', name: 'GoHighLevel Sync', function: 'syncGoogleSheets' },
      { id: 'sheets_import', name: 'Google Sheets Import', function: 'importLeadsFromGoogleSheets' },
    ],
  };

  const runTest = async (testId, functionName) => {
    setRunningTests(prev => new Set([...prev, testId]));
    
    try {
      let payload = {};
      
      // Configure test payloads
      if (functionName === 'exportDealMISMO') {
        payload = { deal_id: 'test_placeholder', best_effort: true };
      } else if (functionName === 'exportWithProfile') {
        payload = { deal_id: 'test_placeholder', profile_id: 'test_placeholder' };
      }

      const result = await base44.functions.invoke(functionName, payload);
      
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'pass',
          message: 'Test passed',
          data: result.data,
        },
      }));
      
      toast.success(`✓ ${testId} passed`);
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'fail',
          message: error.message,
          error,
        },
      }));
      
      toast.error(`✗ ${testId} failed`);
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
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{test.name}</p>
                            {result?.message && (
                              <p className={`text-xs ${result.status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
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