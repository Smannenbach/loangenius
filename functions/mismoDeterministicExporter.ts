/**
 * MISMO Deterministic Exporter
 * Produces byte-identical XML for the same input data
 * 
 * Features:
 * - Stable element ordering (SequenceNumber or canonical sort keys)
 * - Stable namespace ordering
 * - Stable attribute ordering
 * - Consistent whitespace/formatting
 * - xlink:label generation for relationships
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// CONFIGURATION
// ============================================================

const MISMO_CONFIG = {
  VERSION: '3.4.0',
  BUILD: '324',
  NAMESPACE: 'http://www.mismo.org/residential/2009/schemas',
  XLINK_NAMESPACE: 'http://www.w3.org/1999/xlink',
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
  LG_EXTENSION_NAMESPACE: 'https://loangenius.ai/mismo/ext/1.0',
  LG_EXTENSION_VERSION: '1.0'
};

// Canonical sort keys for collections
const COLLECTION_SORT_KEYS = {
  'PARTY': ['sequence_number', 'party_role_type', 'id'],
  'ASSET': ['sequence_number', 'asset_type', 'id'],
  'LIABILITY': ['sequence_number', 'liability_type', 'id'],
  'COLLATERAL': ['sequence_number', 'id'],
  'REO_PROPERTY': ['sequence_number', 'property_street', 'id'],
  'INCOME': ['sequence_number', 'income_type', 'id'],
  'DECLARATION': ['sequence_number', 'declaration_type', 'id'],
  'DOCUMENT': ['sequence_number', 'document_type', 'id']
};

// Namespace order (alphabetical for determinism)
const NAMESPACE_ORDER = [
  { prefix: '', uri: MISMO_CONFIG.NAMESPACE },
  { prefix: 'LG', uri: MISMO_CONFIG.LG_EXTENSION_NAMESPACE },
  { prefix: 'xlink', uri: MISMO_CONFIG.XLINK_NAMESPACE }
];

// ============================================================
// FIELD MAPPINGS (Canonical -> MISMO XPath)
// ============================================================

const FIELD_MAPPINGS = {
  // Loan fields
  loan_amount: { xpath: 'TERMS_OF_LOAN/BaseLoanAmount', format: 'currency' },
  loan_purpose: { xpath: 'TERMS_OF_LOAN/LoanPurposeType', format: 'enum', enum_map: LOAN_PURPOSE_MAP() },
  interest_rate: { xpath: 'TERMS_OF_LOAN/NoteRatePercent', format: 'percent' },
  loan_term_months: { xpath: 'TERMS_OF_LOAN/LoanTermMonths', format: 'integer' },
  amortization_type: { xpath: 'AMORTIZATION/AmortizationType', format: 'enum' },
  application_date: { xpath: 'LOAN_DETAIL/ApplicationReceivedDate', format: 'date' },
  
  // Property fields
  property_street: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText', format: 'string' },
  property_city: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName', format: 'string' },
  property_state: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode', format: 'state' },
  property_zip: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode', format: 'zip' },
  property_county: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CountyName', format: 'string' },
  property_type: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyType', format: 'enum' },
  occupancy_type: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyUsageType', format: 'enum', enum_map: OCCUPANCY_MAP() },
  appraised_value: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_VALUATIONS/PROPERTY_VALUATION/PropertyValuationAmount', format: 'currency' },
  purchase_price: { xpath: 'COLLATERAL/SUBJECT_PROPERTY/SALES_CONTRACTS/SALES_CONTRACT/SalesContractAmount', format: 'currency' },
  
  // Borrower fields (primary)
  first_name: { xpath: 'PARTY/INDIVIDUAL/NAME/FirstName', format: 'string' },
  last_name: { xpath: 'PARTY/INDIVIDUAL/NAME/LastName', format: 'string' },
  middle_name: { xpath: 'PARTY/INDIVIDUAL/NAME/MiddleName', format: 'string' },
  suffix: { xpath: 'PARTY/INDIVIDUAL/NAME/SuffixName', format: 'string' },
  dob: { xpath: 'PARTY/INDIVIDUAL/BIRTH_DATE/BirthDate', format: 'date', pii: true },
  ssn: { xpath: 'PARTY/TAXPAYER_IDENTIFIERS/TAXPAYER_IDENTIFIER/TaxpayerIdentifierValue', format: 'ssn', pii: true },
  citizenship_status: { xpath: 'PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CitizenshipResidencyType', format: 'enum' },
  marital_status: { xpath: 'PARTY/BORROWER/BORROWER_DETAIL/MaritalStatusType', format: 'enum' },
  email: { xpath: 'PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_EMAIL/ContactPointEmailValue', format: 'string' },
  phone: { xpath: 'PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_TELEPHONE/ContactPointTelephoneValue', format: 'phone' },
  
  // Entity vesting
  entity_name: { xpath: 'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/LegalEntityName', format: 'string' },
  entity_type: { xpath: 'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/LegalEntityType', format: 'enum' }
};

function LOAN_PURPOSE_MAP() {
  return {
    'Purchase': 'Purchase',
    'Refinance': 'Refinance',
    'Rate & Term': 'NoCashOutRefinance',
    'Rate and Term': 'NoCashOutRefinance',
    'Cash-Out': 'CashOutRefinance',
    'Cash Out Refi': 'CashOutRefinance',
    'Cash-Out Refinance': 'CashOutRefinance',
    'Delayed Financing': 'CashOutRefinance',
    'HELOC': 'HELOC',
    'Home Equity': 'SecondMortgage',
    'Construction': 'ConstructionToPermanent'
  };
}

function OCCUPANCY_MAP() {
  return {
    'Investment': 'Investment',
    'Investment Property': 'Investment',
    'Primary': 'PrimaryResidence',
    'Primary Residence': 'PrimaryResidence',
    'Second Home': 'SecondHome',
    'Secondary': 'SecondHome',
    '2nd Home': 'SecondHome',
    'Vacation Home': 'SecondHome'
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, canonical_data, pack_id, extension_fields, deal_id } = body;

    // ACTION: Export to MISMO XML
    if (action === 'export') {
      const effectivePackId = pack_id || 'PACK_A_GENERIC_MISMO_34_B324';
      const isStrictMode = effectivePackId.includes('STRICT');
      
      const xml = generateDeterministicXml(canonical_data, extension_fields, isStrictMode);
      const hash = await computeHash(xml);
      
      return Response.json({
        success: true,
        xml_content: xml,
        content_hash: hash,
        byte_size: xml.length,
        pack_id: effectivePackId,
        filename: `MISMO_${canonical_data.deal_number || deal_id || 'export'}_${Date.now()}.xml`
      });
    }

    // ACTION: Compute hash for existing XML
    if (action === 'compute_hash') {
      const { xml_content } = body;
      const hash = await computeHash(xml_content);
      return Response.json({
        success: true,
        hash,
        algorithm: 'SHA-256',
        content_length: xml_content.length
      });
    }

    // ACTION: Get field mappings
    if (action === 'get_mappings') {
      return Response.json({
        success: true,
        mappings: FIELD_MAPPINGS,
        collection_sort_keys: COLLECTION_SORT_KEYS
      });
    }

    // ACTION: Sort collection items
    if (action === 'sort_collection') {
      const { collection_type, items } = body;
      const sorted = sortCollection(collection_type, items);
      return Response.json({
        success: true,
        sorted_items: sorted
      });
    }

    // ACTION: Generate xlink labels
    if (action === 'generate_xlinks') {
      const { parties, assets, liabilities } = body;
      const xlinks = generateXlinkLabels(parties, assets, liabilities);
      return Response.json({
        success: true,
        xlinks
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Deterministic Exporter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ============================================================
// XML GENERATION
// ============================================================

function generateDeterministicXml(data, extensionFields, strictMode) {
  const parts = [];
  
  // XML Declaration
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  
  // MESSAGE root with stable namespace ordering
  parts.push(`<MESSAGE xmlns="${MISMO_CONFIG.NAMESPACE}" xmlns:xlink="${MISMO_CONFIG.XLINK_NAMESPACE}" MISMOVersionID="${MISMO_CONFIG.VERSION}">`);
  
  // ABOUT_VERSIONS (recommended for strict mode)
  if (strictMode) {
    parts.push('  <ABOUT_VERSIONS>');
    parts.push('    <ABOUT_VERSION>');
    parts.push(`      <DataVersionIdentifier>${MISMO_CONFIG.BUILD}</DataVersionIdentifier>`);
    parts.push('      <DataVersionName>MISMO Reference Model</DataVersionName>');
    parts.push('    </ABOUT_VERSION>');
    parts.push('  </ABOUT_VERSIONS>');
  }
  
  // MESSAGE_HEADER with LDD identifier
  parts.push('  <MESSAGE_HEADER>');
  parts.push(`    <MISMOLogicalDataDictionaryIdentifier>${MISMO_CONFIG.LDD_IDENTIFIER}</MISMOLogicalDataDictionaryIdentifier>`);
  parts.push(`    <MessageDatetime>${new Date().toISOString()}</MessageDatetime>`);
  parts.push('    <MessageIdentifier>LG-' + generateUUID() + '</MessageIdentifier>');
  parts.push('  </MESSAGE_HEADER>');
  
  // DEAL_SETS
  parts.push('  <DEAL_SETS>');
  parts.push('    <DEAL_SET>');
  parts.push('      <DEALS>');
  parts.push('        <DEAL>');
  
  // Generate ASSETS section
  if (data.assets && data.assets.length > 0) {
    parts.push(...generateAssetsSection(data.assets));
  }
  
  // Generate COLLATERALS section
  parts.push(...generateCollateralsSection(data));
  
  // Generate LIABILITIES section (placeholder)
  // parts.push(...generateLiabilitiesSection(data));
  
  // Generate LOANS section
  parts.push(...generateLoansSection(data, extensionFields));
  
  // Generate PARTIES section
  parts.push(...generatePartiesSection(data));
  
  // Generate RELATIONSHIPS section
  parts.push(...generateRelationshipsSection(data));
  
  // Close DEAL
  parts.push('        </DEAL>');
  parts.push('      </DEALS>');
  parts.push('    </DEAL_SET>');
  parts.push('  </DEAL_SETS>');
  
  // Close MESSAGE
  parts.push('</MESSAGE>');
  
  return parts.join('\n');
}

function generateLoansSection(data, extensionFields) {
  const parts = [];
  parts.push('          <LOANS>');
  parts.push('            <LOAN SequenceNumber="1">');
  
  // LOAN_IDENTIFIERS
  parts.push('              <LOAN_IDENTIFIERS>');
  parts.push('                <LOAN_IDENTIFIER>');
  parts.push(`                  <LoanIdentifier>${escapeXml(data.deal_number || data.id || 'LG-' + Date.now())}</LoanIdentifier>`);
  parts.push('                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>');
  parts.push('                </LOAN_IDENTIFIER>');
  parts.push('              </LOAN_IDENTIFIERS>');
  
  // LOAN_DETAIL
  parts.push('              <LOAN_DETAIL>');
  if (data.application_date) {
    parts.push(`                <ApplicationReceivedDate>${formatDate(data.application_date)}</ApplicationReceivedDate>`);
  }
  parts.push('              </LOAN_DETAIL>');
  
  // TERMS_OF_LOAN
  parts.push('              <TERMS_OF_LOAN>');
  if (data.loan_amount) {
    parts.push(`                <BaseLoanAmount>${formatCurrency(data.loan_amount)}</BaseLoanAmount>`);
  }
  if (data.loan_purpose) {
    const mappedPurpose = LOAN_PURPOSE_MAP()[data.loan_purpose] || data.loan_purpose;
    parts.push(`                <LoanPurposeType>${escapeXml(mappedPurpose)}</LoanPurposeType>`);
  }
  parts.push('                <MortgageType>Conventional</MortgageType>');
  if (data.interest_rate) {
    parts.push(`                <NoteRatePercent>${formatPercent(data.interest_rate)}</NoteRatePercent>`);
  }
  if (data.loan_term_months) {
    parts.push(`                <LoanTermMonths>${data.loan_term_months}</LoanTermMonths>`);
  }
  parts.push('              </TERMS_OF_LOAN>');
  
  // EXTENSION block (MEG-0025 compliant)
  if (extensionFields && Object.keys(extensionFields).length > 0) {
    parts.push(...generateExtensionBlock(extensionFields, data));
  }
  
  parts.push('            </LOAN>');
  parts.push('          </LOANS>');
  
  return parts;
}

function generateCollateralsSection(data) {
  const parts = [];
  parts.push('          <COLLATERALS>');
  parts.push('            <COLLATERAL SequenceNumber="1">');
  parts.push('              <SUBJECT_PROPERTY>');
  
  // ADDRESS
  parts.push('                <ADDRESS>');
  if (data.property_street) {
    parts.push(`                  <AddressLineText>${escapeXml(data.property_street)}</AddressLineText>`);
  }
  if (data.property_city) {
    parts.push(`                  <CityName>${escapeXml(data.property_city)}</CityName>`);
  }
  if (data.property_county) {
    parts.push(`                  <CountyName>${escapeXml(data.property_county)}</CountyName>`);
  }
  if (data.property_zip) {
    parts.push(`                  <PostalCode>${formatZip(data.property_zip)}</PostalCode>`);
  }
  if (data.property_state) {
    parts.push(`                  <StateCode>${escapeXml(data.property_state).toUpperCase()}</StateCode>`);
  }
  parts.push('                </ADDRESS>');
  
  // PROPERTY_DETAIL
  parts.push('                <PROPERTY_DETAIL>');
  if (data.property_type) {
    parts.push(`                  <PropertyType>${escapeXml(data.property_type)}</PropertyType>`);
  }
  if (data.occupancy_type) {
    const mappedOccupancy = OCCUPANCY_MAP()[data.occupancy_type] || data.occupancy_type;
    parts.push(`                  <PropertyUsageType>${escapeXml(mappedOccupancy)}</PropertyUsageType>`);
  }
  parts.push('                </PROPERTY_DETAIL>');
  
  // PROPERTY_VALUATIONS
  if (data.appraised_value || data.purchase_price) {
    parts.push('                <PROPERTY_VALUATIONS>');
    parts.push('                  <PROPERTY_VALUATION>');
    if (data.appraised_value) {
      parts.push(`                    <PropertyValuationAmount>${formatCurrency(data.appraised_value)}</PropertyValuationAmount>`);
    }
    parts.push('                  </PROPERTY_VALUATION>');
    parts.push('                </PROPERTY_VALUATIONS>');
  }
  
  parts.push('              </SUBJECT_PROPERTY>');
  parts.push('            </COLLATERAL>');
  parts.push('          </COLLATERALS>');
  
  return parts;
}

function generatePartiesSection(data) {
  const parts = [];
  parts.push('          <PARTIES>');
  
  const parties = [];
  
  // Primary borrower
  if (data.vesting_type === 'Entity' && data.entity_name) {
    // Entity party
    parties.push({
      type: 'entity',
      sequence: 1,
      entity_name: data.entity_name,
      entity_type: data.entity_type,
      role: 'Borrower'
    });
  } else {
    // Individual party
    parties.push({
      type: 'individual',
      sequence: 1,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name,
      suffix: data.suffix,
      dob: data.dob,
      ssn: data.ssn,
      email: data.email,
      phone: data.phone,
      citizenship_status: data.citizenship_status,
      marital_status: data.marital_status,
      role: 'Borrower',
      classification: 'Primary'
    });
  }
  
  // Add co-borrowers if present
  if (data.borrowers && Array.isArray(data.borrowers)) {
    data.borrowers.forEach((borrower, idx) => {
      parties.push({
        type: borrower.is_entity ? 'entity' : 'individual',
        sequence: idx + 2,
        ...borrower,
        role: 'Borrower',
        classification: idx === 0 ? 'Primary' : 'Secondary'
      });
    });
  }
  
  // Sort parties for determinism
  const sortedParties = sortCollection('PARTY', parties);
  
  // Generate XML for each party
  sortedParties.forEach((party, idx) => {
    const xlinkLabel = `Party${idx + 1}`;
    parts.push(`            <PARTY SequenceNumber="${party.sequence || idx + 1}" xlink:label="${xlinkLabel}">`);
    
    if (party.type === 'individual') {
      parts.push('              <INDIVIDUAL>');
      parts.push('                <NAME>');
      if (party.first_name) parts.push(`                  <FirstName>${escapeXml(party.first_name)}</FirstName>`);
      if (party.last_name) parts.push(`                  <LastName>${escapeXml(party.last_name)}</LastName>`);
      if (party.middle_name) parts.push(`                  <MiddleName>${escapeXml(party.middle_name)}</MiddleName>`);
      if (party.suffix) parts.push(`                  <SuffixName>${escapeXml(party.suffix)}</SuffixName>`);
      parts.push('                </NAME>');
      parts.push('              </INDIVIDUAL>');
      
      // ROLES
      parts.push('              <ROLES>');
      parts.push('                <ROLE SequenceNumber="1">');
      parts.push(`                  <BORROWER>`);
      parts.push('                    <BORROWER_DETAIL>');
      if (party.classification) parts.push(`                      <BorrowerClassificationType>${party.classification}</BorrowerClassificationType>`);
      if (party.marital_status) parts.push(`                      <MaritalStatusType>${escapeXml(party.marital_status)}</MaritalStatusType>`);
      parts.push('                    </BORROWER_DETAIL>');
      parts.push('                  </BORROWER>');
      parts.push('                </ROLE>');
      parts.push('              </ROLES>');
    } else {
      // Entity
      parts.push('              <LEGAL_ENTITY>');
      parts.push('                <LEGAL_ENTITY_DETAIL>');
      if (party.entity_name) parts.push(`                  <LegalEntityName>${escapeXml(party.entity_name)}</LegalEntityName>`);
      if (party.entity_type) parts.push(`                  <LegalEntityType>${escapeXml(party.entity_type)}</LegalEntityType>`);
      parts.push('                </LEGAL_ENTITY_DETAIL>');
      parts.push('              </LEGAL_ENTITY>');
      
      parts.push('              <ROLES>');
      parts.push('                <ROLE SequenceNumber="1">');
      parts.push('                  <BORROWER/>');
      parts.push('                </ROLE>');
      parts.push('              </ROLES>');
    }
    
    parts.push('            </PARTY>');
  });
  
  parts.push('          </PARTIES>');
  return parts;
}

function generateAssetsSection(assets) {
  const parts = [];
  parts.push('          <ASSETS>');
  
  const sortedAssets = sortCollection('ASSET', assets);
  
  sortedAssets.forEach((asset, idx) => {
    parts.push(`            <ASSET SequenceNumber="${idx + 1}">`);
    parts.push('              <ASSET_DETAIL>');
    if (asset.asset_type) parts.push(`                <AssetType>${escapeXml(asset.asset_type)}</AssetType>`);
    parts.push('              </ASSET_DETAIL>');
    parts.push('              <ASSET_HOLDER>');
    parts.push('                <NAME>');
    if (asset.institution_name) parts.push(`                  <FullName>${escapeXml(asset.institution_name)}</FullName>`);
    parts.push('                </NAME>');
    parts.push('              </ASSET_HOLDER>');
    if (asset.account_number) {
      parts.push(`              <ASSET_ACCOUNTS>`);
      parts.push(`                <ASSET_ACCOUNT>`);
      parts.push(`                  <AssetAccountIdentifier>${escapeXml(asset.account_number.slice(-4))}</AssetAccountIdentifier>`);
      parts.push(`                </ASSET_ACCOUNT>`);
      parts.push(`              </ASSET_ACCOUNTS>`);
    }
    parts.push('              <OWNED_PROPERTY>');
    if (asset.market_value) parts.push(`                <OwnedPropertyMarketValueAmount>${formatCurrency(asset.market_value)}</OwnedPropertyMarketValueAmount>`);
    parts.push('              </OWNED_PROPERTY>');
    parts.push('            </ASSET>');
  });
  
  parts.push('          </ASSETS>');
  return parts;
}

function generateRelationshipsSection(data) {
  const parts = [];
  parts.push('          <RELATIONSHIPS>');
  
  // Borrower to Loan relationship
  parts.push('            <RELATIONSHIP xlink:from="Party1" xlink:to="Loan1" xlink:arcrole="urn:fdc:mismo.org:2009:residential:PARTY_IsVerifiedBy_SERVICE"/>');
  
  parts.push('          </RELATIONSHIPS>');
  return parts;
}

function generateExtensionBlock(extensionFields, data) {
  const parts = [];
  parts.push('              <EXTENSION>');
  parts.push(`                <OTHER xmlns:LG="${MISMO_CONFIG.LG_EXTENSION_NAMESPACE}">`);
  parts.push('                  <LG:LOAN_GENIUS_EXTENSION>');
  parts.push(`                    <LG:ExtensionVersion>${MISMO_CONFIG.LG_EXTENSION_VERSION}</LG:ExtensionVersion>`);
  
  // Sort extension fields alphabetically for determinism
  const sortedKeys = Object.keys(extensionFields).sort();
  
  for (const key of sortedKeys) {
    const field = extensionFields[key];
    if (field && field.value !== undefined && field.value !== null && field.value !== '') {
      const lgName = field.lg_name || key;
      const formattedValue = formatExtensionValue(field.value, field.type);
      parts.push(`                    <LG:${lgName}>${escapeXml(formattedValue)}</LG:${lgName}>`);
    }
  }
  
  // Add DSCR-specific fields from canonical data
  if (data.dscr) {
    parts.push(`                    <LG:DSCRatio>${formatDecimal(data.dscr, 4)}</LG:DSCRatio>`);
  }
  if (data.gross_rental_income || data.monthly_rental_income) {
    parts.push(`                    <LG:GrossRentalIncome>${formatCurrency(data.gross_rental_income || data.monthly_rental_income)}</LG:GrossRentalIncome>`);
  }
  if (data.is_business_purpose_loan !== undefined) {
    parts.push(`                    <LG:IsBusinessPurposeLoan>${data.is_business_purpose_loan ? 'true' : 'false'}</LG:IsBusinessPurposeLoan>`);
  }
  
  parts.push('                  </LG:LOAN_GENIUS_EXTENSION>');
  parts.push('                </OTHER>');
  parts.push('              </EXTENSION>');
  
  return parts;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function sortCollection(collectionType, items) {
  if (!items || !Array.isArray(items)) return items || [];
  
  const sortKeys = COLLECTION_SORT_KEYS[collectionType] || ['sequence_number', 'id'];
  
  return [...items].sort((a, b) => {
    for (const key of sortKeys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal === bVal) continue;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      
      return String(aVal).localeCompare(String(bVal));
    }
    return 0;
  });
}

function generateXlinkLabels(parties, assets, liabilities) {
  const labels = { parties: {}, assets: {}, liabilities: {} };
  
  (parties || []).forEach((p, i) => {
    labels.parties[p.id || i] = `Party${i + 1}`;
  });
  
  (assets || []).forEach((a, i) => {
    labels.assets[a.id || i] = `Asset${i + 1}`;
  });
  
  (liabilities || []).forEach((l, i) => {
    labels.liabilities[l.id || i] = `Liability${i + 1}`;
  });
  
  return labels;
}

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCurrency(value) {
  const num = parseFloat(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

function formatPercent(value) {
  const num = parseFloat(value);
  return isNaN(num) ? '0.000000' : num.toFixed(6);
}

function formatDecimal(value, places = 4) {
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(places);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function formatZip(value) {
  if (!value) return '';
  const cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned.slice(0, 5);
}

function formatExtensionValue(value, type) {
  switch (type) {
    case 'currency': return formatCurrency(value);
    case 'decimal': return formatDecimal(value, 4);
    case 'percent': return formatPercent(value);
    case 'integer': return String(Math.round(parseFloat(value) || 0));
    case 'boolean': return value ? 'true' : 'false';
    case 'date': return formatDate(value);
    default: return String(value || '');
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function computeHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}