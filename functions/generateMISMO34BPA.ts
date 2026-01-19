/**
 * Generate MISMO 3.4 XML export from Business Purpose Application
 * Supports DSCR, Commercial, Hard Money, Bridge, Fix & Flip, Multifamily
 * With extension namespace for business-purpose specific fields
 * 
 * Version Lock:
 * - MISMO Version: 3.4
 * - Build: 324
 * - Root Element: MESSAGE
 * - LDD Identifier: urn:fdc:mismo.org:ldd:3.4.324
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO Version Lock Configuration - Build 324
const MISMO_CONFIG = {
  VERSION: '3.4',
  BUILD: '324',
  VERSION_ID: '3.4.0',
  ROOT_ELEMENT: 'MESSAGE',
  NAMESPACE: 'http://www.mismo.org/residential/2009/schemas',
  XSI_NAMESPACE: 'http://www.w3.org/2001/XMLSchema-instance',
  SCHEMA_LOCATION: 'http://www.mismo.org/residential/2009/schemas MISMO_3.4.0_B324.xsd',
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
  LG_NAMESPACE: 'urn:loangenius:mismo:extension:1.0',
  LG_PREFIX: 'LG',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id: provided_org_id, profile = 'MISMO_34_BP_APP', best_effort = false } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get org_id
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

    // Fetch all canonical data
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id, org_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Fetch related data
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id, org_id });
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id, org_id });
    const fees = await base44.asServiceRole.entities.DealFee.filter({ deal_id, org_id });

    // Fetch full borrower details with related data
    const borrowersData = [];
    for (const db of dealBorrowers) {
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id, org_id });
      if (borrowers.length > 0) {
        const borrower = borrowers[0];
        
        // Fetch assets
        const assets = await base44.asServiceRole.entities.BorrowerAsset.filter({ borrower_id: db.borrower_id, deal_id, org_id });
        
        // Fetch REO
        const reoProperties = await base44.asServiceRole.entities.REOProperty.filter({ borrower_id: db.borrower_id, deal_id, org_id });
        
        // Fetch declarations
        const declarations = await base44.asServiceRole.entities.BorrowerDeclaration.filter({ borrower_id: db.borrower_id, deal_id, org_id });
        
        // Fetch demographics
        const demographics = await base44.asServiceRole.entities.BorrowerDemographic.filter({ borrower_id: db.borrower_id, deal_id, org_id });

        borrowersData.push({
          ...borrower,
          role: db.role,
          ownership_percent: db.ownership_percent,
          assets,
          reoProperties,
          declarations: declarations[0] || {},
          demographics: demographics[0] || {},
        });
      }
    }

    // Fetch property details
    const propertiesData = [];
    for (const dp of dealProperties) {
      const properties = await base44.asServiceRole.entities.Property.filter({ id: dp.property_id, org_id });
      if (properties.length > 0) {
        propertiesData.push({ ...properties[0], is_subject: dp.is_subject });
      }
    }

    // Fetch signatures
    const signatures = await base44.asServiceRole.entities.ApplicationSignature.filter({ deal_id, org_id });

    // Validate required fields
    const validationErrors = [];
    const validationWarnings = [];

    if (!deal.loan_amount) validationErrors.push({ field: 'loan_amount', message: 'Loan amount required' });
    if (!deal.loan_purpose) validationErrors.push({ field: 'loan_purpose', message: 'Loan purpose required' });
    if (!borrowersData.length) validationErrors.push({ field: 'borrowers', message: 'At least one borrower required' });
    if (!propertiesData.length) validationErrors.push({ field: 'properties', message: 'At least one property required' });

    // DSCR-specific validations
    if (['DSCR', 'DSCR - No Ratio', 'DSCR Blanket'].includes(deal.loan_product)) {
      if (deal.dscr && deal.dscr < 1.0) {
        validationWarnings.push({ field: 'dscr', message: 'DSCR below 1.0 may require manual underwriting' });
      }
    }

    if (deal.ltv > 80) {
      validationWarnings.push({ field: 'ltv', message: 'LTV above 80%; reserve requirements may apply' });
    }

    // Check if XSD validation should fail
    if (validationErrors.length > 0 && !best_effort) {
      return Response.json({
        success: false,
        conformance_status: 'fail',
        validation_errors: validationErrors,
        validation_warnings: validationWarnings,
      });
    }

    // Build MISMO XML
    const xml = buildMISMO34XML(deal, borrowersData, propertiesData, fees, signatures);

    // Generate conformance report
    const conformanceStatus = validationErrors.length > 0 ? 'fail' : 
                              validationWarnings.length > 0 ? 'warn' : 'pass';

    const filename = `MISMO34_${deal.deal_number || deal_id}_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;

    // Log export run
    await base44.asServiceRole.entities.ExportJob.create({
      org_id,
      deal_id,
      export_type: 'mismo_34',
      status: 'completed',
      conformance_status: conformanceStatus,
      validation_errors: validationErrors,
      exported_by: user.email,
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      filename,
      xml_content: xml,
      conformance_status: conformanceStatus,
      validation_errors: validationErrors,
      validation_warnings: validationWarnings,
      byte_size: new TextEncoder().encode(xml).length,
      profile,
    });
  } catch (error) {
    console.error('Error generating MISMO 3.4:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildMISMO34XML(deal, borrowers, properties, fees, signatures) {
  const xmlDate = new Date().toISOString();
  const messageId = `MSG-${deal.id || 'NEW'}-${Date.now()}`;
  const escapeXml = (str) => (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Map loan purpose to MISMO enum
  const mapLoanPurpose = (purpose) => {
    const mapping = {
      'Purchase': 'Purchase',
      'Rate & Term': 'NoCashOutRefinance',
      'Cash-Out': 'CashOutRefinance',
      'Delayed Financing': 'CashOutRefinance',
      'Refinance': 'NoCashOutRefinance',
      'Cash-Out Refinance': 'CashOutRefinance',
    };
    return mapping[purpose] || 'Other';
  };

  // Map property type to MISMO
  const mapPropertyType = (type) => {
    const mapping = {
      'SFR': 'Detached',
      'PUD Detached': 'Detached',
      'PUD Attached': 'Attached',
      'Condo': 'Condominium',
      'Condo (Non-Warrantable)': 'Condominium',
      '2-4 Units': 'TwoToFourUnitProperty',
      '5+ Units': 'Multifamily',
      'Mixed Use (51% Residential)': 'MixedUse',
    };
    return mapping[type] || 'Other';
  };

  // Map citizenship to MISMO
  const mapCitizenship = (status) => {
    const mapping = {
      'US_Citizen': 'USCitizen',
      'Permanent_Resident': 'PermanentResidentAlien',
      'NPRA_Work_Visa': 'NonPermanentResidentAlien',
      'NPRA_ITIN': 'NonPermanentResidentAlien',
      'Foreign_National': 'NonPermanentResidentAlien',
    };
    return mapping[status] || 'Unknown';
  };

  // Use centralized MISMO version config for Build 324 compliance
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<${MISMO_CONFIG.ROOT_ELEMENT} xmlns="${MISMO_CONFIG.NAMESPACE}"
         xmlns:xsi="${MISMO_CONFIG.XSI_NAMESPACE}"
         xmlns:${MISMO_CONFIG.LG_PREFIX}="${MISMO_CONFIG.LG_NAMESPACE}"
         xsi:schemaLocation="${MISMO_CONFIG.SCHEMA_LOCATION}"
         MISMOVersionID="${MISMO_CONFIG.VERSION_ID}">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${xmlDate}</CreatedDatetime>
      <DataVersionIdentifier>1.0</DataVersionIdentifier>
      <DataVersionName>LoanGenius MISMO ${MISMO_CONFIG.VERSION} Build ${MISMO_CONFIG.BUILD} Export</DataVersionName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <MESSAGE_HEADER>
    <MessageIdentifier>${messageId}</MessageIdentifier>
    <MessageDatetime>${xmlDate}</MessageDatetime>
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
                <LoanPurposeType>${mapLoanPurpose(deal.loan_purpose)}</LoanPurposeType>
                <BaseLoanAmount>${deal.loan_amount || 0}</BaseLoanAmount>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
                <LoanTermMonths>${deal.loan_term_months || 360}</LoanTermMonths>
                <ApplicationReceivedDate>${deal.application_date || xmlDate.split('T')[0]}</ApplicationReceivedDate>
              </LOAN_DETAIL>
              <AMORTIZATION>
                <AMORTIZATION_RULE>
                  <AmortizationType>${deal.amortization_type === 'arm' ? 'AdjustableRate' : deal.amortization_type === 'io' ? 'InterestOnly' : 'Fixed'}</AmortizationType>
                  ${deal.is_interest_only ? `<InterestOnlyTermMonths>${deal.interest_only_period_months || 0}</InterestOnlyTermMonths>` : ''}
                </AMORTIZATION_RULE>
              </AMORTIZATION>
              ${deal.is_arm ? `
              <ARM>
                <ARM_DETAIL>
                  <ARMIndexType>${escapeXml(deal.arm_index || 'SOFR')}</ARMIndexType>
                  <ARMMarginPercent>${deal.arm_margin || 0}</ARMMarginPercent>
                </ARM_DETAIL>
              </ARM>` : ''}
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${escapeXml(deal.deal_number || deal.id)}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <QUALIFICATION>
                <QUALIFICATION_DETAIL>
                  <LoanToValueRatioPercent>${deal.ltv || 0}</LoanToValueRatioPercent>
                </QUALIFICATION_DETAIL>
              </QUALIFICATION>
              <!-- Business Purpose Extension -->
              <EXTENSION>
                <${EXTENSION_NAMESPACE}:BUSINESS_PURPOSE_LOAN>
                  <${EXTENSION_NAMESPACE}:LoanProductType>${escapeXml(deal.loan_product)}</${EXTENSION_NAMESPACE}:LoanProductType>
                  <${EXTENSION_NAMESPACE}:BusinessPurposeIndicator>true</${EXTENSION_NAMESPACE}:BusinessPurposeIndicator>
                  <${EXTENSION_NAMESPACE}:DSCRRatio>${deal.dscr || 0}</${EXTENSION_NAMESPACE}:DSCRRatio>
                  ${deal.is_bridge ? `<${EXTENSION_NAMESPACE}:BridgeLoanIndicator>true</${EXTENSION_NAMESPACE}:BridgeLoanIndicator>
                  <${EXTENSION_NAMESPACE}:BridgeExitStrategy>${escapeXml(deal.bridge_exit_strategy)}</${EXTENSION_NAMESPACE}:BridgeExitStrategy>` : ''}
                  <${EXTENSION_NAMESPACE}:VestingType>${escapeXml(deal.vesting_type)}</${EXTENSION_NAMESPACE}:VestingType>
                  ${deal.entity_type ? `<${EXTENSION_NAMESPACE}:EntityType>${escapeXml(deal.entity_type)}</${EXTENSION_NAMESPACE}:EntityType>` : ''}
                </${EXTENSION_NAMESPACE}:BUSINESS_PURPOSE_LOAN>
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
                  ${prop.address_unit ? `<AddressUnitIdentifier>${escapeXml(prop.address_unit)}</AddressUnitIdentifier>` : ''}
                  <CityName>${escapeXml(prop.address_city)}</CityName>
                  <StateCode>${escapeXml(prop.address_state)}</StateCode>
                  <PostalCode>${escapeXml(prop.address_zip)}</PostalCode>
                  ${prop.county ? `<CountyName>${escapeXml(prop.county)}</CountyName>` : ''}
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyStructureBuiltYear>${prop.year_built || ''}</PropertyStructureBuiltYear>
                  <FinancedUnitCount>${prop.number_of_units || 1}</FinancedUnitCount>
                  <PropertyEstimatedValueAmount>${prop.estimated_value || deal.appraised_value || 0}</PropertyEstimatedValueAmount>
                  <PropertyCurrentUsageType>${deal.occupancy_type || 'Investment'}</PropertyCurrentUsageType>
                  <AttachmentType>${mapPropertyType(prop.property_type)}</AttachmentType>
                  ${prop.sqft ? `<GrossLivingAreaSquareFeetCount>${prop.sqft}</GrossLivingAreaSquareFeetCount>` : ''}
                  ${prop.beds ? `<BedroomCount>${prop.beds}</BedroomCount>` : ''}
                  ${prop.baths ? `<BathroomCount>${prop.baths}</BathroomCount>` : ''}
                  ${prop.apn ? `<AssessorParcelIdentifier>${escapeXml(prop.apn)}</AssessorParcelIdentifier>` : ''}
                  ${prop.location_type ? `<PropertyLocationTypeDescription>${escapeXml(prop.location_type)}</PropertyLocationTypeDescription>` : ''}
                </PROPERTY_DETAIL>
                ${prop.legal_description ? `<LEGAL_DESCRIPTION><LegalDescription>${escapeXml(prop.legal_description)}</LegalDescription></LEGAL_DESCRIPTION>` : ''}
                <!-- Property Income Extension -->
                <EXTENSION>
                  <${EXTENSION_NAMESPACE}:RENTAL_INCOME>
                    <${EXTENSION_NAMESPACE}:GrossRentMonthly>${prop.gross_rent_monthly || 0}</${EXTENSION_NAMESPACE}:GrossRentMonthly>
                    <${EXTENSION_NAMESPACE}:TaxesMonthly>${prop.taxes_monthly || 0}</${EXTENSION_NAMESPACE}:TaxesMonthly>
                    <${EXTENSION_NAMESPACE}:InsuranceMonthly>${prop.insurance_monthly || 0}</${EXTENSION_NAMESPACE}:InsuranceMonthly>
                    <${EXTENSION_NAMESPACE}:HOAMonthly>${prop.hoa_monthly || 0}</${EXTENSION_NAMESPACE}:HOAMonthly>
                  </${EXTENSION_NAMESPACE}:RENTAL_INCOME>
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
                  <FirstName>${escapeXml(b.first_name)}</FirstName>
                  ${b.middle_name ? `<MiddleName>${escapeXml(b.middle_name)}</MiddleName>` : ''}
                  <LastName>${escapeXml(b.last_name)}</LastName>
                  ${b.suffix ? `<SuffixName>${escapeXml(b.suffix)}</SuffixName>` : ''}
                </NAME>
              </INDIVIDUAL>
              <ROLES>
                <ROLE>
                  <BORROWER>
                    <BorrowerClassificationType>${b.role === 'primary' ? 'Primary' : b.role === 'co_borrower' ? 'CoBorrower' : 'Other'}</BorrowerClassificationType>
                    ${b.credit_score_est ? `<CreditScoreValue>${b.credit_score_est}</CreditScoreValue>` : ''}
                    ${b.citizenship_status ? `<CitizenshipResidencyType>${mapCitizenship(b.citizenship_status)}</CitizenshipResidencyType>` : ''}
                    ${b.marital_status ? `<MaritalStatusType>${escapeXml(b.marital_status)}</MaritalStatusType>` : ''}
                    ${b.dependents_count ? `<DependentCount>${b.dependents_count}</DependentCount>` : ''}
                  </BORROWER>
                  <ROLE_DETAIL>
                    <PartyRoleType>Borrower</PartyRoleType>
                  </ROLE_DETAIL>
                </ROLE>
              </ROLES>
              <TAXPAYER_IDENTIFIERS>
                <TAXPAYER_IDENTIFIER>
                  ${b.ssn_last4 ? `<TaxpayerIdentifierValue>XXX-XX-${b.ssn_last4}</TaxpayerIdentifierValue>` : ''}
                  <TaxpayerIdentifierType>${b.taxpayer_id_type === 'ITIN' ? 'IndividualTaxpayerIdentificationNumber' : 'SocialSecurityNumber'}</TaxpayerIdentifierType>
                </TAXPAYER_IDENTIFIER>
              </TAXPAYER_IDENTIFIERS>
              <ADDRESSES>
                ${b.current_address_street ? `
                <ADDRESS>
                  <AddressLineText>${escapeXml(b.current_address_street)}</AddressLineText>
                  <CityName>${escapeXml(b.current_address_city)}</CityName>
                  <StateCode>${escapeXml(b.current_address_state)}</StateCode>
                  <PostalCode>${escapeXml(b.current_address_zip)}</PostalCode>
                  <AddressType>Current</AddressType>
                </ADDRESS>` : ''}
                ${!b.mailing_same_as_current && b.mailing_address_street ? `
                <ADDRESS>
                  <AddressLineText>${escapeXml(b.mailing_address_street)}</AddressLineText>
                  <CityName>${escapeXml(b.mailing_address_city)}</CityName>
                  <StateCode>${escapeXml(b.mailing_address_state)}</StateCode>
                  <PostalCode>${escapeXml(b.mailing_address_zip)}</PostalCode>
                  <AddressType>Mailing</AddressType>
                </ADDRESS>` : ''}
              </ADDRESSES>
              <CONTACTS>
                ${b.email ? `
                <CONTACT>
                  <ContactPointValue>${escapeXml(b.email)}</ContactPointValue>
                  <ContactPointType>Email</ContactPointType>
                </CONTACT>` : ''}
                ${b.home_phone ? `
                <CONTACT>
                  <ContactPointValue>${escapeXml(b.home_phone)}</ContactPointValue>
                  <ContactPointType>Phone</ContactPointType>
                </CONTACT>` : ''}
              </CONTACTS>`;

    // Assets
    if (b.assets && b.assets.length > 0) {
      xml += `
              <ASSETS>`;
      b.assets.forEach((asset, aidx) => {
        xml += `
                <ASSET SequenceNumber="${aidx + 1}">
                  <ASSET_DETAIL>
                    <AssetAccountIdentifier>****${escapeXml(asset.account_last4)}</AssetAccountIdentifier>
                    <AssetType>${asset.account_type === 'Checking' ? 'CheckingAccount' : 
                               asset.account_type === 'Savings' ? 'SavingsAccount' : 
                               asset.account_type === 'Money Market' ? 'MoneyMarketFund' :
                               asset.account_type === 'Retirement' ? 'RetirementFund' : 'Other'}</AssetType>
                    <AssetCashOrMarketValueAmount>${asset.account_balance || 0}</AssetCashOrMarketValueAmount>
                  </ASSET_DETAIL>
                  <ASSET_HOLDER>
                    <NAME>
                      <FullName>${escapeXml(asset.bank_name)}</FullName>
                    </NAME>
                  </ASSET_HOLDER>
                </ASSET>`;
      });
      xml += `
              </ASSETS>`;
    }

    // Declarations
    if (b.declarations) {
      xml += `
              <DECLARATION>
                <DECLARATION_DETAIL>
                  ${b.declarations.outstanding_judgments !== null ? `<OutstandingJudgmentsIndicator>${b.declarations.outstanding_judgments}</OutstandingJudgmentsIndicator>` : ''}
                  ${b.declarations.bankruptcy_4yr !== null ? `<BankruptcyIndicator>${b.declarations.bankruptcy_4yr}</BankruptcyIndicator>` : ''}
                  ${b.declarations.foreclosed_4yr !== null ? `<PropertyForeclosedPastSevenYearsIndicator>${b.declarations.foreclosed_4yr}</PropertyForeclosedPastSevenYearsIndicator>` : ''}
                  ${b.declarations.party_to_lawsuit !== null ? `<PartyToLawsuitIndicator>${b.declarations.party_to_lawsuit}</PartyToLawsuitIndicator>` : ''}
                </DECLARATION_DETAIL>
              </DECLARATION>`;
    }

    xml += `
            </PARTY>`;
  });

  // Fees
  if (fees && fees.length > 0) {
    xml += `
          </PARTIES>
          <SERVICES>`;
    fees.forEach((fee, fidx) => {
      xml += `
            <SERVICE SequenceNumber="${fidx + 1}">
              <FEE_INFORMATION>
                <FeeActualTotalAmount>${fee.calculated_amount || fee.amount || 0}</FeeActualTotalAmount>
                <FeePaidByType>${fee.is_borrower_paid ? 'Borrower' : 'Lender'}</FeePaidByType>
                <FeeType>${escapeXml(fee.fee_name || fee.trid_category)}</FeeType>
                ${fee.trid_category ? `<IntegratedDisclosureSectionType>${escapeXml(fee.trid_category)}</IntegratedDisclosureSectionType>` : ''}
              </FEE_INFORMATION>
            </SERVICE>`;
    });
    xml += `
          </SERVICES>`;
  } else {
    xml += `
          </PARTIES>`;
  }

  xml += `
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</${MISMO_CONFIG.ROOT_ELEMENT}>`;

  return xml;
}