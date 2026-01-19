import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Preflight validation BEFORE XML generation
// Checks canonical data for MISMO compliance issues

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { application_id, pack_id } = await req.json();

    if (!application_id) {
      return Response.json({ error: 'application_id required' }, { status: 400 });
    }

    // Fetch application data
    const application = await base44.entities.LoanApplication.filter({ id: application_id });
    if (!application || application.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = application[0];
    const errors = [];
    const warnings = [];
    let status = 'PASS';

    // Required field validation
    const requiredFields = [
      { field: 'loan_amount', label: 'Loan Amount', path: '/DEAL_SETS/DEAL/LOANS/LOAN/LOAN_DETAIL/LoanAmount' },
      { field: 'loan_purpose', label: 'Loan Purpose', path: '/DEAL_SETS/DEAL/LOANS/LOAN/LOAN_DETAIL/LoanPurposeType' },
      { field: 'property_street', label: 'Property Street', path: '/DEAL_SETS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText' },
      { field: 'property_city', label: 'Property City', path: '/DEAL_SETS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName' },
      { field: 'property_state', label: 'Property State', path: '/DEAL_SETS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode' },
      { field: 'property_zip', label: 'Property ZIP', path: '/DEAL_SETS/DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode' },
    ];

    for (const req of requiredFields) {
      if (!app[req.field]) {
        errors.push({
          field: req.field,
          label: req.label,
          xpath: req.path,
          message: `Required field '${req.label}' is missing`,
          severity: 'error',
          category: 'missing_required'
        });
        status = 'FAIL';
      }
    }

    // Enum validation
    const enumChecks = [
      { field: 'loan_purpose', enum_type: 'LoanPurposeType', allowed: ['Purchase', 'Refinance', 'CashOutRefinance', 'NoCashOutRefinance'] },
      { field: 'occupancy_type', enum_type: 'PropertyUsageType', allowed: ['Investment', 'PrimaryResidence', 'SecondHome'] },
    ];

    for (const check of enumChecks) {
      const value = app[check.field];
      if (value && !check.allowed.includes(value)) {
        errors.push({
          field: check.field,
          value,
          enum_type: check.enum_type,
          message: `Invalid value '${value}' for ${check.enum_type}. Allowed: ${check.allowed.join(', ')}`,
          severity: 'error',
          category: 'enum_violation'
        });
        status = 'FAIL';
      }
    }

    // Datatype validation
    if (app.loan_amount && (isNaN(app.loan_amount) || app.loan_amount <= 0)) {
      errors.push({
        field: 'loan_amount',
        value: app.loan_amount,
        message: 'Loan amount must be a positive number',
        severity: 'error',
        category: 'datatype'
      });
      status = 'FAIL';
    }

    // Conditional logic checks
    if (app.loan_purpose === 'CashOutRefinance' && !app.cash_out_amount) {
      warnings.push({
        field: 'cash_out_amount',
        message: 'Cash-out amount recommended for Cash-Out Refinance purpose',
        severity: 'warning',
        category: 'conditional_logic'
      });
      if (status === 'PASS') status = 'PASS_WITH_WARNINGS';
    }

    // Extension field detection
    const dscr_fields = ['dscr_ratio', 'gross_rental_income', 'net_operating_income'];
    const has_extension_fields = dscr_fields.some(f => app[f] !== undefined && app[f] !== null);

    const report = {
      status,
      errors,
      warnings,
      summary: {
        total_errors: errors.length,
        total_warnings: warnings.length,
        required_field_errors: errors.filter(e => e.category === 'missing_required').length,
        enum_errors: errors.filter(e => e.category === 'enum_violation').length,
        datatype_errors: errors.filter(e => e.category === 'datatype').length,
        has_extension_fields,
        extension_field_count: dscr_fields.filter(f => app[f] !== undefined).length
      },
      application_id,
      pack_id: pack_id || 'PACK_A_GENERIC_MISMO_34_B324',
      validated_at: new Date().toISOString()
    };

    return report;

  } catch (error) {
    return {
      status: 'FAIL',
      errors: [{
        message: 'Preflight validation failed: ' + error.message,
        severity: 'error',
        category: 'system'
      }],
      warnings: []
    };
  }
}

// Validate MISMO structure requirements
function validateMismoStructure(xmlContent, packId) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    return {
      root_element: xmlDoc.documentElement.tagName,
      has_message_root: xmlDoc.documentElement.tagName === 'MESSAGE',
      namespaces: extractNamespaces(xmlDoc.documentElement),
      ldd_identifier: extractLDDIdentifier(xmlDoc),
      mismo_version: extractMISMOVersion(xmlDoc),
      is_valid: xmlDoc.documentElement.tagName === 'MESSAGE'
    };
  } catch (error) {
    return {
      is_valid: false,
      error: error.message
    };
  }
}

function extractNamespaces(element) {
  const namespaces = {};
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attr.name.startsWith('xmlns')) {
      namespaces[attr.name] = attr.value;
    }
  }
  return namespaces;
}

function extractLDDIdentifier(xmlDoc) {
  const lddElements = xmlDoc.getElementsByTagName('MISMOLogicalDataDictionaryIdentifier');
  return lddElements.length > 0 ? lddElements[0].textContent?.trim() : null;
}

function extractMISMOVersion(xmlDoc) {
  const versionElements = xmlDoc.getElementsByTagName('MISMOVersionIdentifier');
  return versionElements.length > 0 ? versionElements[0].textContent?.trim() : null;
}

function validateEnum(fieldName, fieldValue) {
  const enumRules = {
    'LoanPurposeType': ['Purchase', 'Refinance', 'CashOutRefinance', 'NoCashOutRefinance'],
    'PropertyUsageType': ['Investment', 'PrimaryResidence', 'SecondHome'],
    'LegalEntityType': ['Corporation', 'GeneralPartnership', 'LimitedLiabilityCompany', 'Trust'],
  };
  
  const allowed = enumRules[fieldName];
  if (!allowed) return true; // Unknown field type, allow it
  return allowed.includes(fieldValue);
}