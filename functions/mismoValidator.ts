import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MISMO 3.4 XML Compliance Schema
 * Based on Fannie Mae MISMO 3.4 specifications
 */
const MISMO_REQUIRED_FIELDS = [
  // Deal/Loan Information
  { path: 'loan_amount', label: 'Loan Amount', section: 'loan', type: 'number' },
  { path: 'interest_rate', label: 'Interest Rate', section: 'loan', type: 'number' },
  { path: 'loan_term_months', label: 'Loan Term (months)', section: 'loan', type: 'number' },
  { path: 'loan_product', label: 'Loan Product Type', section: 'loan', type: 'string' },
  { path: 'loan_purpose', label: 'Loan Purpose', section: 'loan', type: 'string' },
  
  // Primary Borrower
  { path: 'borrower.first_name', label: 'Borrower First Name', section: 'borrower', type: 'string' },
  { path: 'borrower.last_name', label: 'Borrower Last Name', section: 'borrower', type: 'string' },
  { path: 'borrower.email', label: 'Borrower Email', section: 'borrower', type: 'string' },
  { path: 'borrower.phone', label: 'Borrower Phone', section: 'borrower', type: 'string' },
  { path: 'borrower.ssn_encrypted', label: 'Borrower SSN', section: 'borrower', type: 'string' },
  { path: 'borrower.dob_encrypted', label: 'Borrower DOB', section: 'borrower', type: 'string' },
  
  // Property Information
  { path: 'property.address_street', label: 'Property Street Address', section: 'property', type: 'string' },
  { path: 'property.address_city', label: 'Property City', section: 'property', type: 'string' },
  { path: 'property.address_state', label: 'Property State', section: 'property', type: 'string' },
  { path: 'property.address_zip', label: 'Property ZIP', section: 'property', type: 'string' },
  { path: 'property.county', label: 'Property County', section: 'property', type: 'string' },
  { path: 'property.property_type', label: 'Property Type', section: 'property', type: 'string' },
  { path: 'property.occupancy_type', label: 'Occupancy Type', section: 'property', type: 'string' },
];

const MISMO_OPTIONAL_FIELDS = [
  { path: 'property.year_built', label: 'Year Built', section: 'property' },
  { path: 'property.sqft', label: 'Square Footage', section: 'property' },
  { path: 'property.beds', label: 'Bedrooms', section: 'property' },
  { path: 'property.baths', label: 'Bathrooms', section: 'property' },
  { path: 'borrower.credit_score_est', label: 'Credit Score', section: 'borrower' },
];

function getNestedValue(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function runPreflightCheck(dealId, base44) {
  const deal = await base44.asServiceRole.entities.Deal.get(dealId);
  if (!deal) throw new Error('Deal not found');

  const errors = [];
  const warnings = [];

  // Get related entities
  let borrowers = [];
  let properties = [];
  try {
    const allBorrowers = await base44.asServiceRole.entities.Borrower.filter({});
    borrowers = allBorrowers.filter(b => b.org_id === deal.org_id);
    
    const allProperties = await base44.asServiceRole.entities.Property.filter({});
    properties = allProperties.filter(p => p.org_id === deal.org_id);
  } catch (e) {
    console.error('Error fetching related entities:', e);
  }

  // Check required MISMO fields
  for (const field of MISMO_REQUIRED_FIELDS) {
    let value = getNestedValue(deal, field.path);
    
    // Special handling for borrower/property fields
    if (field.path.startsWith('borrower.')) {
      if (borrowers.length > 0) {
        value = getNestedValue(borrowers[0], field.path.replace('borrower.', ''));
      }
    } else if (field.path.startsWith('property.')) {
      if (properties.length > 0) {
        value = getNestedValue(properties[0], field.path.replace('property.', ''));
      }
    }

    if (!value) {
      errors.push({
        field: field.path,
        label: field.label,
        message: `${field.label} is required for MISMO 3.4 XML export`,
        section: field.section,
        severity: 'error'
      });
    }
  }

  // Check optional fields and warn if missing
  for (const field of MISMO_OPTIONAL_FIELDS) {
    let value = getNestedValue(deal, field.path);
    
    if (field.path.startsWith('borrower.')) {
      if (borrowers.length > 0) {
        value = getNestedValue(borrowers[0], field.path.replace('borrower.', ''));
      }
    } else if (field.path.startsWith('property.')) {
      if (properties.length > 0) {
        value = getNestedValue(properties[0], field.path.replace('property.', ''));
      }
    }

    if (!value) {
      warnings.push({
        field: field.path,
        label: field.label,
        message: `${field.label} is recommended for complete MISMO compliance`,
        section: field.section,
        severity: 'warning'
      });
    }
  }

  const completionPercent = Math.round(
    ((MISMO_REQUIRED_FIELDS.length - errors.length) / MISMO_REQUIRED_FIELDS.length) * 100
  );

  return {
    isValid: errors.length === 0,
    canExport: errors.length === 0,
    errors,
    warnings,
    completionPercent,
    requiredFieldsComplete: MISMO_REQUIRED_FIELDS.length - errors.length,
    requiredFieldsTotal: MISMO_REQUIRED_FIELDS.length,
    mismoVersion: '3.4',
    timestamp: new Date().toISOString()
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { dealId } = req.body;
    if (!dealId) return Response.json({ error: 'dealId required' }, { status: 400 });

    const result = await runPreflightCheck(dealId, base44);
    return Response.json(result);
  } catch (error) {
    console.error('MISMO validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});