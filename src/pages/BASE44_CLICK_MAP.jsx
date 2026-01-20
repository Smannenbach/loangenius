/**
 * BASE44 CLICK MAP
 * 
 * Auto-generated reference of all primary CTAs with data-testid attributes.
 * Used by QAAudit and E2E tests to validate interactive elements.
 * 
 * Convention: data-testid="cta:<PageName>:<ActionName>"
 */

export const CLICK_MAP = {
  // Layout (global)
  'Layout': {
    'Notifications': 'cta:Layout:Notifications',
    'MobileNotifications': 'cta:Layout:MobileNotifications',
  },
  
  // Dashboard
  'Dashboard': {
    'CreateDeal': 'cta:Dashboard:CreateDeal',
    'ViewPipeline': 'cta:Dashboard:ViewPipeline',
  },
  
  // Leads Page
  'Leads': {
    'QuickAdd': 'cta:Leads:QuickAdd',
    'AddLead': 'cta:Leads:AddLead',
    'QuickAddSubmit': 'cta:Leads:QuickAddSubmit',
    'SaveLead': 'cta:Leads:SaveLead',
    'Import': 'cta:Leads:Import',
    'ExportCSV': 'cta:Leads:ExportCSV',
  },
  
  // Pipeline
  'Pipeline': {
    'NewDeal': 'cta:Pipeline:NewDeal',
    'Filter': 'cta:Pipeline:Filter',
  },
  
  // Deals / Deal Detail
  'DealDetail': {
    'SubmitToLenders': 'cta:DealDetail:SubmitToLenders',
    'ExportMISMO': 'cta:DealDetail:ExportMISMO',
    'ExportPDF': 'cta:DealDetail:ExportPDF',
    'Edit': 'cta:DealDetail:Edit',
  },
  
  // Quote Generator
  'QuoteGenerator': {
    'Generate': 'cta:QuoteGenerator:Generate',
    'SendQuote': 'cta:QuoteGenerator:SendQuote',
    'Download': 'cta:QuoteGenerator:Download',
  },
  
  // QA Audit
  'QAAudit': {
    'RunAudit': 'cta:QAAudit:RunAudit',
  },
  
  // Settings
  'Settings': {
    'Save': 'cta:Settings:Save',
    'UploadLogo': 'cta:Settings:UploadLogo',
  },
  
  // MISMO Export
  'MISMOImportExport': {
    'Export': 'cta:MISMOImportExport:Export',
    'Import': 'cta:MISMOImportExport:Import',
    'Validate': 'cta:MISMOImportExport:Validate',
  },
  
  // Communications
  'Communications': {
    'Compose': 'cta:Communications:Compose',
    'Send': 'cta:Communications:Send',
  },
  
  // Reports
  'Reports': {
    'Generate': 'cta:Reports:Generate',
    'Export': 'cta:Reports:Export',
  },
};

/**
 * Get the data-testid for a CTA
 * @param {string} page - Page name
 * @param {string} action - Action name
 * @returns {string} The data-testid value
 */
export function getTestId(page, action) {
  return CLICK_MAP[page]?.[action] || `cta:${page}:${action}`;
}

/**
 * Get all CTAs for a page
 * @param {string} page - Page name
 * @returns {string[]} Array of data-testid values
 */
export function getPageCTAs(page) {
  const pageCTAs = CLICK_MAP[page];
  if (!pageCTAs) return [];
  return Object.values(pageCTAs);
}

export default CLICK_MAP;