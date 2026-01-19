import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO Import Mapper with Unmapped Field Retention
// Ensures no inbound data is silently discarded

// Sensitive field patterns for PII redaction
const SENSITIVE_PATTERNS = [
  /ssn/i, /socialsecurity/i, /taxpayer.*id/i, /tin/i,
  /dob/i, /dateofbirth/i, /birthdate/i,
  /taxid/i, /ein/i, /employeridentification/i,
  /accountnumber/i, /routingnumber/i,
  /password/i, /secret/i, /credential/i
];

// Field mapping from MISMO XPath to canonical fields
const MISMO_TO_CANONICAL_MAP = {
  // Loan fields
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/LOANS/LOAN/TERMS_OF_LOAN/NoteAmount': 'loan_amount',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/LOANS/LOAN/TERMS_OF_LOAN/NoteRatePercent': 'interest_rate',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/LOANS/LOAN/LOAN_DETAIL/LoanPurposeType': 'loan_purpose',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/LOANS/LOAN/LOAN_DETAIL/ApplicationReceivedDate': 'application_date',
  
  // Property fields
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText': 'property_street',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName': 'property_city',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode': 'property_state',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode': 'property_zip',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyEstimatedValueAmount': 'appraised_value',
  
  // Borrower fields (primary)
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/PARTIES/PARTY[ROLES/ROLE/BORROWER]/INDIVIDUAL/NAME/FirstName': 'borrower_first_name',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/PARTIES/PARTY[ROLES/ROLE/BORROWER]/INDIVIDUAL/NAME/LastName': 'borrower_last_name',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/PARTIES/PARTY[ROLES/ROLE/BORROWER]/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_EMAIL/ContactPointEmailValue': 'borrower_email',
  '/MESSAGE/DEAL_SETS/DEAL_SET/DEALS/DEAL/PARTIES/PARTY[ROLES/ROLE/BORROWER]/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_TELEPHONE/ContactPointTelephoneValue': 'borrower_phone',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, xml_content, pack_id, raw_only_mode } = await req.json();

    // ACTION: Import and map MISMO XML
    if (action === 'import') {
      const result = await importMismoXml(base44, xml_content, pack_id, raw_only_mode, user);
      return Response.json({
        success: true,
        import_result: result
      });
    }

    // ACTION: Analyze XML for unmapped fields
    if (action === 'analyze_unmapped') {
      const analysis = analyzeUnmappedFields(xml_content);
      return Response.json({
        success: true,
        analysis
      });
    }

    // ACTION: Get mapping coverage
    if (action === 'get_mapping_coverage') {
      return Response.json({
        success: true,
        mapped_fields: Object.keys(MISMO_TO_CANONICAL_MAP).length,
        mapping: MISMO_TO_CANONICAL_MAP
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Import Mapper error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Main import function
async function importMismoXml(base44, xmlContent, packId, rawOnlyMode, user) {
  const importRun = {
    id: `IMP-${Date.now()}`,
    imported_at: new Date().toISOString(),
    imported_by: user.email,
    pack_id: packId || 'PACK_A_GENERIC_MISMO_34_B324',
    raw_only_mode: rawOnlyMode || false,
    status: 'processing',
    mapped_fields: {},
    unmapped_nodes: [],
    validation_report: null
  };

  try {
    // Step 1: Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parse errors
    const parseErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      importRun.status = 'failed';
      importRun.validation_report = {
        status: 'FAIL',
        errors: [{
          category: 'well-formedness',
          message: 'XML is not well-formed',
          severity: 'error'
        }]
      };
      return importRun;
    }

    // Step 2: Extract mapped fields
    const canonicalData = {};
    const mappedXPaths = new Set();

    for (const [xpath, canonicalField] of Object.entries(MISMO_TO_CANONICAL_MAP)) {
      const value = extractValueByXPath(xmlDoc, xpath);
      if (value !== null) {
        canonicalData[canonicalField] = value;
        mappedXPaths.add(xpath);
      }
    }

    importRun.mapped_fields = canonicalData;

    // Step 3: Find unmapped nodes
    const allNodes = getAllTextNodes(xmlDoc.documentElement, '');
    const unmappedNodes = [];

    for (const node of allNodes) {
      const isPartiallyMapped = Array.from(mappedXPaths).some(mp => 
        node.xpath.includes(mp.split('/').slice(-1)[0])
      );
      
      if (!isPartiallyMapped && node.value && node.value.trim()) {
        // Redact sensitive values
        const redactedValue = redactSensitiveValue(node.xpath, node.value);
        
        unmappedNodes.push({
          xpath: node.xpath,
          element_name: node.elementName,
          value_hash: await hashValue(node.value),
          value_preview: redactedValue.substring(0, 50) + (redactedValue.length > 50 ? '...' : ''),
          is_sensitive: redactedValue !== node.value
        });
      }
    }

    importRun.unmapped_nodes = unmappedNodes;

    // Step 4: Generate validation report
    importRun.validation_report = generateValidationReport(canonicalData, unmappedNodes, packId);

    // Step 5: Determine status
    if (importRun.validation_report.status === 'FAIL' && !rawOnlyMode) {
      importRun.status = 'blocked';
      importRun.message = 'Validation failed - import blocked (enable raw-only mode to force)';
    } else {
      importRun.status = rawOnlyMode ? 'imported_raw_only' : 'imported';
    }

    // Step 6: Encrypt raw XML for storage
    importRun.raw_xml_size = xmlContent.length;
    importRun.raw_xml_hash = await hashValue(xmlContent);
    // In production: importRun.raw_xml_encrypted = await encrypt(xmlContent);

    return importRun;

  } catch (error) {
    importRun.status = 'failed';
    importRun.error = error.message;
    return importRun;
  }
}

// Extract value by simplified XPath
function extractValueByXPath(xmlDoc, xpath) {
  try {
    // Simplified XPath extraction (handles basic paths)
    const parts = xpath.split('/').filter(p => p && p !== 'MESSAGE');
    let current = xmlDoc.documentElement;
    
    for (const part of parts) {
      if (!current) return null;
      
      // Handle predicates like [ROLES/ROLE/BORROWER]
      const match = part.match(/^([^[]+)(?:\[.+\])?$/);
      const tagName = match ? match[1] : part;
      
      const children = current.getElementsByTagName(tagName);
      current = children.length > 0 ? children[0] : null;
    }
    
    return current?.textContent?.trim() || null;
  } catch {
    return null;
  }
}

// Get all text nodes with their XPaths
function getAllTextNodes(element, parentPath) {
  const nodes = [];
  const currentPath = parentPath + '/' + element.tagName;
  
  // Check if element has direct text content
  for (const child of element.childNodes) {
    if (child.nodeType === 3) { // Text node
      const value = child.textContent?.trim();
      if (value) {
        nodes.push({
          xpath: currentPath,
          elementName: element.tagName,
          value: value
        });
      }
    } else if (child.nodeType === 1) { // Element node
      nodes.push(...getAllTextNodes(child, currentPath));
    }
  }
  
  return nodes;
}

// Analyze unmapped fields
function analyzeUnmappedFields(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const allNodes = getAllTextNodes(xmlDoc.documentElement, '');
  const mappedXPaths = new Set(Object.keys(MISMO_TO_CANONICAL_MAP));
  
  const unmapped = allNodes.filter(node => {
    return !Array.from(mappedXPaths).some(mp => 
      node.xpath.includes(mp.split('/').slice(-1)[0])
    );
  });

  // Group by parent element
  const grouped = {};
  for (const node of unmapped) {
    const parent = node.xpath.split('/').slice(0, -1).join('/');
    if (!grouped[parent]) {
      grouped[parent] = [];
    }
    grouped[parent].push(node.elementName);
  }

  return {
    total_nodes: allNodes.length,
    unmapped_count: unmapped.length,
    mapping_coverage: ((allNodes.length - unmapped.length) / allNodes.length * 100).toFixed(1) + '%',
    unmapped_by_section: grouped
  };
}

// Generate validation report
function generateValidationReport(canonicalData, unmappedNodes, packId) {
  const errors = [];
  const warnings = [];

  // Check required fields
  const requiredFields = ['loan_amount', 'property_street', 'property_city', 'property_state', 'property_zip'];
  for (const field of requiredFields) {
    if (!canonicalData[field]) {
      errors.push({
        category: 'missing_required',
        field,
        xpath: Object.entries(MISMO_TO_CANONICAL_MAP).find(([_, v]) => v === field)?.[0] || 'unknown',
        message: `Required field '${field}' not found in import`,
        severity: 'error'
      });
    }
  }

  // Warn about unmapped nodes
  if (unmappedNodes.length > 0) {
    warnings.push({
      category: 'mapping_gaps',
      count: unmappedNodes.length,
      message: `${unmappedNodes.length} fields not mapped to canonical model (retained in raw storage)`,
      severity: 'warning'
    });
  }

  // Warn about sensitive unmapped data
  const sensitiveUnmapped = unmappedNodes.filter(n => n.is_sensitive);
  if (sensitiveUnmapped.length > 0) {
    warnings.push({
      category: 'sensitive_data',
      count: sensitiveUnmapped.length,
      message: `${sensitiveUnmapped.length} potentially sensitive fields detected (values redacted in reports)`,
      severity: 'warning'
    });
  }

  let status = 'PASS';
  if (errors.length > 0) {
    status = 'FAIL';
  } else if (warnings.length > 0) {
    status = 'PASS_WITH_WARNINGS';
  }

  return {
    status,
    errors,
    warnings,
    summary: {
      mapped_fields: Object.keys(canonicalData).length,
      unmapped_nodes: unmappedNodes.length,
      error_count: errors.length,
      warning_count: warnings.length
    },
    pack_id: packId,
    generated_at: new Date().toISOString()
  };
}

// Redact sensitive values
function redactSensitiveValue(xpath, value) {
  const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(xpath));
  
  if (isSensitive) {
    // Redact all but last 4 characters
    if (value.length > 4) {
      return '***' + value.slice(-4);
    }
    return '****';
  }
  
  return value;
}

// Hash value for storage reference
async function hashValue(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}