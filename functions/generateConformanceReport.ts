import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate human-readable conformance report for export
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canonical_snapshot, validation_result, export_profile } = await req.json();

    const report = {
      report_id: generateUUID(),
      generated_at: new Date().toISOString(),
      deal_number: canonical_snapshot.deal?.deal_number,
      export_profile: export_profile?.name || 'Unknown',
      export_type: export_profile?.export_type || 'unknown',

      overall_status: validation_result.valid ? 'PASS' : 'FAIL',

      summary: {
        required_fields_present: validation_result.summary?.required_fields_present || 0,
        required_fields_total: validation_result.summary?.required_fields_total || 0,
        errors_count: validation_result.errors?.length || 0,
        warnings_count: validation_result.warnings?.length || 0,
        completeness_score: validation_result.completeness_score || 0,
      },

      sections: [
        {
          name: 'Borrower Information',
          status: validation_result.valid ? 'OK' : 'ERRORS',
          fields: [
            {
              field: 'First Name',
              value: canonical_snapshot.borrowers?.[0]?.first_name || '(missing)',
              status: canonical_snapshot.borrowers?.[0]?.first_name ? 'OK' : 'MISSING',
            },
            {
              field: 'Last Name',
              value: canonical_snapshot.borrowers?.[0]?.last_name || '(missing)',
              status: canonical_snapshot.borrowers?.[0]?.last_name ? 'OK' : 'MISSING',
            },
            {
              field: 'SSN',
              value: canonical_snapshot.borrowers?.[0]?.ssn_encrypted ? '***-**-****' : '(missing)',
              status: canonical_snapshot.borrowers?.[0]?.ssn_encrypted ? 'OK' : 'MISSING',
            },
            {
              field: 'DOB',
              value: canonical_snapshot.borrowers?.[0]?.dob_encrypted ? '(encrypted)' : '(missing)',
              status: canonical_snapshot.borrowers?.[0]?.dob_encrypted ? 'OK' : 'OPTIONAL',
            },
          ],
        },
        {
          name: 'Property Information',
          status: 'OK',
          fields: [
            {
              field: 'Address',
              value: canonical_snapshot.properties?.[0]?.address_street || '(missing)',
              status: canonical_snapshot.properties?.[0]?.address_street ? 'OK' : 'MISSING',
            },
            {
              field: 'City',
              value: canonical_snapshot.properties?.[0]?.address_city || '(missing)',
              status: canonical_snapshot.properties?.[0]?.address_city ? 'OK' : 'MISSING',
            },
            {
              field: 'State',
              value: canonical_snapshot.properties?.[0]?.address_state || '(missing)',
              status: canonical_snapshot.properties?.[0]?.address_state ? 'OK' : 'MISSING',
            },
            {
              field: 'Type',
              value: canonical_snapshot.properties?.[0]?.property_type || '(missing)',
              status: canonical_snapshot.properties?.[0]?.property_type ? 'OK' : 'MISSING',
            },
          ],
        },
        {
          name: 'Loan Terms',
          status: 'OK',
          fields: [
            {
              field: 'Loan Amount',
              value: '$' + (canonical_snapshot.deal?.loan_amount?.toLocaleString() || '0'),
              status: canonical_snapshot.deal?.loan_amount ? 'OK' : 'MISSING',
            },
            {
              field: 'Interest Rate',
              value: (canonical_snapshot.deal?.interest_rate?.toFixed(3) || '0.000') + '%',
              status: canonical_snapshot.deal?.interest_rate ? 'OK' : 'MISSING',
            },
            {
              field: 'Loan Term',
              value: (canonical_snapshot.deal?.loan_term_months || '0') + ' months',
              status: canonical_snapshot.deal?.loan_term_months ? 'OK' : 'MISSING',
            },
            {
              field: 'Loan Purpose',
              value: canonical_snapshot.deal?.loan_purpose || '(missing)',
              status: canonical_snapshot.deal?.loan_purpose ? 'OK' : 'MISSING',
            },
          ],
        },
        {
          name: 'DSCR Analysis',
          status: canonical_snapshot.deal?.dscr ? 'OK' : 'INCOMPLETE',
          fields: [
            {
              field: 'Monthly Rent',
              value:
                '$' +
                (canonical_snapshot.properties?.[0]?.gross_rent_monthly?.toLocaleString() || '0'),
              status: canonical_snapshot.properties?.[0]?.gross_rent_monthly ? 'OK' : 'MISSING',
            },
            {
              field: 'DSCR Ratio',
              value:
                (canonical_snapshot.deal?.dscr?.toFixed(2) || '0.00') + 'x',
              status: canonical_snapshot.deal?.dscr ? 'OK' : 'NOT CALCULATED',
            },
          ],
        },
      ],

      errors: validation_result.errors || [],
      warnings: validation_result.warnings || [],
    };

    return Response.json({
      success: true,
      conformance_report: report,
    });
  } catch (error) {
    console.error('Error generating conformance report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}