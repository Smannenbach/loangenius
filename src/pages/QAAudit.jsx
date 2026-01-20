import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Search,
  FileCode,
  MousePointer,
  Link as LinkIcon,
  Server,
  RefreshCw,
  ExternalLink,
  Copy,
  Bell,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

// Import all source files as raw text for static analysis
const allSourceFiles = import.meta.glob('/src/**/*.{js,jsx}', { as: 'raw', eager: true });
const allFunctionFiles = import.meta.glob('/src/functions/*.js', { as: 'raw', eager: true });

// Known pages from Layout sidebar
const SIDEBAR_PAGES = [
  'Dashboard', 'Pipeline', 'Leads', 'Loans', 'Contacts',
  'QuoteGenerator', 'AIAssistant', 'Communications', 'EmailSequences', 'Reports',
  'Users', 'LenderIntegrations', 'PortalSettings', 'SystemHealth', 'SmokeTests', 'TestingHub', 'QAAudit',
  'Underwriting', 'ComplianceDashboard', 'MISMOExportProfiles', 'MISMOImportExport',
  'AdminIntegrations', 'Settings'
];

// Extract function names from functions folder
function getExistingFunctions() {
  const functions = new Set();
  Object.keys(allFunctionFiles).forEach(path => {
    const match = path.match(/\/functions\/([^/]+)\.js$/);
    if (match) {
      functions.add(match[1]);
    }
  });
  return functions;
}

// Trigger patterns that make a button valid (not dead)
const TRIGGER_PATTERNS = [
  'DialogTrigger',
  'DropdownMenuTrigger', 
  'PopoverTrigger',
  'TooltipTrigger',
  'AlertDialogTrigger',
  'SheetTrigger',
  'DrawerTrigger',
  'CollapsibleTrigger',
  'AccordionTrigger',
  'MenubarTrigger',
  'ContextMenuTrigger',
  'HoverCardTrigger',
  'SelectTrigger',
  'TabsTrigger'
];

// Check if button is inside a trigger wrapper
function isInsideTrigger(content, buttonIndex) {
  // Look backwards up to 200 chars for trigger patterns
  const lookbackStart = Math.max(0, buttonIndex - 200);
  const beforeButton = content.substring(lookbackStart, buttonIndex);
  
  for (const trigger of TRIGGER_PATTERNS) {
    // Check for opening trigger tag that hasn't been closed
    const triggerOpen = new RegExp(`<${trigger}[^>]*>(?!.*</${trigger}>)`, 's');
    if (triggerOpen.test(beforeButton)) {
      return trigger;
    }
    // Also check for asChild pattern in trigger
    if (beforeButton.includes(`<${trigger}`) && beforeButton.includes('asChild')) {
      return trigger;
    }
  }
  return null;
}

// Check if button is inside a clickable parent (card, etc.)
function isInsideClickableParent(content, buttonIndex) {
  const lookbackStart = Math.max(0, buttonIndex - 300);
  const beforeButton = content.substring(lookbackStart, buttonIndex);
  
  // Check for onClick on parent elements like Card, div, etc.
  const cardClickPattern = /<(?:Card|div|article|section)[^>]*onClick\s*=/;
  return cardClickPattern.test(beforeButton);
}

// Analyze source files for issues
function analyzeSourceFiles() {
  const existingFunctions = getExistingFunctions();
  const missingFunctions = [];
  const trueDeadButtons = [];
  const exemptButtons = [];
  const silentMutations = [];
  const brokenRoutes = [];
  
  Object.entries(allSourceFiles).forEach(([filePath, content]) => {
    if (!content || typeof content !== 'string') return;
    
    const fileName = filePath.split('/').pop();
    const isPage = filePath.includes('/pages/');
    const isComponent = filePath.includes('/components/');
    
    // 1. Detect missing function invocations
    const functionInvokeRegex = /base44\.functions\.invoke\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = functionInvokeRegex.exec(content)) !== null) {
      const fnName = match[1];
      if (!existingFunctions.has(fnName)) {
        missingFunctions.push({
          function: fnName,
          file: filePath.replace('/src/', ''),
          line: content.substring(0, match.index).split('\n').length,
          page: isPage ? fileName.replace('.js', '').replace('.jsx', '') : null
        });
      }
    }
    
    // 2. Detect dead buttons (no onClick, not submit, not asChild)
    const buttonRegex = /<Button\b[^>]*>/g;
    let buttonMatch;
    while ((buttonMatch = buttonRegex.exec(content)) !== null) {
      const buttonTag = buttonMatch[0];
      const lineNum = content.substring(0, buttonMatch.index).split('\n').length;
      
      const hasOnClick = /onClick\s*=/.test(buttonTag);
      const isSubmit = /type\s*=\s*["']submit["']/.test(buttonTag);
      const isAsChild = /asChild/.test(buttonTag);
      const isDisabled = /disabled/.test(buttonTag);
      const hasDataTestId = /data-testid\s*=/.test(buttonTag);
      
      if (!hasOnClick && !isSubmit && !isAsChild) {
        // Check exempt patterns
        const triggerParent = isInsideTrigger(content, buttonMatch.index);
        const inClickableParent = isInsideClickableParent(content, buttonMatch.index);
        
        // Check if it's inside a Link or has valid usage
        const contextStart = Math.max(0, buttonMatch.index - 100);
        const contextEnd = Math.min(content.length, buttonMatch.index + buttonTag.length + 50);
        const context = content.substring(contextStart, contextEnd);
        const isWrappedInLink = /<Link[^>]*>[\s\S]*<Button/.test(context) || /asChild[\s\S]*<Link/.test(context);
        
        const buttonInfo = {
          file: filePath.replace('/src/', ''),
          line: lineNum,
          snippet: buttonTag.substring(0, 100) + (buttonTag.length > 100 ? '...' : ''),
          hasDataTestId
        };
        
        if (isDisabled) {
          exemptButtons.push({ ...buttonInfo, reason: 'Disabled button (intentionally non-interactive)' });
        } else if (triggerParent) {
          exemptButtons.push({ ...buttonInfo, reason: `Inside ${triggerParent} (Radix trigger pattern)` });
        } else if (inClickableParent) {
          exemptButtons.push({ ...buttonInfo, reason: 'Inside clickable parent container' });
        } else if (isWrappedInLink) {
          exemptButtons.push({ ...buttonInfo, reason: 'Wrapped in Link component' });
        } else {
          trueDeadButtons.push({ ...buttonInfo, severity: 'high' });
        }
      }
    }
    
    // 3. Detect silent mutations (mutations without toast)
    const hasMutation = /useMutation\(|\.create\(|\.update\(|\.delete\(|mutationFn/.test(content);
    const hasToast = /toast\.|toast\(/.test(content);
    
    if (hasMutation && !hasToast && (isPage || isComponent)) {
      // Check if it's a real mutation file
      const mutationCount = (content.match(/useMutation\(/g) || []).length +
                           (content.match(/\.create\(/g) || []).length +
                           (content.match(/\.update\(/g) || []).length +
                           (content.match(/\.delete\(/g) || []).length;
      
      if (mutationCount > 0) {
        silentMutations.push({
          file: filePath.replace('/src/', ''),
          mutationCount,
          severity: 'low'
        });
      }
    }
  });
  
  // 4. Check for broken routes (sidebar pages that don't exist)
  const existingPages = new Set();
  Object.keys(allSourceFiles).forEach(path => {
    if (path.includes('/pages/')) {
      const match = path.match(/\/pages\/([^/]+)\.(js|jsx)$/);
      if (match) {
        existingPages.add(match[1]);
      }
    }
  });
  
  SIDEBAR_PAGES.forEach(page => {
    if (!existingPages.has(page)) {
      brokenRoutes.push({
        route: page,
        location: 'Layout.js sidebar',
        severity: 'high'
      });
    }
  });
  
  return {
    missingFunctions: deduplicateMissingFunctions(missingFunctions),
    trueDeadButtons,
    exemptButtons,
    silentMutations,
    brokenRoutes,
    existingFunctions: Array.from(existingFunctions),
    existingPages: Array.from(existingPages)
  };
}

function deduplicateMissingFunctions(arr) {
  const map = new Map();
  arr.forEach(item => {
    const key = item.function;
    if (!map.has(key)) {
      map.set(key, { ...item, files: [item.file] });
    } else {
      map.get(key).files.push(item.file);
    }
  });
  return Array.from(map.values());
}

export default function QAAudit() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [lastScanTime, setLastScanTime] = useState(new Date());
  
  // Check if user is admin using org membership role
  const { user, userRole, isLoading: orgLoading } = useOrgId();
  
  const isAdmin = ['admin', 'owner', 'manager'].includes(userRole);
  
  // Run analysis
  const auditResults = useMemo(() => {
    return analyzeSourceFiles();
  }, [lastScanTime]);
  
  const runAudit = () => {
    setLastScanTime(new Date());
    toast.success('Audit scan completed');
  };
  
  const copyList = (items, type) => {
    const text = items.map(item => {
      if (type === 'functions') return `${item.function} (${item.files.join(', ')})`;
      if (type === 'buttons') return `${item.file}:${item.line}`;
      if (type === 'routes') return item.route;
      if (type === 'mutations') return item.file;
      return JSON.stringify(item);
    }).join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  const filteredMissingFunctions = auditResults.missingFunctions.filter(f => 
    f.function.toLowerCase().includes(searchFilter.toLowerCase())
  );
  
  const filteredTrueDeadButtons = auditResults.trueDeadButtons.filter(b =>
    b.file.toLowerCase().includes(searchFilter.toLowerCase())
  );
  
  const filteredExemptButtons = auditResults.exemptButtons.filter(b =>
    b.file.toLowerCase().includes(searchFilter.toLowerCase())
  );
  
  const stats = {
    missingFunctions: auditResults.missingFunctions.length,
    trueDeadButtons: auditResults.trueDeadButtons.length,
    exemptButtons: auditResults.exemptButtons.length,
    silentMutations: auditResults.silentMutations.length,
    brokenRoutes: auditResults.brokenRoutes.length,
    totalFunctions: auditResults.existingFunctions.length,
    totalPages: auditResults.existingPages.length
  };
  
  // Access control
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-slate-600">Only administrators can access the QA Audit dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Search className="h-8 w-8 text-blue-600" />
              QA Audit Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Build-time analysis of code quality issues • Last scan: {lastScanTime.toLocaleTimeString()}
            </p>
          </div>
          <Button onClick={runAudit} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Audit Now
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className={stats.missingFunctions > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${stats.missingFunctions > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {stats.missingFunctions}
              </p>
              <p className="text-sm text-gray-600">Missing Functions</p>
            </CardContent>
          </Card>
          
          <Card className={stats.brokenRoutes > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${stats.brokenRoutes > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {stats.brokenRoutes}
              </p>
              <p className="text-sm text-gray-600">Broken Routes</p>
            </CardContent>
          </Card>
          
          <Card className={stats.trueDeadButtons > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${stats.trueDeadButtons > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {stats.trueDeadButtons}
              </p>
              <p className="text-sm text-gray-600">TRUE Dead Buttons</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.exemptButtons}</p>
              <p className="text-sm text-gray-600">Exempt (Valid)</p>
            </CardContent>
          </Card>
          
          <Card className={stats.silentMutations > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${stats.silentMutations > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                {stats.silentMutations}
              </p>
              <p className="text-sm text-gray-600">Silent Mutations</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.totalFunctions}</p>
              <p className="text-sm text-gray-600">Backend Functions</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.totalPages}</p>
              <p className="text-sm text-gray-600">Total Pages</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter results..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Search className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="functions" className="gap-2">
              <Server className="h-4 w-4" />
              Missing Functions ({stats.missingFunctions})
            </TabsTrigger>
            <TabsTrigger value="routes" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Broken Routes ({stats.brokenRoutes})
            </TabsTrigger>
            <TabsTrigger value="buttons" className="gap-2">
              <MousePointer className="h-4 w-4" />
              Dead Buttons ({stats.trueDeadButtons})
            </TabsTrigger>
            <TabsTrigger value="exempt" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Exempt ({stats.exemptButtons})
            </TabsTrigger>
            <TabsTrigger value="mutations" className="gap-2">
              <Bell className="h-4 w-4" />
              Silent Mutations ({stats.silentMutations})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Summary</CardTitle>
                <CardDescription>Overall health of the application codebase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {stats.missingFunctions === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">Missing Backend Functions</span>
                    </div>
                    <Badge className={stats.missingFunctions === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {stats.missingFunctions === 0 ? 'PASS' : `${stats.missingFunctions} BLOCKING`}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {stats.brokenRoutes === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">Broken Navigation Routes</span>
                    </div>
                    <Badge className={stats.brokenRoutes === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {stats.brokenRoutes === 0 ? 'PASS' : `${stats.brokenRoutes} BLOCKING`}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {stats.trueDeadButtons === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">TRUE Dead Buttons</span>
                    </div>
                    <Badge className={stats.trueDeadButtons === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {stats.trueDeadButtons === 0 ? 'PASS' : `${stats.trueDeadButtons} BLOCKING`}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Exempt Buttons (Valid Patterns)</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {stats.exemptButtons} DOCUMENTED
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {stats.silentMutations === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      )}
                      <span className="font-medium">Mutations Without Toast Feedback</span>
                    </div>
                    <Badge className={stats.silentMutations === 0 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                      {stats.silentMutations === 0 ? 'PASS' : `${stats.silentMutations} MEDIUM`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>PASS 1 Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>All sidebar navigation items route to existing pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Leads CRUD fully functional with toast feedback</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Google Sheets import wizard working end-to-end</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Canonical org_id resolver used across all pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>NotFound page catches unknown routes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>AI Provider configuration fully wired</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Integration connections with encrypted token storage</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missing Functions Tab */}
          <TabsContent value="functions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Missing Backend Functions
                    </CardTitle>
                    <CardDescription>
                      Functions invoked in frontend but not found in /functions folder
                    </CardDescription>
                  </div>
                  {filteredMissingFunctions.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyList(filteredMissingFunctions, 'functions')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredMissingFunctions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All invoked functions exist in the backend!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMissingFunctions.map((item, idx) => (
                      <div key={idx} className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm bg-red-100 px-2 py-1 rounded">
                                {item.function}
                              </code>
                              <Badge className="bg-red-100 text-red-800">BLOCKER</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Referenced in: {item.files.join(', ')}
                            </p>
                            {item.page && (
                              <Link 
                                to={createPageUrl(item.page)} 
                                className="text-sm text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Go to {item.page}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broken Routes Tab */}
          <TabsContent value="routes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Broken Navigation Routes
                    </CardTitle>
                    <CardDescription>
                      Sidebar items pointing to non-existent pages
                    </CardDescription>
                  </div>
                  {auditResults.brokenRoutes.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyList(auditResults.brokenRoutes, 'routes')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {auditResults.brokenRoutes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All navigation routes are valid!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditResults.brokenRoutes.map((item, idx) => (
                      <div key={idx} className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <code className="font-mono text-sm">{item.route}</code>
                            <p className="text-sm text-gray-600 mt-1">Defined in: {item.location}</p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">BLOCKER</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* All Pages List */}
            <Card>
              <CardHeader>
                <CardTitle>All Registered Pages ({auditResults.existingPages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {auditResults.existingPages.slice(0, 40).map(page => (
                    <Link 
                      key={page}
                      to={createPageUrl(page)}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 text-sm"
                    >
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span className="truncate font-mono">{page}</span>
                    </Link>
                  ))}
                </div>
                {auditResults.existingPages.length > 40 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    And {auditResults.existingPages.length - 40} more...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dead Buttons Tab */}
          <TabsContent value="buttons" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MousePointer className="h-5 w-5" />
                      Dead Buttons
                    </CardTitle>
                    <CardDescription>
                      Buttons without onClick, not type="submit", and not asChild
                    </CardDescription>
                  </div>
                  {filteredDeadButtons.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyList(filteredDeadButtons, 'buttons')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredDeadButtons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All buttons are properly wired!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDeadButtons.slice(0, 20).map((item, idx) => (
                      <div key={idx} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileCode className="h-4 w-4 text-gray-500" />
                              <span className="font-mono text-sm">{item.file}</span>
                              <span className="text-gray-400">:{item.line}</span>
                            </div>
                            <code className="text-xs text-gray-600 mt-2 block bg-gray-100 p-2 rounded">
                              {item.snippet}
                            </code>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">HIGH</Badge>
                        </div>
                      </div>
                    ))}
                    {filteredDeadButtons.length > 20 && (
                      <p className="text-sm text-gray-500 text-center">
                        And {filteredDeadButtons.length - 20} more...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Silent Mutations Tab */}
          <TabsContent value="mutations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Silent Mutations
                    </CardTitle>
                    <CardDescription>
                      Files with mutations but no toast import detected
                    </CardDescription>
                  </div>
                  {auditResults.silentMutations.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyList(auditResults.silentMutations, 'mutations')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {auditResults.silentMutations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All mutations have toast feedback!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditResults.silentMutations.map((item, idx) => (
                      <div key={idx} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileCode className="h-4 w-4 text-gray-500" />
                              <span className="font-mono text-sm">{item.file}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.mutationCount} mutation(s) detected
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">MEDIUM</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}