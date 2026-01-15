/**
 * Generate MISMO 3.4 XML export from canonical deal snapshot
 * MISMO = Mortgage Industry Standards Maintenance Organization
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id } = await req.json();

    if (!deal_id || !org_id) {
     return Response.json({ error: 'Missing deal_id or org_id' }, { status: 400 });
    }

    // Verify user belongs to org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
     user_id: user.email,
     org_id
    });
    if (memberships.length === 0) {
     return Response.json({ error: 'Unauthorized: not in this organization' }, { status: 403 });
    }

    // Fetch deal + supporting data with org isolation
    const deals = await base44.asServiceRole.entities.Deal.filter({ 
     id: deal_id,
     org_id 
    });
    if (!deals.length) {
     return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    const properties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
    const fees = await base44.asServiceRole.entities.DealFee.filter({ deal_id });

    // Validate required fields
    const validationErrors = [];
    const validationWarnings = [];

    if (!deal.loan_amount) validationErrors.push({ field: 'loan_amount', message: 'Loan amount required' });
    if (!deal.interest_rate) validationErrors.push({ field: 'interest_rate', message: 'Interest rate required' });
    if (!borrowers.length) validationErrors.push({ field: 'borrower', message: 'At least one borrower required' });
    if (!properties.length) validationErrors.push({ field: 'property', message: 'At least one property required' });

    if (deal.dscr < 1.0) validationWarnings.push({ field: 'dscr', message: 'DSCR below 1.0 may require manual underwriting' });
    if (deal.ltv > 80) validationWarnings.push({ field: 'ltv', message: 'LTV above 80%; reserve requirements may apply' });

    // Build MISMO XML structure
    let misomoXml = buildMISMOXml(deal, borrowers, properties, fees);

    // Compress and store
    const encoder = new TextEncoder();
    const data = encoder.encode(misomoXml);

    // Create temporary file
    const filename = `MISMO_${deal.deal_number || deal_id}_${Date.now()}.xml`;

    return Response.json({
      success: true,
      filename,
      xml_content: misomoXml,
      validation_passed: validationErrors.length === 0,
      validation_errors: validationErrors,
      validation_warnings: validationWarnings,
      byte_size: data.length
    });
  } catch (error) {
    console.error('Error generating MISMO 3.4:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildMISMOXml(deal, borrowers, properties, fees) {
  const xmlDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MISMO_VERSION="3.4">
  <LOAN_APPLICATION_PACKAGE>
    <LOANS>
      <LOAN>
        <LOAN_IDENTIFIER>${deal.deal_number || deal.id}</LOAN_IDENTIFIER>
        <LOAN_PURPOSE_DESCRIPTION>${deal.loan_purpose}</LOAN_PURPOSE_DESCRIPTION>
        <LOAN_AMOUNT>${deal.loan_amount}</LOAN_AMOUNT>
        <INTEREST_RATE>${deal.interest_rate}</INTEREST_RATE>
        <LOAN_TERM_MONTHS>${deal.loan_term_months}</LOAN_TERM_MONTHS>
        <AMORTIZATION_TYPE>${deal.amortization_type}</AMORTIZATION_TYPE>
        <LOAN_TYPE>${deal.loan_product}</LOAN_TYPE>
        <LOCK_INDICATOR>${deal.dscr >= 1.2 ? 'Yes' : 'Conditional'}</LOCK_INDICATOR>
        <METRICS>
          <LTV>${deal.ltv}</LTV>
          <DSCR>${deal.dscr}</DSCR>
          <MONTHLY_PITIA>${deal.monthly_pitia}</MONTHLY_PITIA>
        </METRICS>
        <PROPERTIES>`;

  properties.forEach((prop, idx) => {
    xml += `
          <PROPERTY>
            <PROPERTY_IDENTIFIER>${idx + 1}</PROPERTY_IDENTIFIER>
            <ADDRESS_STREET_LINE1>${prop.address_street || ''}</ADDRESS_STREET_LINE1>
            <ADDRESS_CITY>${prop.address_city || ''}</ADDRESS_CITY>
            <ADDRESS_STATE_CODE>${prop.address_state || ''}</ADDRESS_STATE_CODE>
            <ADDRESS_POSTAL_CODE>${prop.address_zip || ''}</ADDRESS_POSTAL_CODE>
            <PROPERTY_TYPE_CODE>${prop.property_type || ''}</PROPERTY_TYPE_CODE>
            <OCCUPANCY_STATUS>${prop.occupancy_type || 'Investment'}</OCCUPANCY_STATUS>
            <GROSS_MONTHLY_RENT>${prop.gross_rent_monthly || 0}</GROSS_MONTHLY_RENT>
            <OTHER_MONTHLY_INCOME>${prop.other_income_monthly || 0}</OTHER_MONTHLY_INCOME>
            <MONTHLY_PROPERTY_TAXES>${prop.taxes_monthly || 0}</MONTHLY_PROPERTY_TAXES>
            <MONTHLY_PROPERTY_INSURANCE>${prop.insurance_monthly || 0}</MONTHLY_PROPERTY_INSURANCE>
            <LTV_FOR_PROPERTY>${prop.ltv_ratio || deal.ltv}</LTV_FOR_PROPERTY>
            <DSCR_FOR_PROPERTY>${prop.dscr_ratio || deal.dscr}</DSCR_FOR_PROPERTY>
          </PROPERTY>`;
  });

  xml += `
        </PROPERTIES>
        <BORROWERS>`;

  borrowers.forEach((b, idx) => {
    xml += `
          <BORROWER>
            <BORROWER_IDENTIFIER>${idx + 1}</BORROWER_IDENTIFIER>
            <BORROWER_ROLE_IDENTIFIER>${b.role}</BORROWER_ROLE_IDENTIFIER>
            <LEGAL_NAME>${b.last_name}, ${b.first_name}</LEGAL_NAME>
            <SSN_MASKED>XXX-XX-${(b.ssn_encrypted || '').slice(-4)}</SSN_MASKED>
            <EMAIL_ADDRESS>${b.email || ''}</EMAIL_ADDRESS>
            <PHONE_NUMBER>${b.phone || ''}</PHONE_NUMBER>
            <CITIZENSHIP_STATUS>${b.citizenship_status || 'US_Citizen'}</CITIZENSHIP_STATUS>
          </BORROWER>`;
  });

  xml += `
        </BORROWERS>
        <FEES>`;

  fees.forEach((fee, idx) => {
    xml += `
          <FEE>
            <FEE_IDENTIFIER>${idx + 1}</FEE_IDENTIFIER>
            <FEE_NAME>${fee.fee_name}</FEE_NAME>
            <FEE_AMOUNT>${fee.calculated_amount || 0}</FEE_AMOUNT>
            <TRID_CATEGORY>${fee.trid_category}</TRID_CATEGORY>
            <IS_BORROWER_PAID>${fee.is_borrower_paid ? 'true' : 'false'}</IS_BORROWER_PAID>
          </FEE>`;
  });

  xml += `
        </FEES>
      </LOAN>
    </LOANS>
    <GENERATED_DATE>${xmlDate}</GENERATED_DATE>
    <GENERATOR_NAME>LoanGenius MISMO 3.4 Exporter</GENERATOR_NAME>
  </LOAN_APPLICATION_PACKAGE>
</MISMO_VERSION>`;

  return xml;
}