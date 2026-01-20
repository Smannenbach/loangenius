import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminRoute from '@/components/AdminRoute';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  Rocket,
  Search,
  Server,
  MousePointer,
  Link as LinkIcon,
  Bell,
  Filter,
  Copy,
  FileCode,
  Activity,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

// Import source files for QA analysis
const allSourceFiles = import.meta.glob('/src/**/*.{js,jsx}', { as: 'raw', eager: true });
const allFunctionFiles = import.meta.glob('/src/functions/*.js', { as: 'raw', eager: true });

// Known sidebar pages
const SIDEBAR_PAGES = [
  'Dashboard', 'Pipeline', 'Leads', 'Loans', 'Contacts',
  'QuoteGenerator', 'AIAssistant', 'DocumentIntelligenceHub', 'Conversations', 'EmailSequences', 'Reports',
  'Users', 'LenderIntegrations', 'TenantDomains', 'TenantBrandingSettings', 'PortalSettings', 'SystemDiagnostics',
  'Underwriting', 'ComplianceDashboard', 'MISMOExportProfiles', 'MISMOImportExport', 'MISMOValidator',
  'AdminIntegrations', 'Settings', 'AdminBilling',
];

function getExistingFunctions() {
  const functions = new Set();
  Object.keys(allFunctionFiles).forEach(path => {
    const match = path.match(/\/functions\/([^/]+)\.js$/);
    if (match) functions.add(match[1]);
  });
  return functions;
}

function analyzeSourceFiles() {
  const existingFunctions = getExistingFunctions();
  const missingFunctions = [];
  const deadButtons = [];
  const silentMutations = [];
  const brokenRoutes = [];
  
  Object.entries(allSourceFiles).forEach(([filePath, content]) => {
    if (!content || typeof content !== 'string') return;
    const fileName = filePath.split('/').pop();
    const isPage = filePath.includes('/pages/');
    const isComponent = filePath.includes('/components/');
    
    // Detect missing functions
    const functionInvokeRegex = /base44\.functions\.invoke\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = functionInvokeRegex.exec(content)) !== null) {
      const fnName = match[1];
      if (!existingFunctions.has(fnName)) {
        missingFunctions.push({ function: fnName, file: filePath.replace('/src/', '') });
      }
    }
    
    // Detect dead buttons
    const buttonRegex = /<Button\b[^>]*>/g;
    let buttonMatch;
    while ((buttonMatch = buttonRegex.exec(content)) !== null) {
      const buttonTag = buttonMatch[0];
      const hasOnClick = /onClick\s*=/.test(buttonTag);
      const isSubmit = /type\s*=\s*["']submit["']/.test(buttonTag);
      const isAsChild = /asChild/.test(buttonTag);
      const isDisabled = /disabled/.test(buttonTag);
      
      if (!hasOnClick && !isSubmit && !isAsChild && !isDisabled) {
        const contextStart = Math.max(0, buttonMatch.index - 150);
        const context = content.substring(contextStart, buttonMatch.index);
        const hasTrigger = /Trigger|asChild|<Link/.test(context);
        if (!hasTrigger) {
          deadButtons.push({
            file: filePath.replace('/src/', ''),
            line: content.substring(0, buttonMatch.index).split('\n').length,
            snippet: buttonTag.substring(0, 80)
          });
        }
      }
    }
    
    // Detect silent mutations
    const hasMutation = /useMutation|\.create\(|\.update\(|\.delete\(/.test(content);
    const hasToast = /toast\./.test(content);
    if (hasMutation && !hasToast && (isPage || isComponent)) {
      silentMutations.push({ file: filePath.replace('/src/', '') });
    }
  });
  
  // Check broken routes
  const existingPages = new Set();
  Object.keys(allSourceFiles).forEach(path => {
    if (path.includes('/pages/')) {
      const match = path.match(/\/pages\/([^/]+)\.(js|jsx)$/);
      if (match) existingPages.add(match[1]);
    }
  });
  
  SIDEBAR_PAGES.forEach(page => {
    if (!existingPages.has(page)) {
      brokenRoutes.push({ route: page });
    }
  });
  
  return {
    missingFunctions: [...new Map(missingFunctions.map(f => [f.function, f])).values()],
    deadButtons: deadButtons.slice(0, 20),
    silentMutations: silentMutations.slice(0, 20),
    brokenRoutes,
    existingFunctions: Array.from(existingFunctions),
    existingPages: Array.from(existingPages)
  };
}

export default function SystemDiagnostics() {
  return (
    <AdminRoute>
      <SystemDiagnosticsContent />
    </AdminRoute>
  );
}

function SystemDiagnosticsContent() {
  const [activeTab, setActiveTab] = useState('health');
  const [searchFilter, setSearchFilter] = useState('');
  const [lastScanTime, setLastScanTime] = useState(new Date());
  const { orgId, userRole } = useOrgId();

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testSystemHealth', {});
      return response.data;
    },
    refetchInterval: 30000,
  });

  const runE2EMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('e2eTestRunner', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast[data.ok ? 'success' : 'error'](data.ok ? 'All E2E tests passed' : 'Some E2E tests failed');
    },
  });

  const auditResults = useMemo(() => analyzeSourceFiles(), [lastScanTime]);

  const runAudit = () => {
    setLastScanTime(new Date());
    toast.success('Audit scan completed');
  };

  const passCount = health?.checks?.filter(c => c.status === 'pass').length || 0;
  const totalCount = health?.checks?.length || 0;
  const allPass = passCount === totalCount;

  const stats = {
    missingFunctions: auditResults.missingFunctions.length,
    deadButtons: auditResults.deadButtons.length,
    silentMutations: auditResults.silentMutations.length,
    brokenRoutes: auditResults.brokenRoutes.length,
  };

  const getStatusIcon = (status) => {
    if (status === 'pass') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'fail') return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'pass') return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
    if (status === 'fail') return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            System Diagnostics
          </h1>
          <p className="text-gray-600 mt-1">Health checks, preflight validation, and code quality audits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetchHealth(); runAudit(); }} disabled={healthLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className={allPass ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`h-5 w-5 ${allPass ? 'text-green-600' : 'text-yellow-600'}`} />
              <span className="text-sm text-gray-600">Health</span>
            </div>
            <p className={`text-2xl font-bold ${allPass ? 'text-green-700' : 'text-yellow-700'}`}>
              {passCount}/{totalCount}
            </p>
          </CardContent>
        </Card>
        
        <Card className={stats.missingFunctions === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Server className={`h-5 w-5 ${stats.missingFunctions === 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm text-gray-600">Functions</span>
            </div>
            <p className={`text-2xl font-bold ${stats.missingFunctions === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {stats.missingFunctions === 0 ? '✓' : stats.missingFunctions}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.brokenRoutes === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className={`h-5 w-5 ${stats.brokenRoutes === 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm text-gray-600">Routes</span>
            </div>
            <p className={`text-2xl font-bold ${stats.brokenRoutes === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {stats.brokenRoutes === 0 ? '✓' : stats.brokenRoutes}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.deadButtons === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer className={`h-5 w-5 ${stats.deadButtons === 0 ? 'text-green-600' : 'text-orange-600'}`} />
              <span className="text-sm text-gray-600">Buttons</span>
            </div>
            <p className={`text-2xl font-bold ${stats.deadButtons === 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {stats.deadButtons === 0 ? '✓' : stats.deadButtons}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Pages</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{auditResults.existingPages.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="health" className="gap-2">
            <Zap className="h-4 w-4" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="preflight" className="gap-2">
            <Rocket className="h-4 w-4" />
            Preflight
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Search className="h-4 w-4" />
            QA Audit
          </TabsTrigger>
        </TabsList>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card className={allPass ? 'border-green-500' : 'border-yellow-500'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Overall Status</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={health?.status === 'healthy' ? 'bg-green-100 text-green-800 text-lg px-4 py-2' : 'bg-yellow-100 text-yellow-800 text-lg px-4 py-2'}>
                    {health?.status?.toUpperCase() || 'CHECKING...'}
                  </Badge>
                  <Button onClick={() => runE2EMutation.mutate()} disabled={runE2EMutation.isPending} variant="outline">
                    {runE2EMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Run E2E Tests
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{health?.summary}</p>
              
              {healthLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Running health checks...</span>
                </div>
              ) : health?.checks ? (
                <div className="space-y-3">
                  {health.checks.map((check, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{check.name}</span>
                          {getStatusBadge(check.status)}
                        </div>
                        <p className="text-sm text-gray-600">{check.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No health data available</p>
              )}
            </CardContent>
          </Card>

          {runE2EMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle>E2E Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={runE2EMutation.data.ok ? 'bg-green-100 text-green-800 mb-4' : 'bg-red-100 text-red-800 mb-4'}>
                  {runE2EMutation.data.summary}
                </Badge>
                <div className="space-y-2">
                  {runE2EMutation.data.tests?.map((test, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border rounded">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <span className="font-medium text-sm">{test.name}</span>
                        <p className="text-xs text-gray-500">{test.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preflight Tab */}
        <TabsContent value="preflight" className="space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Production Preflight</h2>
            <p className="text-gray-600">Verify system readiness before launch</p>
          </div>

          <Card className={allPass ? 'border-green-500' : 'border-yellow-500'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Readiness Score</CardTitle>
                <div className="text-4xl font-bold">{passCount}/{totalCount}</div>
              </div>
            </CardHeader>
            <CardContent>
              {allPass ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">System Ready for Launch</p>
                    <p className="text-sm text-green-700">All critical checks passed</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">Action Required</p>
                    <p className="text-sm text-yellow-700">Review and fix failing checks before launch</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {health?.checks?.map((check, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(check.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{check.name}</h3>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-gray-700">{check.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {allPass && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-500 rounded-xl text-center">
              <Rocket className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready for Launch! 🚀</h2>
              <p className="text-gray-700">All preflight checks passed. System is go for production deployment.</p>
            </div>
          )}
        </TabsContent>

        {/* QA Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter results..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={runAudit} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Run Audit
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audit Summary</CardTitle>
              <CardDescription>Overall health of the application codebase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {stats.missingFunctions === 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    <span className="font-medium">Missing Backend Functions</span>
                  </div>
                  <Badge className={stats.missingFunctions === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {stats.missingFunctions === 0 ? 'PASS' : `${stats.missingFunctions} BLOCKING`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {stats.brokenRoutes === 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    <span className="font-medium">Broken Navigation Routes</span>
                  </div>
                  <Badge className={stats.brokenRoutes === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {stats.brokenRoutes === 0 ? 'PASS' : `${stats.brokenRoutes} BLOCKING`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {stats.deadButtons === 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-orange-600" />}
                    <span className="font-medium">Potential Dead Buttons</span>
                  </div>
                  <Badge className={stats.deadButtons === 0 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                    {stats.deadButtons === 0 ? 'PASS' : `${stats.deadButtons} REVIEW`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {stats.silentMutations === 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                    <span className="font-medium">Silent Mutations (No Toast)</span>
                  </div>
                  <Badge className={stats.silentMutations === 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {stats.silentMutations === 0 ? 'PASS' : `${stats.silentMutations} MEDIUM`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Functions */}
          {stats.missingFunctions > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <Server className="h-5 w-5" />
                  Missing Backend Functions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditResults.missingFunctions.filter(f => f.function.toLowerCase().includes(searchFilter.toLowerCase())).map((item, idx) => (
                    <div key={idx} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <code className="font-mono text-sm bg-red-100 px-2 py-1 rounded">{item.function}</code>
                      <p className="text-sm text-gray-600 mt-1">In: {item.file}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Broken Routes */}
          {stats.brokenRoutes > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <LinkIcon className="h-5 w-5" />
                  Broken Navigation Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditResults.brokenRoutes.map((item, idx) => (
                    <div key={idx} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <code className="font-mono text-sm">{item.route}</code>
                      <p className="text-sm text-gray-600 mt-1">Defined in: Layout.js sidebar</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}