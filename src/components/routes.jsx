/**
 * Routes Helper - Central route management to prevent broken navigation
 * 
 * Usage:
 *   import { routes, getPageUrl } from '@/components/routes';
 *   
 *   // Navigate to a page
 *   <Link to={getPageUrl('Dashboard')}>Dashboard</Link>
 *   
 *   // Check if a route exists
 *   if (routes.Dashboard) { ... }
 */

// All valid page routes in the application
// This is the single source of truth for navigation
export const routes = {
  // Main
  Dashboard: 'Dashboard',
  Pipeline: 'Pipeline',
  Leads: 'Leads',
  Loans: 'Loans',
  Contacts: 'Contacts',
  ContactDetail: 'ContactDetail',
  ContactCreate: 'ContactCreate',
  
  // Deals
  Deals: 'Deals',
  DealDetail: 'DealDetail',
  DealWizard: 'DealWizard',
  DealMobile: 'DealMobile',
  NewDeal: 'NewDeal',
  
  // Applications
  LoanApplicationWizard: 'LoanApplicationWizard',
  LoanApplication: 'LoanApplication',
  BusinessPurposeApplication: 'BusinessPurposeApplication',
  BorrowerOnboarding: 'BorrowerOnboarding',
  
  // Tools
  QuoteGenerator: 'QuoteGenerator',
  AIAssistant: 'AIAssistant',
  DocumentIntelligenceHub: 'DocumentIntelligenceHub',
  Communications: 'Communications',
  Conversations: 'Conversations',
  EmailSequences: 'EmailSequences',
  Reports: 'Reports',
  ReportBuilder: 'ReportBuilder',
  ReportViewer: 'ReportViewer',
  Documents: 'Documents',
  
  // Admin
  Users: 'Users',
  LenderIntegrations: 'LenderIntegrations',
  Lenders: 'Lenders',
  PortalSettings: 'PortalSettings',
  SystemHealth: 'SystemHealth',
  Preflight: 'Preflight',
  Underwriting: 'Underwriting',
  UnderwritingChecklist: 'UnderwritingChecklist',
  ComplianceDashboard: 'ComplianceDashboard',
  MISMOExportProfiles: 'MISMOExportProfiles',
  MISMOImportExport: 'MISMOImportExport',
  MISMOValidator: 'MISMOValidator',
  AdminIntegrations: 'AdminIntegrations',
  AdminAIProviders: 'AdminAIProviders',
  AdminAuditLogs: 'AdminAuditLogs',
  AdminLoginHistory: 'AdminLoginHistory',
  AdminOrganization: 'AdminOrganization',
  AdminPortalPreview: 'AdminPortalPreview',
  AdminSettings: 'AdminSettings',
  AdminWebhooks: 'AdminWebhooks',
  AdminAgents: 'AdminAgents',
  AdminPrivacyRequests: 'AdminPrivacyRequests',
  Settings: 'Settings',
  
  // Billing
  BillingSettings: 'BillingSettings',
  BillingSuccess: 'BillingSuccess',
  
  // Borrower Portal
  BorrowerPortal: 'BorrowerPortal',
  BorrowerPortalLogin: 'BorrowerPortalLogin',
  BorrowerPortalDashboard: 'BorrowerPortalDashboard',
  BorrowerPortalHome: 'BorrowerPortalHome',
  CoborrowerPortal: 'CoborrowerPortal',
  
  // Testing/Internal
  SmokeTests: 'SmokeTests',
  TestingHub: 'TestingHub',
  TestingValidationHub: 'TestingValidationHub',
  QAAudit: 'QAAudit',
  ValidationDashboard: 'ValidationDashboard',
  ErrorTest: 'ErrorTest',
  
  // Document Intelligence
  DocumentIntelligenceHub: 'DocumentIntelligenceHub',
  
  // Other
  AlertsNotifications: 'AlertsNotifications',
  SubmissionPrep: 'SubmissionPrep',
  PrivacyRequest: 'PrivacyRequest',
  ConsentManagement: 'ConsentManagement',
  DocumentIntelligence: 'DocumentIntelligence',
  ExecutiveDashboard: 'ExecutiveDashboard',
  LeadIntelligence: 'LeadIntelligence',
  BrandingSettings: 'BrandingSettings',
  BrandStudio: 'BrandStudio',
  AgentOrchestrator: 'AgentOrchestrator',
  AgentExecutionViewer: 'AgentExecutionViewer',
  AgentKnowledgeBase: 'AgentKnowledgeBase',
  AgentPerformanceDashboard: 'AgentPerformanceDashboard',
  AIOrchestrator: 'AIOrchestrator',
  AuditComplianceViewer: 'AuditComplianceViewer',
  Assumptions: 'Assumptions',
  SuperAdmin: 'SuperAdmin',
  Roadmap: 'Roadmap',
  
  // Public/Trust pages
  Trust: 'Trust',
  Privacy: 'Privacy',
  Security: 'Security',
  Status: 'Status',
  Subprocessors: 'Subprocessors',
  LandingPage: 'LandingPage',
  NotFound: 'NotFound',
};

/**
 * Get a validated page URL
 * Throws in development if route doesn't exist
 * @param {string} pageName - The page name from routes
 * @param {object} params - Optional query parameters
 * @returns {string} The page URL
 */
export function getPageUrl(pageName, params = {}) {
  // Validate route exists
  if (!routes[pageName]) {
    const error = new Error(`Unknown route: "${pageName}". Add it to components/routes.js if it's a valid page.`);
    
    // In development, throw to catch bugs early
    if (import.meta.env?.DEV || typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.error(error);
      throw error;
    }
    
    // In production, log error and return NotFound
    console.error(`[Route Error] ${error.message}`);
    // Could also send to Sentry here
    return '/NotFound';
  }
  
  // Build URL with query params if provided
  let url = `/${pageName}`;
  const paramEntries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null);
  if (paramEntries.length > 0) {
    const searchParams = new URLSearchParams();
    paramEntries.forEach(([key, value]) => searchParams.append(key, String(value)));
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * Check if a route name is valid
 * @param {string} pageName 
 * @returns {boolean}
 */
export function isValidRoute(pageName) {
  return Boolean(routes[pageName]);
}

export default routes;