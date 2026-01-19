import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MISMO_CONFIG } from './mismoVersionConfig.js';

/**
 * Export Deal as MISMO 3.4 XML
 * Universal export for any deal type with comprehensive validation
 * 
 * Version Lock:
 * - MISMO Version: 3.4
 * - Build: 324
 * - Root Element: MESSAGE
 * - LDD Identifier: urn:fdc:mismo.org:ldd:3.4.324
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, best_effort = false } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Fetch deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Fetch related entities
    const [dealBorrowers, dealProperties, fees, signatures] = await Promise.all([
      base44.asServiceRole.entities.DealBorrower.filter({ deal_id }),
      base44.asServiceRole.entities.DealProperty.filter({ deal_id }),
      base44.asServiceRole.entities.DealFee.filter({ deal_id }),
      base44.asServiceRole.entities.ApplicationSignature.filter({ deal_id }),
    ]);

    // Fetch full borrower records
    const borrowersData = [];
    for (const db of dealBorrowers) {
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id });
      if (borrowers.length > 0) {
        const borrower = borrowers[0];
        const [assets, reoProps, declarations, demographics] = await Promise.all([
          base44.asServiceRole.entities.BorrowerAsset.filter({ borrower_id: db.borrower_id, deal_id }),
          base44.asServiceRole.entities.REOProperty.filter({ borrower_id: db.borrower_id, deal_id }),
          base44.asServiceRole.entities.BorrowerDeclaration.filter({ borrower_id: db.borrower_id, deal_id }),
          base44.asServiceRole.entities.BorrowerDemographic.filter({ borrower_id: db.borrower_id, deal_id }),
        ]);
        
        borrowersData.push({
          ...borrower,
          role: db.role,
          assets,
          reo_properties: reoProps,
          declarations: declarations[0] || {},
          demographics: demographics[0] || {},
        });
      }
    }

    // Fetch properties
    const propertiesData = [];
    for (const dp of dealProperties) {
      const props = await base44.asServiceRole.entities.Property.filter({ id: dp.property_id });
      if (props.length > 0) {
        propertiesData.push({ ...props[0], is_subject: dp.is_subject });
      }
    }

    // Validation
    const errors = [];
    const warnings = [];

    if (!deal.loan_amount) errors.push({ field: 'loan_amount', message: 'Loan amount required' });
    if (!deal.loan_purpose) errors.push({ field: 'loan_purpose', message: 'Loan purpose required' });
    if (borrowersData.length === 0) errors.push({ field: 'borrowers', message: 'At least one borrower required' });
    if (propertiesData.length === 0) errors.push({ field: 'properties', message: 'At least one property required' });

    if (errors.length > 0 && !best_effort) {
      return Response.json({
        success: false,
        conformance_status: 'fail',
        validation_errors: errors,
        validation_warnings: warnings,
      }, { status: 400 });
    }

    // Build XML
    const xml = buildMISMO34XML(deal, borrowersData, propertiesData, fees, signatures);

    const filename = `MISMO34_${deal.deal_number || deal.id}_${new Date().toISOString().split('T')[0]}.xml`;

    // Log export
    await base44.asServiceRole.entities.ExportJob.create({
      org_id: deal.org_id,
      deal_id,
      export_type: 'mismo_34',
      status: 'completed',
      conformance_status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
      validation_errors: [...errors, ...warnings],
      exported_by: user.email,
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      filename,
      xml_content: xml,
      conformance_status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
      validation_errors: errors,
      validation_warnings: warnings,
      byte_size: new TextEncoder().encode(xml).length,
    });
  } catch (error) {
    console.error('MISMO export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildMISMO34XML(deal, borrowers, properties, fees, signatures) {
  const escapeXml = (str) => (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const timestamp = new Date().toISOString();
  const messageId = `MSG-${deal.id || 'NEW'}-${Date.now()}`;

  // Use centralized MISMO version config for Build 324 compliance
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<${MISMO_CONFIG.ROOT_ELEMENT} xmlns="${MISMO_CONFIG.NAMESPACE}"
         xmlns:xsi="${MISMO_CONFIG.XSI_NAMESPACE}"
         xmlns:${MISMO_CONFIG.LG_PREFIX}="${MISMO_CONFIG.LG_NAMESPACE}"
         xsi:schemaLocation="${MISMO_CONFIG.SCHEMA_LOCATION}"
         MISMOVersionID="${MISMO_CONFIG.VERSION_ID}">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${timestamp}</CreatedDatetime>
      <DataVersionIdentifier>1.0</DataVersionIdentifier>
      <DataVersionName>LoanGenius MISMO ${MISMO_CONFIG.VERSION} Build ${MISMO_CONFIG.BUILD} Export</DataVersionName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <MESSAGE_HEADER>
    <MessageIdentifier>${messageId}</MessageIdentifier>
    <MessageDatetime>${timestamp}</MessageDatetime>
    <SenderName>LoanGenius</SenderName>
    <MISMOLogicalDataDictionaryIdentifier>${MISMO_CONFIG.LDD_IDENTIFIER}</MISMOLogicalDataDictionaryIdentifier>
  </MESSAGE_HEADER>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN SequenceNumber="1">
              <LOAN_DETAIL>
                <LoanIdentifier>${escapeXml(deal.deal_number || deal.id)}</LoanIdentifier>
                <LoanPurposeType>${escapeXml(deal.loan_purpose || 'Purchase')}</LoanPurposeType>
                <BaseLoanAmount>${deal.loan_amount || 0}</BaseLoanAmount>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
                <LoanTermMonths>${deal.loan_term_months || 360}</LoanTermMonths>
              </LOAN_DETAIL>
              <AMORTIZATION>
                <AMORTIZATION_RULE>
                  <AmortizationType>${deal.amortization_type === 'arm' ? 'AdjustableRate' : deal.amortization_type === 'io' ? 'InterestOnly' : 'Fixed'}</AmortizationType>
                </AMORTIZATION_RULE>
              </AMORTIZATION>
              <EXTENSION>
                <LG:BUSINESS_PURPOSE_LOAN>
                  <LG:LoanProductType>${escapeXml(deal.loan_product || 'DSCR')}</LG:LoanProductType>
                  <LG:DSCRRatio>${deal.dscr || 0}</LG:DSCRRatio>
                  <LG:LTVRatio>${deal.ltv || 0}</LG:LTVRatio>
                </LG:BUSINESS_PURPOSE_LOAN>
              </EXTENSION>
            </LOAN>
          </LOANS>
          <COLLATERALS>`;

  // Properties
  properties.forEach((prop, idx) => {
    xml += `
            <COLLATERAL SequenceNumber="${idx + 1}">
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${escapeXml(prop.address_street)}</AddressLineText>
                  <CityName>${escapeXml(prop.address_city)}</CityName>
                  <StateCode>${escapeXml(prop.address_state)}</StateCode>
                  <PostalCode>${escapeXml(prop.address_zip)}</PostalCode>
                  ${prop.county ? `<CountyName>${escapeXml(prop.county)}</CountyName>` : ''}
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${prop.estimated_value || deal.appraised_value || 0}</PropertyEstimatedValueAmount>
                  <PropertyCurrentUsageType>${escapeXml(prop.occupancy_type || deal.occupancy_type || 'Investment')}</PropertyCurrentUsageType>
                  ${prop.number_of_units ? `<FinancedUnitCount>${prop.number_of_units}</FinancedUnitCount>` : ''}
                </PROPERTY_DETAIL>
              </SUBJECT_PROPERTY>
            </COLLATERAL>`;
  });

  xml += `
          </COLLATERALS>
          <PARTIES>`;

  // Borrowers
  borrowers.forEach((b, idx) => {
    xml += `
            <PARTY SequenceNumber="${idx + 1}">
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${escapeXml(b.first_name)}</FirstName>
                  ${b.middle_name ? `<MiddleName>${escapeXml(b.middle_name)}</MiddleName>` : ''}
                  <LastName>${escapeXml(b.last_name)}</LastName>
                </NAME>
              </INDIVIDUAL>
              <ROLES>
                <ROLE>
                  <BORROWER>
                    <BorrowerClassificationType>${b.role === 'primary' ? 'Primary' : 'CoBorrower'}</BorrowerClassificationType>
                  </BORROWER>
                  <ROLE_DETAIL>
                    <PartyRoleType>Borrower</PartyRoleType>
                  </ROLE_DETAIL>
                </ROLE>
              </ROLES>
            </PARTY>`;
  });

  xml += `
          </PARTIES>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</${MISMO_CONFIG.ROOT_ELEMENT}>`;

  return xml;
}