import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Deterministic MISMO XML Exporter
// Ensures byte-identical output for same input data

const MISMO_NAMESPACE = 'http://www.mismo.org/residential/2009/schemas';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const LG_NAMESPACE = 'https://loangenius.ai/mismo/ext/1.0';

// Canonical namespace order (always declared in this order)
const NAMESPACE_ORDER = [
  { prefix: '', uri: MISMO_NAMESPACE },
  { prefix: 'xlink', uri: XLINK_NAMESPACE },
  { prefix: 'LG', uri: LG_NAMESPACE }
];

// Element ordering within containers (alphabetical with exceptions)
const ELEMENT_ORDER = {
  'MESSAGE': ['ABOUT_VERSIONS', 'DEAL_SETS', 'DOCUMENT_SETS'],
  'DEAL': ['ABOUT_VERSIONS', 'ASSETS', 'COLLATERALS', 'LIABILITIES', 'LOANS', 'PARTIES', 'RELATIONSHIPS', 'SERVICES'],
  'LOAN': ['ADJUSTMENT', 'AMORTIZATION', 'BUYDOWN', 'CLOSING_INFORMATION', 'CONSTRUCTION', 'DOCUMENT_SPECIFIC_DATA_SETS', 'ESCROW', 'FEE_INFORMATION', 'FORECLOSURE', 'HELOC', 'HMDA_LOAN', 'HOUSING_EXPENSES', 'INTEREST_ONLY', 'INTEREST_RATE_ADJUSTMENT', 'LATE_CHARGE', 'LOAN_DETAIL', 'LOAN_IDENTIFIERS', 'MATURITY', 'MI_DATA', 'MODIFICATION', 'NEGATIVE_AMORTIZATION', 'PAYMENT', 'PREPAYMENT_PENALTY', 'PRODUCT', 'PROPERTY_VALUATION_DETAIL', 'QUALIFICATION', 'REFINANCE', 'SERVICING', 'TERMS_OF_LOAN', 'UNDERWRITING'],
  'PARTY': ['INDIVIDUAL', 'LEGAL_ENTITY', 'PARTY_ROLE_IDENTIFIERS', 'ROLES', 'TAXPAYER_IDENTIFIERS', 'ADDRESSES', 'CONTACTS'],
  'COLLATERAL': ['LIENS', 'PLEDGED_ASSET', 'SUBJECT_PROPERTY'],
  'SUBJECT_PROPERTY': ['ADDRESS', 'LOCATION_IDENTIFIER', 'PARSED_STREET_ADDRESS', 'PROPERTY_DETAIL', 'PROPERTY_VALUATIONS', 'SALES_CONTRACTS'],
};

// Collection sort keys for repeating elements
const COLLECTION_SORT_KEYS = {
  'PARTY': (a, b) => {
    // Sort by role type, then sequence number
    const roleA = a.ROLES?.ROLE?.[0]?.ROLE_DETAIL?.PartyRoleType || '';
    const roleB = b.ROLES?.ROLE?.[0]?.ROLE_DETAIL?.PartyRoleType || '';
    if (roleA !== roleB) return roleA.localeCompare(roleB);
    return (a.SequenceNumber || 0) - (b.SequenceNumber || 0);
  },
  'ASSET': (a, b) => {
    const typeA = a.ASSET_DETAIL?.AssetType || '';
    const typeB = b.ASSET_DETAIL?.AssetType || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return (a.SequenceNumber || 0) - (b.SequenceNumber || 0);
  },
  'LIABILITY': (a, b) => {
    const typeA = a.LIABILITY_DETAIL?.LiabilityType || '';
    const typeB = b.LIABILITY_DETAIL?.LiabilityType || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return (a.SequenceNumber || 0) - (b.SequenceNumber || 0);
  },
  'COLLATERAL': (a, b) => (a.SequenceNumber || 0) - (b.SequenceNumber || 0),
  'REO_PROPERTY': (a, b) => (a.SequenceNumber || 0) - (b.SequenceNumber || 0),
  'INCOME': (a, b) => {
    const typeA = a.INCOME_DETAIL?.IncomeType || '';
    const typeB = b.INCOME_DETAIL?.IncomeType || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return (a.SequenceNumber || 0) - (b.SequenceNumber || 0);
  },
  'ROLE': (a, b) => {
    const typeA = a.ROLE_DETAIL?.PartyRoleType || '';
    const typeB = b.ROLE_DETAIL?.PartyRoleType || '';
    return typeA.localeCompare(typeB);
  },
  'RELATIONSHIP': (a, b) => {
    const fromA = a['xlink:from'] || '';
    const fromB = b['xlink:from'] || '';
    if (fromA !== fromB) return fromA.localeCompare(fromB);
    const toA = a['xlink:to'] || '';
    const toB = b['xlink:to'] || '';
    return toA.localeCompare(toB);
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, mismo_object, pack_id } = await req.json();

    // ACTION: Generate deterministic XML from MISMO object
    if (action === 'generate_xml') {
      const xml = generateDeterministicXml(mismo_object, pack_id);
      const hash = await computeHash(xml);
      
      return Response.json({
        success: true,
        xml,
        byte_size: new TextEncoder().encode(xml).length,
        content_hash: hash,
        pack_id: pack_id || 'PACK_A_GENERIC_MISMO_34_B324'
      });
    }

    // ACTION: Sort a collection
    if (action === 'sort_collection') {
      const { collection_type, items } = await req.json();
      const sorted = sortCollection(collection_type, items);
      return Response.json({
        success: true,
        sorted: sorted
      });
    }

    // ACTION: Normalize namespaces
    if (action === 'normalize_namespaces') {
      const { xml_content } = await req.json();
      const normalized = normalizeNamespaces(xml_content);
      return Response.json({
        success: true,
        normalized_xml: normalized
      });
    }

    // ACTION: Compute hash of XML
    if (action === 'compute_hash') {
      const { xml_content } = await req.json();
      const hash = await computeHash(xml_content);
      return Response.json({
        success: true,
        hash
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Deterministic Exporter error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Generate deterministic XML from MISMO object
function generateDeterministicXml(mismoObject, packId) {
  const lines = [];
  
  // XML Declaration (always first, always same format)
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  
  // Root element with canonical namespace declarations
  const nsDeclarations = NAMESPACE_ORDER
    .map(ns => ns.prefix ? `xmlns:${ns.prefix}="${ns.uri}"` : `xmlns="${ns.uri}"`)
    .join(' ');
  
  lines.push(`<MESSAGE ${nsDeclarations}>`);
  
  // ABOUT_VERSIONS (always first child)
  lines.push('  <ABOUT_VERSIONS>');
  lines.push('    <ABOUT_VERSION>');
  lines.push('      <DataVersionIdentifier>MISMO_3.4.0_B324</DataVersionIdentifier>');
  lines.push('      <DataVersionName>MISMO Reference Model</DataVersionName>');
  lines.push(`      <MISMOLogicalDataDictionaryIdentifier>${packId === 'PACK_B_DU_ULAD_STRICT_34_B324' ? 'MISMO_3.4.0_B324_DU_ULAD' : 'MISMO_3.4.0_B324'}</MISMOLogicalDataDictionaryIdentifier>`);
  lines.push('    </ABOUT_VERSION>');
  lines.push('  </ABOUT_VERSIONS>');
  
  // DEAL_SETS
  if (mismoObject.DEAL_SETS) {
    lines.push('  <DEAL_SETS>');
    const dealSets = Array.isArray(mismoObject.DEAL_SETS.DEAL_SET) 
      ? mismoObject.DEAL_SETS.DEAL_SET 
      : [mismoObject.DEAL_SETS.DEAL_SET];
    
    for (const dealSet of dealSets) {
      lines.push(...generateDealSetXml(dealSet, 2));
    }
    lines.push('  </DEAL_SETS>');
  }
  
  lines.push('</MESSAGE>');
  
  return lines.join('\n');
}

// Generate DEAL_SET XML
function generateDealSetXml(dealSet, indent) {
  const lines = [];
  const pad = '  '.repeat(indent);
  
  lines.push(`${pad}<DEAL_SET>`);
  lines.push(`${pad}  <DEALS>`);
  
  const deals = Array.isArray(dealSet.DEALS?.DEAL) 
    ? dealSet.DEALS.DEAL 
    : dealSet.DEALS?.DEAL ? [dealSet.DEALS.DEAL] : [];
  
  for (const deal of deals) {
    lines.push(...generateDealXml(deal, indent + 2));
  }
  
  lines.push(`${pad}  </DEALS>`);
  lines.push(`${pad}</DEAL_SET>`);
  
  return lines;
}

// Generate DEAL XML with proper ordering
function generateDealXml(deal, indent) {
  const lines = [];
  const pad = '  '.repeat(indent);
  
  // Add xlink:label if present
  const labelAttr = deal['xlink:label'] ? ` xlink:label="${deal['xlink:label']}"` : '';
  lines.push(`${pad}<DEAL${labelAttr}>`);
  
  // Process children in canonical order
  const orderedElements = ELEMENT_ORDER['DEAL'] || Object.keys(deal).sort();
  
  for (const elementName of orderedElements) {
    if (deal[elementName] && elementName !== 'xlink:label') {
      lines.push(...generateElementXml(elementName, deal[elementName], indent + 1));
    }
  }
  
  // Add any elements not in the order list (sorted alphabetically)
  const remainingElements = Object.keys(deal)
    .filter(k => !orderedElements.includes(k) && k !== 'xlink:label')
    .sort();
  
  for (const elementName of remainingElements) {
    lines.push(...generateElementXml(elementName, deal[elementName], indent + 1));
  }
  
  lines.push(`${pad}</DEAL>`);
  
  return lines;
}

// Generate element XML recursively
function generateElementXml(name, value, indent) {
  const lines = [];
  const pad = '  '.repeat(indent);
  
  if (value === null || value === undefined) {
    return lines;
  }
  
  if (Array.isArray(value)) {
    // Sort array if sort key exists
    const sortFn = COLLECTION_SORT_KEYS[name];
    const sorted = sortFn ? [...value].sort(sortFn) : value;
    
    for (const item of sorted) {
      lines.push(...generateElementXml(name.replace(/S$/, ''), item, indent));
    }
  } else if (typeof value === 'object') {
    // Extract xlink attributes
    const attrs = [];
    if (value['xlink:label']) attrs.push(`xlink:label="${escapeXml(value['xlink:label'])}"`);
    if (value['xlink:from']) attrs.push(`xlink:from="${escapeXml(value['xlink:from'])}"`);
    if (value['xlink:to']) attrs.push(`xlink:to="${escapeXml(value['xlink:to'])}"`);
    if (value['xlink:arcrole']) attrs.push(`xlink:arcrole="${escapeXml(value['xlink:arcrole'])}"`);
    if (value['SequenceNumber'] !== undefined) attrs.push(`SequenceNumber="${value['SequenceNumber']}"`);
    
    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    
    // Get child keys, excluding xlink attributes and SequenceNumber
    const childKeys = Object.keys(value)
      .filter(k => !k.startsWith('xlink:') && k !== 'SequenceNumber')
      .sort();
    
    if (childKeys.length === 0) {
      lines.push(`${pad}<${name}${attrString}/>`);
    } else {
      lines.push(`${pad}<${name}${attrString}>`);
      
      // Use canonical order if defined, otherwise alphabetical
      const orderedKeys = ELEMENT_ORDER[name] 
        ? [...new Set([...ELEMENT_ORDER[name], ...childKeys])]
            .filter(k => childKeys.includes(k))
        : childKeys;
      
      for (const childKey of orderedKeys) {
        lines.push(...generateElementXml(childKey, value[childKey], indent + 1));
      }
      
      lines.push(`${pad}</${name}>`);
    }
  } else {
    // Primitive value
    lines.push(`${pad}<${name}>${escapeXml(String(value))}</${name}>`);
  }
  
  return lines;
}

// Sort collection items
function sortCollection(collectionType, items) {
  if (!items || !Array.isArray(items)) return items;
  
  const sortFn = COLLECTION_SORT_KEYS[collectionType];
  if (sortFn) {
    return [...items].sort(sortFn);
  }
  
  // Default: sort by SequenceNumber
  return [...items].sort((a, b) => (a.SequenceNumber || 0) - (b.SequenceNumber || 0));
}

// Normalize namespace declarations
function normalizeNamespaces(xmlContent) {
  // This would reorder namespace declarations to canonical order
  // For now, return as-is (full implementation would parse and reserialize)
  return xmlContent;
}

// Compute SHA-256 hash
async function computeHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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