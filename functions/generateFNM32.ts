/**
 * Generate FNM 3.2 (Fannie Mae) template export
 * FNM = Fannie Mae (government-sponsored enterprise) standard
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id: provided_org_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Fetch deal + supporting data
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];
    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    const properties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });

    // FNM 3.2 uses structured JSON format
    const fnmPayload = {
      version: '3.2',
      timestamp: new Date().toISOString(),
      deal_identifier: deal.deal_number || deal_id,
      loan: {
        amount: deal.loan_amount,
        purpose: deal.loan_purpose,
        term_months: deal.loan_term_months,
        rate: deal.interest_rate,
        amortization_type: deal.amortization_type,
        product_type: deal.loan_product,
        ltv: deal.ltv,
        dscr: deal.dscr
      },
      borrowers: borrowers.map((b, idx) => ({
        sequence: idx + 1,
        role: b.role,
        first_name: b.first_name,
        last_name: b.last_name,
        email: b.email,
        phone: b.phone,
        citizenship: b.citizenship_status
      })),
      collateral: properties.map((p, idx) => ({
        sequence: idx + 1,
        address: {
          street: p.address_street,
          city: p.address_city,
          state: p.address_state,
          zip: p.address_zip
        },
        type: p.property_type,
        occupancy: p.occupancy_type,
        valuation: {
          estimated_value: p.estimated_value || 0,
          appraisal_status: 'Pending'
        }
      }))
    };

    // Validate FNM-specific rules
    const validationErrors = [];
    const validationWarnings = [];

    // FNM requires conventional metrics
    if (deal.dscr < 1.1) {
      validationErrors.push({
        code: 'FNM_DSCR_MIN',
        message: 'FNM requires minimum DSCR of 1.10',
        field: 'dscr',
        value: deal.dscr
      });
    }

    if (deal.ltv > 75) {
      validationWarnings.push({
        code: 'FNM_LTV_HIGH',
        message: 'LTV > 75% may require additional reserve requirements',
        field: 'ltv'
      });
    }

    const jsonStr = JSON.stringify(fnmPayload, null, 2);
    const encoder = new TextEncoder();
    const byteSize = encoder.encode(jsonStr).length;

    const filename = `FNM32_${deal.deal_number || deal_id}_${Date.now()}.json`;

    return Response.json({
      success: true,
      filename,
      payload: fnmPayload,
      json_content: jsonStr,
      validation_passed: validationErrors.length === 0,
      validation_errors: validationErrors,
      validation_warnings: validationWarnings,
      byte_size: byteSize
    });
  } catch (error) {
    console.error('Error generating FNM 3.2:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});