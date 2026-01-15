import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Run MISMO 3.4 export job end-to-end
 * 1. Validate deal data
 * 2. Generate MISMO XML
 * 3. Store export job record
 * 4. Return export for download
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

    // Create export job
    const exportJob = await base44.asServiceRole.entities.ExportJob.create({
      org_id: deal.org_id,
      deal_id: deal_id,
      export_type: 'mismo_34',
      status: 'processing',
      exported_by: user.email,
    });

    try {
      // Get all related data
      const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id: deal_id,
      });

      const borrowerData = await Promise.all(
        dealBorrowers.map(db => base44.asServiceRole.entities.Borrower.get(db.borrower_id))
      );

      const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
        deal_id: deal_id,
      });

      const propertyData = await Promise.all(
        dealProperties.map(dp => base44.asServiceRole.entities.Property.get(dp.property_id))
      );

      const dealFees = await base44.asServiceRole.entities.DealFee.filter({
        deal_id: deal_id,
      });

      // Validate
      const validationErrors = [];
      const validationWarnings = [];

      if (!deal.loan_amount) validationErrors.push('Loan amount required');
      if (!deal.interest_rate) validationErrors.push('Interest rate required');
      if (!deal.loan_term_months) validationErrors.push('Loan term required');
      if (borrowerData.length === 0) validationErrors.push('At least one borrower required');
      if (propertyData.length === 0) validationErrors.push('At least one property required');

      if (deal.dscr && deal.dscr < 1.0) validationWarnings.push('DSCR below 1.0 may require manual underwriting');
      if (deal.ltv && deal.ltv > 80) validationWarnings.push('LTV above 80%; reserve requirements may apply');

      let conformanceStatus = 'pass';
      if (validationWarnings.length > 0) conformanceStatus = 'warn';
      if (validationErrors.length > 0) {
        conformanceStatus = 'fail';
        await base44.asServiceRole.entities.ExportJob.update(exportJob.id, {
          status: 'failed',
          conformance_status: conformanceStatus,
          validation_errors: validationErrors,
        });
        return Response.json({
          success: false,
          errors: validationErrors,
          warnings: validationWarnings,
          conformance_status: conformanceStatus,
        }, { status: 400 });
      }

      // Generate MISMO XML
      const misomoXml = buildMISMOXml(deal, dealBorrowers, borrowerData, propertyData, dealFees);

      // Upload XML file
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: misomoXml,
      });

      // Update export job
      await base44.asServiceRole.entities.ExportJob.update(exportJob.id, {
        status: 'completed',
        file_url,
        conformance_status: conformanceStatus,
        validation_errors: validationErrors,
        completed_at: new Date().toISOString(),
      });

      // Log activity
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        activity_type: 'DEAL_UPDATED',
        description: `MISMO 3.4 export completed for ${deal.deal_number}`,
        source: 'system',
      });

      return Response.json({
        success: true,
        export_id: exportJob.id,
        file_url,
        conformance_status: conformanceStatus,
        warnings: validationWarnings,
      });
    } catch (err) {
      await base44.asServiceRole.entities.ExportJob.update(exportJob.id, {
        status: 'failed',
        conformance_status: 'fail',
        validation_errors: [err.message],
      });
      throw err;
    }
  } catch (error) {
    console.error('MISMO export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildMISMOXml(deal, dealBorrowers, borrowers, properties, fees) {
  const xmlDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<LOAN_APPLICATION_PACKAGE MISMOVersionID="3.4">
  <LOANS>
    <LOAN>
      <LOAN_IDENTIFIER>${deal.deal_number || deal.id}</LOAN_IDENTIFIER>
      <LOAN_PURPOSE_DESCRIPTION>${deal.loan_purpose || 'Purchase'}</LOAN_PURPOSE_DESCRIPTION>
      <LOAN_AMOUNT>${deal.loan_amount || 0}</LOAN_AMOUNT>
      <INTEREST_RATE>${deal.interest_rate || 0}</INTEREST_RATE>
      <LOAN_TERM_MONTHS>${deal.loan_term_months || 360}</LOAN_TERM_MONTHS>
      <AMORTIZATION_TYPE>${deal.amortization_type || 'fixed'}</AMORTIZATION_TYPE>
      <LOAN_TYPE>${deal.loan_product || 'DSCR'}</LOAN_TYPE>
      <METRICS>
        <LTV>${deal.ltv || 0}</LTV>
        <DSCR>${deal.dscr || 0}</DSCR>
        <MONTHLY_PITIA>${deal.monthly_pitia || 0}</MONTHLY_PITIA>
      </METRICS>
      <PROPERTIES>`;

  properties.forEach((prop, idx) => {
    xml += `
        <PROPERTY>
          <PROPERTY_IDENTIFIER>${idx + 1}</PROPERTY_IDENTIFIER>
          <ADDRESS_STREET_LINE1>${prop?.address_street || ''}</ADDRESS_STREET_LINE1>
          <ADDRESS_CITY>${prop?.address_city || ''}</ADDRESS_CITY>
          <ADDRESS_STATE_CODE>${prop?.address_state || ''}</ADDRESS_STATE_CODE>
          <ADDRESS_POSTAL_CODE>${prop?.address_zip || ''}</ADDRESS_POSTAL_CODE>
          <PROPERTY_TYPE_CODE>${prop?.property_type || ''}</PROPERTY_TYPE_CODE>
          <OCCUPANCY_STATUS>${prop?.occupancy_type || 'Investment'}</OCCUPANCY_STATUS>
          <GROSS_MONTHLY_RENT>${prop?.gross_rent_monthly || 0}</GROSS_MONTHLY_RENT>
          <OTHER_MONTHLY_INCOME>${prop?.other_income_monthly || 0}</OTHER_MONTHLY_INCOME>
          <MONTHLY_PROPERTY_TAXES>${prop?.taxes_monthly || 0}</MONTHLY_PROPERTY_TAXES>
          <MONTHLY_PROPERTY_INSURANCE>${prop?.insurance_monthly || 0}</MONTHLY_PROPERTY_INSURANCE>
        </PROPERTY>`;
  });

  xml += `
      </PROPERTIES>
      <BORROWERS>`;

  borrowers.forEach((b, idx) => {
    const role = dealBorrowers[idx]?.role || 'primary';
    xml += `
        <BORROWER>
          <BORROWER_IDENTIFIER>${idx + 1}</BORROWER_IDENTIFIER>
          <BORROWER_ROLE_IDENTIFIER>${role}</BORROWER_ROLE_IDENTIFIER>
          <LEGAL_NAME>${b?.last_name || ''}, ${b?.first_name || ''}</LEGAL_NAME>
          <EMAIL_ADDRESS>${b?.email || ''}</EMAIL_ADDRESS>
          <PHONE_NUMBER>${b?.phone || ''}</PHONE_NUMBER>
          <CITIZENSHIP_STATUS>${b?.citizenship_status || 'US_Citizen'}</CITIZENSHIP_STATUS>
        </BORROWER>`;
  });

  xml += `
      </BORROWERS>
      <FEES>`;

  fees.forEach((fee, idx) => {
    xml += `
        <FEE>
          <FEE_IDENTIFIER>${idx + 1}</FEE_IDENTIFIER>
          <FEE_NAME>${fee?.fee_name || ''}</FEE_NAME>
          <FEE_AMOUNT>${fee?.calculated_amount || 0}</FEE_AMOUNT>
          <IS_BORROWER_PAID>${fee?.is_borrower_paid ? 'true' : 'false'}</IS_BORROWER_PAID>
        </FEE>`;
  });

  xml += `
      </FEES>
    </LOAN>
  </LOANS>
  <GENERATED_DATE>${xmlDate}</GENERATED_DATE>
  <GENERATOR_NAME>LoanGenius MISMO 3.4 Exporter</GENERATOR_NAME>
</LOAN_APPLICATION_PACKAGE>`;

  return xml;
}