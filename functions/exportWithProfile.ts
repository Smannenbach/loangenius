import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Export Deal using a specific MISMO 3.4 Export Profile
 * Supports configurable mappings for different destinations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, profile_id } = await req.json();

    if (!deal_id || !profile_id) {
      return Response.json({ error: 'deal_id and profile_id are required' }, { status: 400 });
    }

    // Fetch export profile
    const profiles = await base44.asServiceRole.entities.FieldMappingProfile.filter({ id: profile_id });
    if (!profiles.length) {
      return Response.json({ error: 'Export profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // Fetch deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Fetch related entities
    const [dealBorrowers, dealProperties, fees] = await Promise.all([
      base44.asServiceRole.entities.DealBorrower.filter({ deal_id }),
      base44.asServiceRole.entities.DealProperty.filter({ deal_id }),
      base44.asServiceRole.entities.DealFee.filter({ deal_id }),
    ]);

    // Fetch borrowers
    const borrowersData = [];
    for (const db of dealBorrowers) {
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id });
      if (borrowers.length > 0) {
        borrowersData.push({ ...borrowers[0], role: db.role });
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

    // Validate based on profile rules
    const validation = validateDeal(deal, borrowersData, propertiesData, profile);

    if (!validation.is_valid && !profile.mapping_json?.validation_rules?.allow_partial_data) {
      return Response.json({
        success: false,
        conformance_status: 'fail',
        validation_errors: validation.errors,
        validation_warnings: validation.warnings,
      }, { status: 400 });
    }

    // Build XML using profile mappings
    const xml = buildMISMO34XMLWithProfile(deal, borrowersData, propertiesData, fees, profile);

    const filename = `MISMO34_${profile.platform}_${deal.deal_number || deal.id}_${new Date().toISOString().split('T')[0]}.xml`;

    // Log export
    await base44.asServiceRole.entities.ExportJob.create({
      org_id: deal.org_id,
      deal_id,
      export_type: 'mismo_34',
      export_profile_id: profile_id,
      status: 'completed',
      conformance_status: validation.is_valid ? 'pass' : validation.errors.length > 0 ? 'fail' : 'warn',
      validation_errors: [...validation.errors, ...validation.warnings],
      exported_by: user.email,
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      filename,
      xml_content: xml,
      conformance_status: validation.is_valid ? 'pass' : validation.errors.length > 0 ? 'fail' : 'warn',
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      byte_size: new TextEncoder().encode(xml).length,
      profile_used: profile.profile_name,
    });
  } catch (error) {
    console.error('Profile export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function validateDeal(deal, borrowers, properties, profile) {
  const errors = [];
  const warnings = [];
  const rules = profile.mapping_json?.validation_rules || {};

  // Core validations
  if (!deal.loan_amount) errors.push({ field: 'loan_amount', message: 'Loan amount required' });
  if (!deal.loan_purpose) errors.push({ field: 'loan_purpose', message: 'Loan purpose required' });

  // Borrower validation
  if (rules.require_all_borrowers && borrowers.length === 0) {
    errors.push({ field: 'borrowers', message: 'At least one borrower required' });
  }

  borrowers.forEach((b, idx) => {
    if (!b.first_name || !b.last_name) {
      errors.push({ field: `borrower[${idx}].name`, message: 'Borrower name required' });
    }
  });

  // Property validation
  if (rules.require_subject_property && properties.length === 0) {
    errors.push({ field: 'properties', message: 'Subject property required' });
  }

  properties.forEach((p, idx) => {
    if (!p.address_street || !p.address_city || !p.address_state) {
      errors.push({ field: `property[${idx}].address`, message: 'Complete property address required' });
    }
  });

  // Extension field warnings
  if (!deal.dscr && deal.loan_product === 'DSCR') {
    warnings.push({ field: 'dscr', message: 'DSCR ratio recommended for DSCR loans' });
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

function buildMISMO34XMLWithProfile(deal, borrowers, properties, fees, profile) {
  const escapeXml = (str) => (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const timestamp = new Date().toISOString();
  const ns = profile.extension_namespace || 'LG';
  const coreMap = profile.mapping_json?.core_fields || {};
  const extMap = profile.mapping_json?.extension_fields || {};

  // Helper to get mapped value
  const getValue = (obj, path) => {
    const keys = path.split('.');
    let val = obj;
    for (const key of keys) {
      val = val?.[key];
    }
    return val;
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xmlns:${ns}="http://loangenius.com/mismo/extension/1.0"
         MISMOVersionID="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${timestamp}</CreatedDatetime>
      <DataVersionIdentifier>1</DataVersionIdentifier>
      <${ns}:ExtensionVersion>1.0</${ns}:ExtensionVersion>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN SequenceNumber="1">
              <LOAN_DETAIL>
                <LoanIdentifier>${escapeXml(getValue(deal, coreMap.LoanIdentifier || 'deal_number'))}</LoanIdentifier>
                <LoanPurposeType>${escapeXml(getValue(deal, coreMap.LoanPurposeType || 'loan_purpose'))}</LoanPurposeType>
                <BaseLoanAmount>${getValue(deal, coreMap.BaseLoanAmount || 'loan_amount') || 0}</BaseLoanAmount>
                <NoteRatePercent>${getValue(deal, coreMap.NoteRatePercent || 'interest_rate') || 0}</NoteRatePercent>
                <LoanTermMonths>${getValue(deal, coreMap.LoanTermMonths || 'loan_term_months') || 360}</LoanTermMonths>
              </LOAN_DETAIL>
              <AMORTIZATION>
                <AMORTIZATION_RULE>
                  <AmortizationType>${deal.amortization_type === 'arm' ? 'AdjustableRate' : deal.amortization_type === 'io' ? 'InterestOnly' : 'Fixed'}</AmortizationType>
                </AMORTIZATION_RULE>
              </AMORTIZATION>
              <EXTENSION>
                <OTHER>
                  <${ns}:BUSINESS_PURPOSE_LOAN>
                    <${ns}:LoanProductType>${escapeXml(getValue(deal, extMap.LoanProductType || 'loan_product'))}</${ns}:LoanProductType>
                    <${ns}:DSCRRatio>${getValue(deal, extMap.DSCRRatio || 'dscr') || 0}</${ns}:DSCRRatio>
                    <${ns}:LTVRatio>${getValue(deal, extMap.LTVRatio || 'ltv') || 0}</${ns}:LTVRatio>
                    <${ns}:MonthlyPITIA>${getValue(deal, extMap.MonthlyPITIA || 'monthly_pitia') || 0}</${ns}:MonthlyPITIA>
                    <${ns}:BusinessPurposeIndicator>true</${ns}:BusinessPurposeIndicator>
                    ${deal.is_blanket ? `<${ns}:IsBlanketLoan>true</${ns}:IsBlanketLoan>` : ''}
                    ${deal.is_interest_only ? `<${ns}:IsInterestOnly>true</${ns}:IsInterestOnly>` : ''}
                    ${deal.interest_only_period_months ? `<${ns}:InterestOnlyPeriodMonths>${deal.interest_only_period_months}</${ns}:InterestOnlyPeriodMonths>` : ''}
                    ${deal.prepay_penalty_type ? `<${ns}:PrepaymentPenaltyType>${escapeXml(deal.prepay_penalty_type)}</${ns}:PrepaymentPenaltyType>` : ''}
                  </${ns}:BUSINESS_PURPOSE_LOAN>
                </OTHER>
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
                  <AddressLineText>${escapeXml(getValue(prop, coreMap.AddressLineText || 'address_street'))}</AddressLineText>
                  <CityName>${escapeXml(getValue(prop, coreMap.CityName || 'address_city'))}</CityName>
                  <StateCode>${escapeXml(getValue(prop, coreMap.StateCode || 'address_state'))}</StateCode>
                  <PostalCode>${escapeXml(getValue(prop, coreMap.PostalCode || 'address_zip'))}</PostalCode>
                  ${prop.county ? `<CountyName>${escapeXml(prop.county)}</CountyName>` : ''}
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${prop.estimated_value || 0}</PropertyEstimatedValueAmount>
                  <PropertyCurrentUsageType>${escapeXml(prop.occupancy_type || 'Investment')}</PropertyCurrentUsageType>
                  ${prop.number_of_units ? `<FinancedUnitCount>${prop.number_of_units}</FinancedUnitCount>` : ''}
                </PROPERTY_DETAIL>
                <EXTENSION>
                  <OTHER>
                    <${ns}:PROPERTY_EXTENSION>
                      ${prop.gross_rent_monthly ? `<${ns}:GrossRentalIncome>${prop.gross_rent_monthly}</${ns}:GrossRentalIncome>` : ''}
                      ${prop.net_rent_monthly ? `<${ns}:NetRentalIncome>${prop.net_rent_monthly}</${ns}:NetRentalIncome>` : ''}
                    </${ns}:PROPERTY_EXTENSION>
                  </OTHER>
                </EXTENSION>
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
                  <FirstName>${escapeXml(getValue(b, coreMap.BorrowerFirstName || 'first_name'))}</FirstName>
                  ${b.middle_name ? `<MiddleName>${escapeXml(b.middle_name)}</MiddleName>` : ''}
                  <LastName>${escapeXml(getValue(b, coreMap.BorrowerLastName || 'last_name'))}</LastName>
                  ${b.suffix ? `<SuffixName>${escapeXml(b.suffix)}</SuffixName>` : ''}
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
          <SERVICES>
            <SERVICE>
              <SERVICE_PRODUCT>
                <SERVICE_PRODUCT_DETAIL>
                  <ServiceProductDescription>Export Profile: ${escapeXml(profile.profile_name)}</ServiceProductDescription>
                </SERVICE_PRODUCT_DETAIL>
              </SERVICE_PRODUCT>
            </SERVICE>
          </SERVICES>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return xml;
}