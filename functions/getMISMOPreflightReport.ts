import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get MISMO 3.4 preflight report for a deal
 * Shows which fields are complete/incomplete for export
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Deal ID required' }, { status: 400 });
    }

    // Get deal
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const errors = [];
    const warnings = [];

    // Check loan fields
    if (!deal.loan_amount) errors.push({ field: 'loan_amount', label: 'Loan Amount', section: 'Loan' });
    if (!deal.interest_rate) errors.push({ field: 'interest_rate', label: 'Interest Rate', section: 'Loan' });
    if (!deal.loan_term_months) errors.push({ field: 'loan_term_months', label: 'Loan Term', section: 'Loan' });
    if (!deal.loan_product) errors.push({ field: 'loan_product', label: 'Loan Product', section: 'Loan' });
    if (!deal.loan_purpose) errors.push({ field: 'loan_purpose', label: 'Loan Purpose', section: 'Loan' });

    // Check borrower fields
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id: deal_id,
    });

    if (dealBorrowers.length === 0) {
      errors.push({ field: 'borrower', label: 'At least one borrower required', section: 'Borrower' });
    } else {
      const borrower = await base44.asServiceRole.entities.Borrower.get(dealBorrowers[0].borrower_id);
      if (!borrower?.first_name) errors.push({ field: 'borrower.first_name', label: 'Borrower First Name', section: 'Borrower' });
      if (!borrower?.last_name) errors.push({ field: 'borrower.last_name', label: 'Borrower Last Name', section: 'Borrower' });
      if (!borrower?.email) errors.push({ field: 'borrower.email', label: 'Borrower Email', section: 'Borrower' });
      if (!borrower?.phone) warnings.push({ field: 'borrower.phone', label: 'Borrower Phone (recommended)', section: 'Borrower' });
    }

    // Check property fields
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id: deal_id,
    });

    if (dealProperties.length === 0) {
      errors.push({ field: 'property', label: 'At least one property required', section: 'Property' });
    } else {
      const property = await base44.asServiceRole.entities.Property.get(dealProperties[0].property_id);
      if (!property?.address_street) errors.push({ field: 'property.address_street', label: 'Property Street Address', section: 'Property' });
      if (!property?.address_city) errors.push({ field: 'property.address_city', label: 'Property City', section: 'Property' });
      if (!property?.address_state) errors.push({ field: 'property.address_state', label: 'Property State', section: 'Property' });
      if (!property?.address_zip) errors.push({ field: 'property.address_zip', label: 'Property ZIP', section: 'Property' });
      if (!property?.property_type) errors.push({ field: 'property.property_type', label: 'Property Type', section: 'Property' });
      if (!property?.occupancy_type) warnings.push({ field: 'property.occupancy_type', label: 'Occupancy Type (recommended)', section: 'Property' });
    }

    // Check metrics
    if (deal.dscr && deal.dscr < 1.0) warnings.push({ field: 'dscr', label: 'DSCR below 1.0 (may require manual review)', section: 'Metrics' });
    if (deal.ltv && deal.ltv > 80) warnings.push({ field: 'ltv', label: 'LTV above 80% (reserve requirements may apply)', section: 'Metrics' });

    const completionPercent = Math.round(((15 - errors.length) / 15) * 100);

    return Response.json({
      success: true,
      deal_id,
      can_export: errors.length === 0,
      completion_percent: completionPercent,
      errors,
      warnings,
      summary: {
        errors_count: errors.length,
        warnings_count: warnings.length,
        fields_complete: 15 - errors.length,
        fields_total: 15,
      },
    });
  } catch (error) {
    console.error('Preflight report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});