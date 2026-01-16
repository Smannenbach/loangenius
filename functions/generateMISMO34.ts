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

    const { deal_id, org_id: provided_org_id } = await req.json();

    if (!deal_id) {
     return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get org_id from user membership if not provided
    let org_id = provided_org_id;
    if (!org_id) {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });
      org_id = memberships.length > 0 ? memberships[0].org_id : 'default';
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

    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id, org_id });
    const properties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id, org_id });
    const fees = await base44.asServiceRole.entities.DealFee.filter({ deal_id, org_id });

    // Fetch full borrower and property details
    const fullBorrowers = [];
    for (const db of borrowers) {
      try {
        const borrower = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id, org_id });
        if (borrower.length > 0) {
          fullBorrowers.push({ ...borrower[0], role: db.role });
        }
      } catch (e) {
        console.error('Failed to fetch borrower:', db.borrower_id);
      }
    }

    const fullProperties = [];
    for (const dp of properties) {
      try {
        const property = await base44.asServiceRole.entities.Property.filter({ id: dp.property_id, org_id });
        if (property.length > 0) {
          fullProperties.push(property[0]);
        }
      } catch (e) {
        console.error('Failed to fetch property:', dp.property_id);
      }
    }

    // Validate required fields
    const validationErrors = [];
    const validationWarnings = [];

    if (!deal.loan_amount) validationErrors.push({ field: 'loan_amount', message: 'Loan amount required' });
    if (!deal.interest_rate) validationErrors.push({ field: 'interest_rate', message: 'Interest rate required' });
    if (!fullBorrowers.length) validationErrors.push({ field: 'borrower', message: 'At least one borrower required' });
    if (!fullProperties.length) validationErrors.push({ field: 'property', message: 'At least one property required' });

    if (deal.dscr < 1.0) validationWarnings.push({ field: 'dscr', message: 'DSCR below 1.0 may require manual underwriting' });
    if (deal.ltv > 80) validationWarnings.push({ field: 'ltv', message: 'LTV above 80%; reserve requirements may apply' });

    // Build MISMO XML structure
    let misomoXml = buildMISMOXml(deal, fullBorrowers, fullProperties, fees);

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
  const escapeXml = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         MISMOVersionID="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${new Date().toISOString()}</CreatedDatetime>
      <DataVersionIdentifier>1</DataVersionIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN SequenceNumber="1">
              <LOAN_DETAIL>
                <LoanIdentifier>${escapeXml(deal.deal_number || deal.id)}</LoanIdentifier>
                <LoanPurposeType>${escapeXml(deal.loan_purpose)}</LoanPurposeType>
                <LoanAmount>${deal.loan_amount || 0}</LoanAmount>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
                <LoanTermMonths>${deal.loan_term_months || 360}</LoanTermMonths>
                <ApplicationReceivedDate>${deal.application_date || xmlDate}</ApplicationReceivedDate>
              </LOAN_DETAIL>
              <AMORTIZATION>
                <AMORTIZATION_RULE>
                  <AmortizationType>${escapeXml(deal.amortization_type || 'Fixed')}</AmortizationType>
                  ${deal.interest_only_period_months ? `<InterestOnlyTermMonths>${deal.interest_only_period_months}</InterestOnlyTermMonths>` : ''}
                </AMORTIZATION_RULE>
              </AMORTIZATION>
              <PREPAYMENT_PENALTY>
                <PrepaymentPenaltyType>${escapeXml(deal.prepay_penalty_type || 'None')}</PrepaymentPenaltyType>
                ${deal.prepay_penalty_term_months ? `<PrepaymentPenaltyTermMonths>${deal.prepay_penalty_term_months}</PrepaymentPenaltyTermMonths>` : ''}
              </PREPAYMENT_PENALTY>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${escapeXml(deal.deal_number || deal.id)}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <QUALIFICATION>
                <QUALIFICATION_DETAIL>
                  <LTV_Ratio>${deal.ltv || 0}</LTV_Ratio>
                  <DSCR_Ratio>${deal.dscr || 0}</DSCR_Ratio>
                </QUALIFICATION_DETAIL>
              </QUALIFICATION>
            </LOAN>
          </LOANS>
          <COLLATERALS>`;

  properties.forEach((prop, idx) => {
    xml += `
            <COLLATERAL SequenceNumber="${idx + 1}">
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${escapeXml(prop.address_street)}</AddressLineText>
                  <AddressUnitIdentifier>${escapeXml(prop.address_unit || '')}</AddressUnitIdentifier>
                  <CityName>${escapeXml(prop.address_city)}</CityName>
                  <StateCode>${escapeXml(prop.address_state)}</StateCode>
                  <PostalCode>${escapeXml(prop.address_zip)}</PostalCode>
                  <CountyName>${escapeXml(prop.county || '')}</CountyName>
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyStructureBuiltYear>${prop.year_built || ''}</PropertyStructureBuiltYear>
                  <PropertyExistingLienAmount>${prop.existing_liens || 0}</PropertyExistingLienAmount>
                  <FinancedUnitCount>${prop.units || 1}</FinancedUnitCount>
                  <PropertyEstimatedValueAmount>${prop.estimated_value || deal.loan_amount / 0.75}</PropertyEstimatedValueAmount>
                  <PropertyCurrentUsageType>${escapeXml(prop.occupancy_type || 'Investment')}</PropertyCurrentUsageType>
                  <AttachmentType>${escapeXml(prop.property_type || 'Detached')}</AttachmentType>
                  ${prop.sqft ? `<GrossLivingAreaSquareFeetCount>${prop.sqft}</GrossLivingAreaSquareFeetCount>` : ''}
                  ${prop.bedrooms ? `<BedroomCount>${prop.bedrooms}</BedroomCount>` : ''}
                  ${prop.bathrooms ? `<BathroomCount>${prop.bathrooms}</BathroomCount>` : ''}
                  ${prop.lot_size ? `<LotAcreageAmount>${prop.lot_size}</LotAcreageAmount>` : ''}
                  ${prop.apn ? `<AssessorParcelIdentifier>${escapeXml(prop.apn)}</AssessorParcelIdentifier>` : ''}
                  ${prop.zoning ? `<ZoningClassificationType>${escapeXml(prop.zoning)}</ZoningClassificationType>` : ''}
                </PROPERTY_DETAIL>
                ${prop.legal_description ? `<LEGAL_DESCRIPTION><LegalDescription>${escapeXml(prop.legal_description)}</LegalDescription></LEGAL_DESCRIPTION>` : ''}
              </SUBJECT_PROPERTY>
            </COLLATERAL>`;
  });

  xml += `
          </COLLATERALS>
          <PARTIES>`;

  borrowers.forEach((b, idx) => {
    xml += `
            <PARTY SequenceNumber="${idx + 1}">
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${escapeXml(b.first_name)}</FirstName>
                  ${b.middle_name ? `<MiddleName>${escapeXml(b.middle_name)}</MiddleName>` : ''}
                  <LastName>${escapeXml(b.last_name)}</LastName>
                  ${b.suffix ? `<SuffixName>${escapeXml(b.suffix)}</SuffixName>` : ''}
                </NAME>
              </INDIVIDUAL>
              <ROLES>
                <ROLE>
                  <BORROWER>
                    <BorrowerBirthDate>${b.dob_encrypted || b.dob || ''}</BorrowerBirthDate>
                    <BorrowerClassificationType>${escapeXml(b.role || 'Primary')}</BorrowerClassificationType>
                    ${b.credit_score_est ? `<CreditScoreValue>${b.credit_score_est}</CreditScoreValue>` : ''}
                  </BORROWER>
                  <ROLE_DETAIL>
                    <PartyRoleType>Borrower</PartyRoleType>
                  </ROLE_DETAIL>
                </ROLE>
              </ROLES>
              <TAXPAYER_IDENTIFIERS>
                <TAXPAYER_IDENTIFIER>
                  ${b.ssn_encrypted ? `<TaxpayerIdentifierValue>XXX-XX-${(b.ssn_encrypted || '').slice(-4)}</TaxpayerIdentifierValue>` : ''}
                  <TaxpayerIdentifierType>SocialSecurityNumber</TaxpayerIdentifierType>
                </TAXPAYER_IDENTIFIER>
              </TAXPAYER_IDENTIFIERS>
              <ADDRESSES>
                ${b.mailing_address ? `
                <ADDRESS>
                  <AddressLineText>${escapeXml(b.mailing_address)}</AddressLineText>
                  <AddressType>Mailing</AddressType>
                </ADDRESS>` : ''}
              </ADDRESSES>
              <CONTACTS>
                ${b.email ? `
                <CONTACT>
                  <ContactPointValue>${escapeXml(b.email)}</ContactPointValue>
                  <ContactPointType>Email</ContactPointType>
                </CONTACT>` : ''}
                ${b.phone ? `
                <CONTACT>
                  <ContactPointValue>${escapeXml(b.phone)}</ContactPointValue>
                  <ContactPointType>Phone</ContactPointType>
                </CONTACT>` : ''}
              </CONTACTS>
            </PARTY>`;
  });

  xml += `
          </PARTIES>
          ${fees.length > 0 ? '<SERVICES>' : ''}`;

  fees.forEach((fee, idx) => {
    xml += `
            <SERVICE SequenceNumber="${idx + 1}">
              <FEE_INFORMATION>
                <FeeActualTotalAmount>${fee.calculated_amount || fee.amount || 0}</FeeActualTotalAmount>
                <FeePaidByType>${fee.is_borrower_paid ? 'Borrower' : 'Lender'}</FeePaidByType>
                <FeeType>${escapeXml(fee.fee_name || fee.trid_category)}</FeeType>
                ${fee.trid_category ? `<IntegratedDisclosureSectionType>${escapeXml(fee.trid_category)}</IntegratedDisclosureSectionType>` : ''}
              </FEE_INFORMATION>
            </SERVICE>`;
  });

  xml += `
          ${fees.length > 0 ? '</SERVICES>' : ''}
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return xml;
}