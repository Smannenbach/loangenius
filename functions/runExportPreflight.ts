import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validate deal data completeness before export
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canonical_snapshot, export_profile } = await req.json();

    const errors = [];
    const warnings = [];

    // Define required fields per export profile
    const requiredFields = export_profile?.validation_rules?.required_fields || [
      'borrowers[0].first_name',
      'borrowers[0].last_name',
      'borrowers[0].ssn_encrypted',
      'properties[0].address_street',
      'properties[0].address_city',
      'properties[0].address_state',
      'properties[0].address_zip',
      'properties[0].property_type',
      'deal.loan_amount',
      'deal.interest_rate',
      'deal.loan_term_months',
      'deal.loan_purpose',
    ];

    // Check required fields
    requiredFields.forEach((fieldPath) => {
      const value = getNestedValue(canonical_snapshot, fieldPath);
      if (!value) {
        errors.push({
          field: fieldPath,
          message: `${fieldPath} is required`,
          severity: 'error',
        });
      }
    });

    // DSCR-specific validation
    if (canonical_snapshot.deal?.loan_product?.includes('DSCR')) {
      if (!canonical_snapshot.properties[0]?.gross_rent_monthly) {
        errors.push({
          field: 'properties[0].gross_rent_monthly',
          message: 'Monthly rent required for DSCR loans',
          severity: 'error',
        });
      }

      if (!canonical_snapshot.deal.dscr) {
        warnings.push({
          field: 'deal.dscr',
          message: 'DSCR has not been calculated',
          severity: 'warning',
        });
      }
    }

    // Check for recommended but optional fields
    if (!canonical_snapshot.borrowers[0]?.dob_encrypted) {
      warnings.push({
        field: 'borrowers[0].dob_encrypted',
        message: 'Borrower DOB is recommended',
        severity: 'warning',
      });
    }

    if (!canonical_snapshot.properties[0]?.year_built) {
      warnings.push({
        field: 'properties[0].year_built',
        message: 'Property year built is recommended',
        severity: 'warning',
      });
    }

    // Calculate completeness score
    const totalFields = requiredFields.length + 5; // Required + some optional
    const presentFields = requiredFields.filter((f) => getNestedValue(canonical_snapshot, f)).length + 
                         (canonical_snapshot.borrowers[0]?.dob_encrypted ? 1 : 0) +
                         (canonical_snapshot.properties[0]?.year_built ? 1 : 0) +
                         (canonical_snapshot.deal.dscr ? 1 : 0);

    const completenessScore = Math.round((presentFields / totalFields) * 100);

    return Response.json({
      valid: errors.length === 0,
      errors,
      warnings,
      completeness_score: completenessScore,
      summary: {
        required_fields_present: requiredFields.filter((f) => getNestedValue(canonical_snapshot, f)).length,
        required_fields_total: requiredFields.length,
        errors_count: errors.length,
        warnings_count: warnings.length,
      },
    });
  } catch (error) {
    console.error('Error running preflight:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getNestedValue(obj, path) {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}