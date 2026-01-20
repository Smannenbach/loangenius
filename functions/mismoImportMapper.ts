/**
 * MISMO Import Mapper
 * Maps inbound MISMO XML to canonical data model
 * Retains unmapped nodes for audit/debugging
 * 
 * Features:
 * - XPath-based field extraction
 * - Enum reverse mapping
 * - Datatype normalization
 * - Unmapped node retention
 * - Extension field extraction
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// REVERSE MAPPING (MISMO -> Canonical)
// ============================================================

const XPATH_MAPPINGS = {
  // Loan fields
  'TERMS_OF_LOAN/BaseLoanAmount': { field: 'loan_amount', type: 'currency' },
  'TERMS_OF_LOAN/LoanPurposeType': { field: 'loan_purpose', type: 'enum', reverse_map: REVERSE_LOAN_PURPOSE_MAP() },
  'TERMS_OF_LOAN/NoteRatePercent': { field: 'interest_rate', type: 'percent' },
  'TERMS_OF_LOAN/LoanTermMonths': { field: 'loan_term_months', type: 'integer' },
  'TERMS_OF_LOAN/MortgageType': { field: 'mortgage_type', type: 'string' },
  'LOAN_DETAIL/ApplicationReceivedDate': { field: 'application_date', type: 'date' },
  'LOAN_IDENTIFIERS/LOAN_IDENTIFIER/LoanIdentifier': { field: 'deal_number', type: 'string' },
  
  // Property fields
  'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText': { field: 'property_street', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName': { field: 'property_city', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode': { field: 'property_state', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode': { field: 'property_zip', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CountyName': { field: 'property_county', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyType': { field: 'property_type', type: 'string' },
  'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyUsageType': { field: 'occupancy_type', type: 'enum', reverse_map: REVERSE_OCCUPANCY_MAP() },
  'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_VALUATIONS/PROPERTY_VALUATION/PropertyValuationAmount': { field: 'appraised_value', type: 'currency' },
  
  // Borrower fields (primary)
  'PARTY/INDIVIDUAL/NAME/FirstName': { field: 'first_name', type: 'string', party_role: 'Borrower' },
  'PARTY/INDIVIDUAL/NAME/LastName': { field: 'last_name', type: 'string', party_role: 'Borrower' },
  'PARTY/INDIVIDUAL/NAME/MiddleName': { field: 'middle_name', type: 'string', party_role: 'Borrower' },
  'PARTY/INDIVIDUAL/NAME/SuffixName': { field: 'suffix', type: 'string', party_role: 'Borrower' },
  'PARTY/BORROWER/BORROWER_DETAIL/MaritalStatusType': { field: 'marital_status', type: 'string', party_role: 'Borrower' },
  'PARTY/BORROWER/BORROWER_DETAIL/BorrowerClassificationType': { field: 'borrower_classification', type: 'string', party_role: 'Borrower' },
  
  // Entity fields
  'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/LegalEntityName': { field: 'entity_name', type: 'string' },
  'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/LegalEntityType': { field: 'entity_type', type: 'string' }
};

function REVERSE_LOAN_PURPOSE_MAP() {
  return {
    'Purchase': 'Purchase',
    'Refinance': 'Refinance',
    'NoCashOutRefinance': 'Rate & Term',
    'CashOutRefinance': 'Cash-Out',
    'HELOC': 'HELOC',
    'SecondMortgage': 'Home Equity',
    'ConstructionToPermanent': 'Construction',
    'ConstructionOnly': 'Construction'
  };
}

function REVERSE_OCCUPANCY_MAP() {
  return {
    'Investment': 'Investment',
    'PrimaryResidence': 'Primary Residence',
    'SecondHome': 'Second Home'
  };
}

// ============================================================
// LG EXTENSION FIELD MAPPINGS
// ============================================================

const EXTENSION_MAPPINGS = {
  'DSCRatio': { field: 'dscr', type: 'decimal' },
  'DSCRCalculationMethod': { field: 'dscr_calculation_method', type: 'string' },
  'GrossRentalIncome': { field: 'gross_rental_income', type: 'currency' },
  'NetOperatingIncome': { field: 'net_operating_income', type: 'currency' },
  'IsBusinessPurposeLoan': { field: 'is_business_purpose_loan', type: 'boolean' },
  'InvestmentStrategy': { field: 'investment_strategy', type: 'string' },
  'ExitStrategy': { field: 'exit_strategy', type: 'string' },
  'EntityEIN': { field: 'entity_ein', type: 'string' },
  'EntityFormationDate': { field: 'entity_formation_date', type: 'date' },
  'EntityFormationState': { field: 'entity_formation_state', type: 'string' },
  'PrepayPenaltyType': { field: 'prepay_penalty_type', type: 'string' },
  'PrepayPenaltyTermMonths': { field: 'prepay_penalty_term_months', type: 'integer' },
  'InterestOnlyPeriodMonths': { field: 'interest_only_period_months', type: 'integer' },
  'PropertyMonthlyRent': { field: 'property_monthly_rent', type: 'currency' },
  'PropertyAnnualTaxes': { field: 'property_annual_taxes', type: 'currency' },
  'PropertyAnnualInsurance': { field: 'property_annual_insurance', type: 'currency' },
  'PropertyMonthlyHOA': { field: 'property_monthly_hoa', type: 'currency' }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, xml_content, pack_id, raw_only_mode } = body;

    // ACTION: Import XML to canonical
    if (action === 'import') {
      const result = importXmlToCanonical(xml_content, pack_id);
      return Response.json({
        success: true,
        import_result: result
      });
    }

    // ACTION: Get mapping definitions
    if (action === 'get_mappings') {
      return Response.json({
        success: true,
        xpath_mappings: XPATH_MAPPINGS,
        extension_mappings: EXTENSION_MAPPINGS
      });
    }

    // ACTION: Extract single field
    if (action === 'extract_field') {
      const { xpath } = body;
      const value = extractValueByXpath(xml_content, xpath);
      return Response.json({
        success: true,
        xpath,
        value
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Import Mapper error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ============================================================
// IMPORT LOGIC
// ============================================================

function importXmlToCanonical(xmlContent, packId) {
  const mappedFields = {};
  const unmappedNodes = [];
  const extensionFields = {};
  const parsingErrors = [];

  // Track which elements we've mapped
  const mappedElements = new Set();

  // Extract core fields using XPath mappings
  for (const [xpath, mapping] of Object.entries(XPATH_MAPPINGS)) {
    try {
      const value = extractValueByXpath(xmlContent, xpath);
      if (value !== null && value !== undefined && value !== '') {
        // Apply type conversion
        const convertedValue = convertValue(value, mapping.type, mapping.reverse_map);
        if (convertedValue !== null) {
          mappedFields[mapping.field] = convertedValue;
          mappedElements.add(xpath);
        }
      }
    } catch (e) {
      parsingErrors.push({ xpath, error: e.message });
    }
  }

  // Extract extension fields
  const extensionContent = extractExtensionContent(xmlContent);
  if (extensionContent) {
    for (const [lgElement, mapping] of Object.entries(EXTENSION_MAPPINGS)) {
      const pattern = new RegExp(`<LG:${lgElement}>([^<]*)</LG:${lgElement}>`);
      const match = extensionContent.match(pattern);
      if (match && match[1]) {
        const value = convertValue(match[1], mapping.type);
        if (value !== null) {
          mappedFields[mapping.field] = value;
          extensionFields[mapping.field] = value;
        }
      }
    }
  }

  // Determine vesting type
  if (mappedFields.entity_name) {
    mappedFields.vesting_type = 'Entity';
  } else if (mappedFields.first_name || mappedFields.last_name) {
    mappedFields.vesting_type = 'Individual';
  }

  // Extract assets
  mappedFields.assets = extractAssets(xmlContent);

  // Extract REO properties
  mappedFields.reo_properties = extractREOProperties(xmlContent);

  // Extract borrowers (multi-party)
  mappedFields.borrowers = extractBorrowers(xmlContent);

  // Find unmapped nodes
  const allElements = findAllElements(xmlContent);
  for (const element of allElements) {
    const isKnownPath = Array.from(mappedElements).some(path => element.xpath.includes(path) || path.includes(element.xpath));
    const isStructural = isStructuralElement(element.name);
    const isExtension = element.xpath.includes('EXTENSION') || element.xpath.includes('LG:');
    
    if (!isKnownPath && !isStructural && !isExtension) {
      unmappedNodes.push({
        xpath: element.xpath,
        element: element.name,
        value_snippet: element.value?.substring(0, 50),
        reason: 'No mapping defined'
      });
    }
  }

  // Detect MISMO version
  const versionMatch = xmlContent.match(/MISMOVersionID="([^"]+)"/);
  const lddMatch = xmlContent.match(/<MISMOLogicalDataDictionaryIdentifier>([^<]+)<\/MISMOLogicalDataDictionaryIdentifier>/);

  return {
    mapped_fields: mappedFields,
    unmapped_nodes: unmappedNodes.slice(0, 50), // Limit for performance
    unmapped_count: unmappedNodes.length,
    extension_fields: extensionFields,
    detected_version: versionMatch?.[1] || 'unknown',
    detected_ldd: lddMatch?.[1] || 'unknown',
    pack_used: packId,
    parsing_errors: parsingErrors
  };
}

// ============================================================
// EXTRACTION HELPERS
// ============================================================

function extractValueByXpath(xml, xpath) {
  // Split xpath into parts
  const parts = xpath.split('/');
  let current = xml;

  for (const part of parts) {
    if (!part) continue;
    
    // Find the element
    const pattern = new RegExp(`<${part}[^>]*>([\\s\\S]*?)</${part}>`, 'i');
    const match = current.match(pattern);
    
    if (!match) return null;
    current = match[1];
  }

  // Clean up the value
  if (current.includes('<')) {
    // This is a container, get the text content
    const textMatch = current.match(/^([^<]*)/);
    return textMatch ? textMatch[1].trim() : null;
  }

  return current.trim();
}

function extractExtensionContent(xml) {
  const match = xml.match(/<EXTENSION>([\s\S]*?)<\/EXTENSION>/);
  return match ? match[1] : null;
}

function extractAssets(xml) {
  const assets = [];
  const assetPattern = /<ASSET[^>]*>([\s\S]*?)<\/ASSET>/g;
  let match;
  let sequence = 1;

  while ((match = assetPattern.exec(xml)) !== null) {
    const assetContent = match[1];
    const asset = {
      sequence_number: sequence++,
      asset_type: extractElement(assetContent, 'AssetType'),
      institution_name: extractElement(assetContent, 'FullName') || extractElement(assetContent, 'AssetHolderName'),
      market_value: parseFloat(extractElement(assetContent, 'OwnedPropertyMarketValueAmount') || extractElement(assetContent, 'AssetCashOrMarketValueAmount')) || 0,
      account_number: extractElement(assetContent, 'AssetAccountIdentifier')
    };
    assets.push(asset);
  }

  return assets;
}

function extractREOProperties(xml) {
  const reoProperties = [];
  // Look for REO_PROPERTY or OWNED_PROPERTY elements
  const reoPattern = /<(?:REO_PROPERTY|OWNED_PROPERTY)[^>]*>([\s\S]*?)<\/(?:REO_PROPERTY|OWNED_PROPERTY)>/g;
  let match;
  let sequence = 1;

  while ((match = reoPattern.exec(xml)) !== null) {
    const reoContent = match[1];
    const reo = {
      sequence_number: sequence++,
      property_street: extractElement(reoContent, 'AddressLineText'),
      property_city: extractElement(reoContent, 'CityName'),
      property_state: extractElement(reoContent, 'StateCode'),
      property_zip: extractElement(reoContent, 'PostalCode'),
      market_value: parseFloat(extractElement(reoContent, 'OwnedPropertyMarketValueAmount')) || 0,
      monthly_rent: parseFloat(extractElement(reoContent, 'OwnedPropertyRentalIncomeGrossAmount')) || 0,
      mortgage_balance: parseFloat(extractElement(reoContent, 'OwnedPropertyLienUPBAmount')) || 0
    };
    reoProperties.push(reo);
  }

  return reoProperties;
}

function extractBorrowers(xml) {
  const borrowers = [];
  const partyPattern = /<PARTY[^>]*>([\s\S]*?)<\/PARTY>/g;
  let match;

  while ((match = partyPattern.exec(xml)) !== null) {
    const partyContent = match[1];
    
    // Check if this party is a borrower
    if (!partyContent.includes('<BORROWER') && !partyContent.includes('PartyRoleType>Borrower')) {
      continue;
    }

    // Check if individual or entity
    if (partyContent.includes('<INDIVIDUAL>')) {
      const borrower = {
        is_entity: false,
        first_name: extractElement(partyContent, 'FirstName'),
        last_name: extractElement(partyContent, 'LastName'),
        middle_name: extractElement(partyContent, 'MiddleName'),
        suffix: extractElement(partyContent, 'SuffixName'),
        marital_status: extractElement(partyContent, 'MaritalStatusType'),
        classification: extractElement(partyContent, 'BorrowerClassificationType')
      };
      borrowers.push(borrower);
    } else if (partyContent.includes('<LEGAL_ENTITY>')) {
      const borrower = {
        is_entity: true,
        entity_name: extractElement(partyContent, 'LegalEntityName'),
        entity_type: extractElement(partyContent, 'LegalEntityType')
      };
      borrowers.push(borrower);
    }
  }

  return borrowers;
}

function extractElement(content, elementName) {
  const pattern = new RegExp(`<${elementName}>([^<]*)</${elementName}>`);
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function findAllElements(xml) {
  const elements = [];
  const elementPattern = /<([A-Z_]+)[^/>]*>([^<]*)<\/\1>/g;
  let match;
  
  while ((match = elementPattern.exec(xml)) !== null) {
    elements.push({
      name: match[1],
      value: match[2],
      xpath: match[1] // Simplified xpath
    });
  }
  
  return elements;
}

function isStructuralElement(name) {
  const structural = [
    'MESSAGE', 'DEAL_SETS', 'DEAL_SET', 'DEALS', 'DEAL',
    'LOANS', 'LOAN', 'COLLATERALS', 'COLLATERAL', 'PARTIES', 'PARTY',
    'ASSETS', 'ASSET', 'LIABILITIES', 'LIABILITY', 'RELATIONSHIPS',
    'ROLES', 'ROLE', 'INDIVIDUAL', 'LEGAL_ENTITY', 'NAME', 'ADDRESS',
    'CONTACT_POINTS', 'CONTACT_POINT', 'SUBJECT_PROPERTY', 'PROPERTY_DETAIL',
    'PROPERTY_VALUATIONS', 'PROPERTY_VALUATION', 'LOAN_IDENTIFIERS', 'LOAN_IDENTIFIER',
    'ABOUT_VERSIONS', 'ABOUT_VERSION', 'MESSAGE_HEADER', 'EXTENSION', 'OTHER',
    'BORROWER', 'BORROWER_DETAIL', 'ASSET_DETAIL', 'ASSET_HOLDER', 'ASSET_ACCOUNTS',
    'ASSET_ACCOUNT', 'OWNED_PROPERTY', 'TERMS_OF_LOAN', 'LOAN_DETAIL',
    'TAXPAYER_IDENTIFIERS', 'TAXPAYER_IDENTIFIER', 'LEGAL_ENTITY_DETAIL'
  ];
  return structural.includes(name);
}

// ============================================================
// VALUE CONVERSION
// ============================================================

function convertValue(value, type, reverseMap) {
  if (value === null || value === undefined || value === '') return null;

  switch (type) {
    case 'currency':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    
    case 'integer':
      const int = parseInt(value);
      return isNaN(int) ? null : int;
    
    case 'percent':
      // MISMO stores as decimal (0.075 for 7.5%)
      const pct = parseFloat(value);
      return isNaN(pct) ? null : pct;
    
    case 'decimal':
      const dec = parseFloat(value);
      return isNaN(dec) ? null : dec;
    
    case 'boolean':
      return value.toLowerCase() === 'true';
    
    case 'date':
      // Validate date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // Try to parse other formats
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return null;
    
    case 'enum':
      if (reverseMap && reverseMap[value]) {
        return reverseMap[value];
      }
      return value;
    
    default:
      return value;
  }
}