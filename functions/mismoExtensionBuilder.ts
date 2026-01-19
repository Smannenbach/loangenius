import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MEG-0025 Compliant Extension Builder
// Handles DSCR/Business Purpose fields in EXTENSION/OTHER containers

// LoanGenius Extension Namespace Configuration
const LG_EXTENSION = {
  namespace: 'https://loangenius.ai/mismo/ext/1.0',
  prefix: 'LG',
  version: '1.0',
  schema_location: 'https://loangenius.ai/mismo/ext/1.0/LG_Extension.xsd'
};

// Fields that MUST go into EXTENSION/OTHER (not in core MISMO LDD)
const EXTENSION_ONLY_FIELDS = {
  // DSCR-specific fields
  dscr_ratio: { lg_name: 'DSCRatio', type: 'decimal', description: 'Debt Service Coverage Ratio' },
  dscr_calculation_method: { lg_name: 'DSCRCalculationMethod', type: 'string', description: 'DSCR calculation methodology' },
  gross_rental_income: { lg_name: 'GrossRentalIncome', type: 'currency', description: 'Monthly gross rental income' },
  net_operating_income: { lg_name: 'NetOperatingIncome', type: 'currency', description: 'Annual net operating income' },
  annual_debt_service: { lg_name: 'AnnualDebtService', type: 'currency', description: 'Annual debt service' },
  vacancy_factor: { lg_name: 'VacancyFactor', type: 'percent', description: 'Vacancy factor percentage' },
  management_fee_factor: { lg_name: 'ManagementFeeFactor', type: 'percent', description: 'Property management fee factor' },
  
  // Business Purpose Loan fields
  business_purpose_type: { lg_name: 'BusinessPurposeType', type: 'string', description: 'Type of business purpose' },
  is_business_purpose_loan: { lg_name: 'IsBusinessPurposeLoan', type: 'boolean', description: 'Business purpose loan indicator' },
  investment_strategy: { lg_name: 'InvestmentStrategy', type: 'string', description: 'Investment strategy (Buy & Hold, Fix & Flip, etc.)' },
  exit_strategy: { lg_name: 'ExitStrategy', type: 'string', description: 'Loan exit strategy' },
  
  // Entity/Vesting fields not in core MISMO
  entity_ein: { lg_name: 'EntityEIN', type: 'string', description: 'Entity Employer Identification Number' },
  entity_formation_date: { lg_name: 'EntityFormationDate', type: 'date', description: 'Entity formation date' },
  entity_formation_state: { lg_name: 'EntityFormationState', type: 'string', description: 'State of entity formation' },
  guarantor_personal_guarantee: { lg_name: 'GuarantorPersonalGuarantee', type: 'boolean', description: 'Personal guarantee indicator' },
  
  // Prepay penalty details
  prepay_penalty_type: { lg_name: 'PrepayPenaltyType', type: 'string', description: 'Prepayment penalty type' },
  prepay_penalty_term_months: { lg_name: 'PrepayPenaltyTermMonths', type: 'integer', description: 'Prepay penalty term in months' },
  prepay_penalty_structure: { lg_name: 'PrepayPenaltyStructure', type: 'string', description: 'Stepdown structure (5-4-3-2-1, etc.)' },
  
  // Interest-only period
  interest_only_period_months: { lg_name: 'InterestOnlyPeriodMonths', type: 'integer', description: 'IO period in months' },
  
  // Property-specific DSCR fields
  property_monthly_rent: { lg_name: 'PropertyMonthlyRent', type: 'currency', description: 'Monthly rent for subject property' },
  property_annual_taxes: { lg_name: 'PropertyAnnualTaxes', type: 'currency', description: 'Annual property taxes' },
  property_annual_insurance: { lg_name: 'PropertyAnnualInsurance', type: 'currency', description: 'Annual insurance premium' },
  property_monthly_hoa: { lg_name: 'PropertyMonthlyHOA', type: 'currency', description: 'Monthly HOA dues' },
  
  // Origination-specific
  broker_compensation: { lg_name: 'BrokerCompensation', type: 'currency', description: 'Broker compensation amount' },
  broker_compensation_type: { lg_name: 'BrokerCompensationType', type: 'string', description: 'Borrower-paid or lender-paid' },
};

// Sort keys for deterministic ordering
const COLLECTION_SORT_KEYS = {
  'PARTY': ['PARTY_ROLE_IDENTIFIERS.PARTY_ROLE_IDENTIFIER.PartyRoleType', 'SequenceNumber'],
  'ASSET': ['ASSET_DETAIL.AssetType', 'SequenceNumber'],
  'LIABILITY': ['LIABILITY_DETAIL.LiabilityType', 'SequenceNumber'],
  'ROLE': ['RoleType', 'SequenceNumber'],
  'COLLATERAL': ['SequenceNumber'],
  'PROPERTY': ['SequenceNumber'],
  'REO_PROPERTY': ['SequenceNumber'],
  'INCOME': ['INCOME_DETAIL.IncomeType', 'SequenceNumber'],
  'EXPENSE': ['EXPENSE_DETAIL.ExpenseType', 'SequenceNumber'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, canonical_data, extension_data, existing_extensions } = await req.json();

    // ACTION: Build EXTENSION/OTHER block for LG namespace
    if (action === 'build_extension_block') {
      const extensionXml = buildExtensionBlock(canonical_data);
      return Response.json({
        success: true,
        extension_xml: extensionXml,
        fields_included: Object.keys(extensionXml.fields || {}).length,
        namespace: LG_EXTENSION.namespace,
        version: LG_EXTENSION.version
      });
    }

    // ACTION: Extract extension fields from canonical data
    if (action === 'extract_extension_fields') {
      const extensionFields = extractExtensionFields(canonical_data);
      return Response.json({
        success: true,
        extension_fields: extensionFields,
        core_fields: extractCoreFields(canonical_data)
      });
    }

    // ACTION: Merge multiple organization extensions
    if (action === 'merge_extensions') {
      const merged = mergeExtensions(existing_extensions, extension_data);
      return Response.json({
        success: true,
        merged_extensions: merged
      });
    }

    // ACTION: Get extension config
    if (action === 'get_config') {
      return Response.json({
        success: true,
        config: LG_EXTENSION,
        extension_fields: EXTENSION_ONLY_FIELDS
      });
    }

    // ACTION: Sort collection for deterministic output
    if (action === 'sort_collection') {
      const { collection_type, items } = await req.json();
      const sorted = sortCollection(collection_type, items);
      return Response.json({
        success: true,
        sorted_items: sorted
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Extension Builder error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Build EXTENSION/OTHER XML block
function buildExtensionBlock(canonicalData) {
  const fields = {};
  const xmlParts = [];

  // Extract extension-only fields
  for (const [fieldKey, fieldConfig] of Object.entries(EXTENSION_ONLY_FIELDS)) {
    const value = canonicalData[fieldKey];
    if (value !== undefined && value !== null && value !== '') {
      fields[fieldKey] = {
        lg_name: fieldConfig.lg_name,
        value: formatExtensionValue(value, fieldConfig.type),
        type: fieldConfig.type
      };
      
      xmlParts.push(`      <LG:${fieldConfig.lg_name}>${escapeXml(formatExtensionValue(value, fieldConfig.type))}</LG:${fieldConfig.lg_name}>`);
    }
  }

  // Sort XML parts alphabetically for determinism
  xmlParts.sort();

  const xml = xmlParts.length > 0 ? `
    <EXTENSION>
      <OTHER xmlns:LG="${LG_EXTENSION.namespace}">
        <LG:LOAN_GENIUS_EXTENSION>
          <LG:ExtensionVersion>${LG_EXTENSION.version}</LG:ExtensionVersion>
${xmlParts.join('\n')}
        </LG:LOAN_GENIUS_EXTENSION>
      </OTHER>
    </EXTENSION>` : '';

  return {
    xml,
    fields,
    namespace: LG_EXTENSION.namespace,
    version: LG_EXTENSION.version
  };
}

// Extract extension fields from canonical data
function extractExtensionFields(canonicalData) {
  const extensionFields = {};
  
  for (const [fieldKey, fieldConfig] of Object.entries(EXTENSION_ONLY_FIELDS)) {
    if (canonicalData[fieldKey] !== undefined) {
      extensionFields[fieldKey] = {
        value: canonicalData[fieldKey],
        lg_name: fieldConfig.lg_name,
        type: fieldConfig.type,
        description: fieldConfig.description
      };
    }
  }
  
  return extensionFields;
}

// Extract core MISMO fields (non-extension)
function extractCoreFields(canonicalData) {
  const coreFields = {};
  const extensionKeys = new Set(Object.keys(EXTENSION_ONLY_FIELDS));
  
  for (const [key, value] of Object.entries(canonicalData)) {
    if (!extensionKeys.has(key)) {
      coreFields[key] = value;
    }
  }
  
  return coreFields;
}

// Merge multiple organization extensions
function mergeExtensions(existingExtensions, newExtension) {
  const merged = { ...existingExtensions };
  
  // Ensure LG namespace doesn't overwrite other orgs
  if (!merged.OTHER) {
    merged.OTHER = [];
  }
  
  // Add LG extension as separate namespace block
  const lgIndex = merged.OTHER.findIndex(ext => ext.namespace === LG_EXTENSION.namespace);
  if (lgIndex >= 0) {
    merged.OTHER[lgIndex] = newExtension;
  } else {
    merged.OTHER.push(newExtension);
  }
  
  return merged;
}

// Sort collection items for deterministic output
function sortCollection(collectionType, items) {
  if (!items || !Array.isArray(items)) return items;
  
  const sortKeys = COLLECTION_SORT_KEYS[collectionType] || ['SequenceNumber'];
  
  return [...items].sort((a, b) => {
    for (const key of sortKeys) {
      const aVal = getNestedValue(a, key);
      const bVal = getNestedValue(b, key);
      
      if (aVal === bVal) continue;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      
      return String(aVal).localeCompare(String(bVal));
    }
    return 0;
  });
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Format extension value based on type
function formatExtensionValue(value, type) {
  switch (type) {
    case 'currency':
      return parseFloat(value).toFixed(2);
    case 'decimal':
      return parseFloat(value).toFixed(4);
    case 'percent':
      return (parseFloat(value) / 100).toFixed(6);
    case 'integer':
      return String(Math.round(value));
    case 'boolean':
      return value ? 'true' : 'false';
    case 'date':
      return new Date(value).toISOString().split('T')[0];
    default:
      return String(value);
  }
}

// Escape XML special characters
function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}