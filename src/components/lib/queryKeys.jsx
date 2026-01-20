/**
 * Standardized Query Keys for React Query
 * Use these keys to ensure consistent caching across the app
 */

export const queryKeys = {
  // User & Auth
  currentUser: ['currentUser'],
  userMembership: (email) => ['userMembership', email],
  
  // Deals
  deals: {
    all: ['deals'],
    list: (orgId, filters) => ['deals', 'list', orgId, filters],
    detail: (id) => ['deals', 'detail', id],
    fees: (id) => ['deals', 'detail', id, 'fees'],
    documents: (id) => ['deals', 'detail', id, 'documents'],
    conditions: (id) => ['deals', 'detail', id, 'conditions'],
    borrowers: (id) => ['deals', 'detail', id, 'borrowers'],
    properties: (id) => ['deals', 'detail', id, 'properties'],
    tasks: (id) => ['deals', 'detail', id, 'tasks'],
    activity: (id) => ['deals', 'detail', id, 'activity'],
  },
  
  // Contacts
  contacts: {
    all: ['contacts'],
    list: (orgId, filters) => ['contacts', 'list', orgId, filters],
    detail: (id) => ['contacts', 'detail', id],
  },
  
  // Leads
  leads: {
    all: ['leads'],
    list: (orgId, filters) => ['leads', 'list', orgId, filters],
    detail: (id) => ['leads', 'detail', id],
  },
  
  // Borrowers
  borrowers: {
    all: ['borrowers'],
    list: (orgId) => ['borrowers', 'list', orgId],
    detail: (id) => ['borrowers', 'detail', id],
    assets: (borrowerId, dealId) => ['borrowers', borrowerId, 'assets', dealId],
    declarations: (borrowerId, dealId) => ['borrowers', borrowerId, 'declarations', dealId],
  },
  
  // Documents
  documents: {
    all: ['documents'],
    list: (orgId, filters) => ['documents', 'list', orgId, filters],
    detail: (id) => ['documents', 'detail', id],
    requirements: (dealId) => ['documents', 'requirements', dealId],
  },
  
  // Organizations
  org: {
    settings: (orgId) => ['orgSettings', orgId],
    branding: (orgId) => ['orgBranding', orgId],
    members: (orgId) => ['orgMembers', orgId],
    roles: (orgId) => ['orgRoles', orgId],
  },
  
  // Lenders
  lenders: {
    all: ['lenders'],
    list: (orgId) => ['lenders', 'list', orgId],
    detail: (id) => ['lenders', 'detail', id],
    submissions: (lenderId) => ['lenders', lenderId, 'submissions'],
  },
  
  // Conditions
  conditions: {
    all: ['conditions'],
    list: (dealId) => ['conditions', 'list', dealId],
    detail: (id) => ['conditions', 'detail', id],
  },
  
  // Tasks
  tasks: {
    all: ['tasks'],
    list: (dealId) => ['tasks', 'list', dealId],
    detail: (id) => ['tasks', 'detail', id],
  },
  
  // Dashboard
  dashboard: {
    kpis: (orgId) => ['dashboard', 'kpis', orgId],
    activity: (orgId) => ['dashboard', 'activity', orgId],
    pipeline: (orgId) => ['dashboard', 'pipeline', orgId],
    attention: (orgId) => ['dashboard', 'attention', orgId],
  },
  
  // Reports
  reports: {
    all: ['reports'],
    list: (orgId) => ['reports', 'list', orgId],
    detail: (id) => ['reports', 'detail', id],
    results: (id) => ['reports', 'results', id],
  },
  
  // Integrations
  integrations: {
    all: ['integrations'],
    list: (orgId) => ['integrations', 'list', orgId],
    detail: (id) => ['integrations', 'detail', id],
  },
  
  // Audit logs
  audit: {
    logs: (orgId, filters) => ['audit', 'logs', orgId, filters],
  },
  
  // Agent metrics
  agents: {
    metrics: ['agent-metrics'],
    status: ['agent-status'],
  },
  
  // Billing
  billing: {
    account: (orgId) => ['billing', 'account', orgId],
    invoices: (orgId) => ['billing', 'invoices', orgId],
  },
  
  // Portal
  portal: {
    session: (token) => ['portal', 'session', token],
    deal: (dealId) => ['portal', 'deal', dealId],
    notifications: (borrowerEmail) => ['portal', 'notifications', borrowerEmail],
  },
};

export default queryKeys;