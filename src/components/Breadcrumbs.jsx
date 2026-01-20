import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Route to readable name mapping
 */
const routeNames = {
  Dashboard: 'Dashboard',
  Pipeline: 'Pipeline',
  Leads: 'Leads',
  Loans: 'Loans',
  Deals: 'Deals',
  Contacts: 'Contacts',
  Documents: 'Documents',
  QuoteGenerator: 'Quote Generator',
  AIAssistant: 'AI Hub',
  DocumentIntelligenceHub: 'Doc Intelligence',
  Communications: 'Communications',
  EmailSequences: 'Email Sequences',
  Reports: 'Reports',
  Users: 'Users & Permissions',
  LenderIntegrations: 'Lender Partners',
  PortalSettings: 'Borrower Portal',
  SystemHealth: 'System Health',
  Preflight: 'Preflight',
  Underwriting: 'Underwriting',
  ComplianceDashboard: 'Compliance',
  MISMOExportProfiles: 'MISMO Profiles',
  MISMOImportExport: 'MISMO Import/Export',
  MISMOValidator: 'MISMO Validator',
  AdminIntegrations: 'Integrations',
  Settings: 'Settings',
  AlertsNotifications: 'Notifications',
  LoanApplicationWizard: 'New Application',
  BusinessPurposeApplication: 'Business Purpose App',
  LoanDetails: 'Loan Details',
  ContactDetails: 'Contact Details',
  NewDeal: 'New Deal',
};

/**
 * Section grouping for breadcrumbs
 */
const sectionMap = {
  // Main
  Dashboard: null, // Root, no parent
  Pipeline: 'Dashboard',
  Leads: 'Dashboard',
  Loans: 'Dashboard',
  Deals: 'Loans',
  Contacts: 'Dashboard',
  Documents: 'Dashboard',

  // Tools
  QuoteGenerator: 'Dashboard',
  AIAssistant: 'Dashboard',
  DocumentIntelligenceHub: 'Documents',
  Communications: 'Dashboard',
  EmailSequences: 'Communications',
  Reports: 'Dashboard',

  // Admin
  Users: 'Settings',
  LenderIntegrations: 'Settings',
  PortalSettings: 'Settings',
  SystemHealth: 'Settings',
  Preflight: 'Settings',
  Underwriting: 'Settings',
  ComplianceDashboard: 'Settings',
  MISMOExportProfiles: 'Settings',
  MISMOImportExport: 'Settings',
  MISMOValidator: 'Settings',
  AdminIntegrations: 'Settings',
  Settings: 'Dashboard',

  // Detail pages
  LoanDetails: 'Loans',
  ContactDetails: 'Contacts',
  NewDeal: 'Loans',
  LoanApplicationWizard: 'Dashboard',
  BusinessPurposeApplication: 'Dashboard',
  AlertsNotifications: 'Dashboard',
};

/**
 * Build breadcrumb trail from current page
 */
function buildBreadcrumbs(currentPage) {
  const breadcrumbs = [];
  let page = currentPage;

  // Build chain from current page to root
  while (page) {
    breadcrumbs.unshift({
      name: routeNames[page] || page,
      href: createPageUrl(page),
      page,
    });
    page = sectionMap[page];
  }

  return breadcrumbs;
}

/**
 * Breadcrumb navigation component
 */
export default function Breadcrumbs({
  currentPage,
  customTrail,
  className,
  showHome = true,
}) {
  const location = useLocation();

  // Use custom trail if provided, otherwise build from route
  const breadcrumbs = customTrail || buildBreadcrumbs(currentPage);

  // Don't show breadcrumbs if we're at root
  if (breadcrumbs.length <= 1 && !showHome) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {showHome && (
          <>
            <li>
              <Link
                to={createPageUrl('Dashboard')}
                className="flex items-center text-gray-500 hover:text-blue-600 transition-colors"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {breadcrumbs.length > 0 && (
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </li>
            )}
          </>
        )}

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.page || index} className="flex items-center">
              {isLast ? (
                <span
                  className="font-medium text-gray-900"
                  aria-current="page"
                >
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    to={crumb.href}
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {crumb.name}
                  </Link>
                  <ChevronRight className="h-4 w-4 mx-1 text-gray-400" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Page header with breadcrumbs
 * Combines title, breadcrumbs, and optional actions
 */
export function PageHeader({
  title,
  description,
  currentPage,
  customBreadcrumbs,
  actions,
  className,
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        currentPage={currentPage}
        customTrail={customBreadcrumbs}
      />

      {/* Title and Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-500 mt-1">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact breadcrumbs for detail pages
 */
export function DetailBreadcrumbs({
  parentPage,
  parentName,
  currentName,
  className,
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm mb-4', className)}
    >
      <Link
        to={createPageUrl(parentPage)}
        className="text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back to {parentName || routeNames[parentPage] || parentPage}
      </Link>
      {currentName && (
        <>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-700">{currentName}</span>
        </>
      )}
    </nav>
  );
}
