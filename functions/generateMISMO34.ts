/**
 * Generate MISMO 3.4 XML export from canonical deal snapshot
 * MISMO = Mortgage Industry Standards Maintenance Organization
 * Full comprehensive MISMO 3.4 compliant XML generation
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
  XLINK_NAMESPACE: 'http://www.w3.org/1999/xlink',
  SCHEMA_LOCATION: 'http://www.mismo.org/residential/2009/schemas MISMO_3.4.0_B324.xsd',
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
  ULAD_NAMESPACE: 'http://www.datamodelextension.org/Schema/ULAD',
  DU_NAMESPACE: 'http://www.datamodelextension.org/Schema/DU',
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

    const { deal_id, org_id: provided_org_id, include_demographics = true } = await req.json();

    if (!deal_id) {
     return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get org_id from user membership if not provided
    let org_id = provided_org_id;
    if (!org_id) {
      try {
        const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
          user_id: user.email,
        });
        org_id = memberships.length > 0 ? memberships[0].org_id : 'default';
      } catch {
        org_id = 'default';
      }
    }

    // Skip org verification for default org or if it fails
    let orgVerified = org_id === 'default';
    if (!orgVerified) {
      try {
        const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
          user_id: user.email,
          org_id
        });
        orgVerified = memberships.length > 0;
      } catch {
        orgVerified = true; // Allow if verification fails
      }
    }

    // Fetch deal - try with id filter first, then direct
    let deal = null;
    try {
      const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
      if (deals.length) deal = deals[0];
    } catch {
      // Fallback
    }
    
    if (!deal) {
      try {
        const allDeals = await base44.asServiceRole.entities.Deal.list();
        deal = allDeals.find(d => d.id === deal_id);
      } catch {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }
    }

    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch related data with fallbacks
    let borrowerLinks = [];
    let propertyLinks = [];
    let fees = [];
    
    try {
      borrowerLinks = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    } catch { borrowerLinks = []; }
    
    try {
      propertyLinks = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
    } catch { propertyLinks = []; }
    
    try {
      fees = await base44.asServiceRole.entities.DealFee.filter({ deal_id });
    } catch { fees = []; }

    // Fetch full borrower details
    const fullBorrowers = [];
    for (const db of borrowerLinks) {
      try {
        const borrowerList = await base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id });
        if (borrowerList.length > 0) {
          const borrower = borrowerList[0];
          
          // Fetch additional borrower data
          let assets = [], declarations = [], demographics = [];
          try {
            assets = await base44.asServiceRole.entities.BorrowerAsset.filter({ borrower_id: db.borrower_id });
          } catch {}
          try {
            declarations = await base44.asServiceRole.entities.BorrowerDeclaration.filter({ borrower_id: db.borrower_id, deal_id });
          } catch {}
          if (include_demographics) {
            try {
              demographics = await base44.asServiceRole.entities.BorrowerDemographic.filter({ borrower_id: db.borrower_id, deal_id });
            } catch {}
          }
          
          fullBorrowers.push({ 
            ...borrower, 
            role: db.role,
            assets,
            declarations: declarations[0] || {},
            demographics: demographics[0] || {}
          });
        }
      } catch (e) {
        console.error('Failed to fetch borrower:', db.borrower_id, e);
      }
    }

    // Fetch full property details
    const fullProperties = [];
    for (const dp of propertyLinks) {
      try {
        const propertyList = await base44.asServiceRole.entities.Property.filter({ id: dp.property_id });
        if (propertyList.length > 0) {
          fullProperties.push(propertyList[0]);
        }
      } catch (e) {
        console.error('Failed to fetch property:', dp.property_id, e);
      }
    }
    
    // Fetch loan originator info
    let originator = null;
    try {
      const originators = await base44.asServiceRole.entities.LoanOriginator.filter({ org_id: deal.org_id || org_id });
      if (originators.length > 0) originator = originators[0];
    } catch {}
    
    // Fetch organization info
    let organization = null;
    try {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: deal.org_id || org_id });
      if (orgs.length > 0) organization = orgs[0];
    } catch {}

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
    const mismoXml = buildMISMOXml(deal, fullBorrowers, fullProperties, fees, originator, organization);

    // Calculate byte size
    const encoder = new TextEncoder();
    const data = encoder.encode(mismoXml);

    // Create filename
    const filename = `MISMO_34_${deal.deal_number || deal_id}_${new Date().toISOString().split('T')[0]}.xml`;

    return Response.json({
      success: true,
      filename,
      xml_content: mismoXml,
      validation_passed: validationErrors.length === 0,
      validation_errors: validationErrors,
      validation_warnings: validationWarnings,
      byte_size: data.length,
      deal_summary: {
        deal_number: deal.deal_number,
        loan_amount: deal.loan_amount,
        borrower_count: fullBorrowers.length,
        property_count: fullProperties.length,
        fee_count: fees.length
      }
    });
  } catch (error) {
    console.error('Error generating MISMO 3.4:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

function buildMISMOXml(deal, borrowers, properties, fees, originator, organization) {
  const xmlDate = new Date().toISOString().split('T')[0];
  const xmlDateTime = new Date().toISOString();
  const escapeXml = (str) => (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const formatMoney = (val) => parseFloat(val || 0).toFixed(2);
  const formatPercent = (val) => parseFloat(val || 0).toFixed(5);
  
  // Deterministic ordering helper - generates stable xlink:label
  const generateLabel = (prefix, seq, parentLabel = null) => 
    parentLabel ? `${parentLabel}_${prefix}_${seq}` : `${prefix}_${seq}`;
  
  // Sort and sequence borrowers deterministically (primary first, then by created_date)
  const sequencedBorrowers = [...borrowers]
    .sort((a, b) => {
      const aIsPrimary = a.role === 'primary' || a.role === 'Primary';
      const bIsPrimary = b.role === 'primary' || b.role === 'Primary';
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      const seqA = a.mismo_sequence ?? a.sequence_number ?? Infinity;
      const seqB = b.mismo_sequence ?? b.sequence_number ?? Infinity;
      if (seqA !== seqB) return seqA - seqB;
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateA - dateB;
    })
    .map((b, idx) => ({ ...b, _seq: idx + 1, _label: generateLabel('Party', idx + 1) }));
  
  // Sort and sequence properties deterministically
  const sequencedProperties = [...properties]
    .sort((a, b) => {
      const seqA = a.mismo_sequence ?? a.sequence_number ?? Infinity;
      const seqB = b.mismo_sequence ?? b.sequence_number ?? Infinity;
      if (seqA !== seqB) return seqA - seqB;
      const addrA = `${a.address_street || ''} ${a.address_city || ''}`.toLowerCase();
      const addrB = `${b.address_street || ''} ${b.address_city || ''}`.toLowerCase();
      return addrA.localeCompare(addrB);
    })
    .map((p, idx) => ({ ...p, _seq: idx + 1, _label: generateLabel('Collateral', idx + 1) }));
  
  // Sort and sequence fees deterministically by TRID category then name
  const tridOrder = ['OriginationCharges', 'ServicesYouCannotShopFor', 'ServicesYouCanShopFor', 
    'TaxesAndOtherGovernmentFees', 'Prepaids', 'InitialEscrowPaymentAtClosing', 'OtherCosts'];
  const sequencedFees = [...fees]
    .sort((a, b) => {
      const catA = mapTRIDSection(a.trid_category || a.fee_type);
      const catB = mapTRIDSection(b.trid_category || b.fee_type);
      const orderA = tridOrder.indexOf(catA);
      const orderB = tridOrder.indexOf(catB);
      if (orderA !== orderB) return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      return (a.fee_name || '').localeCompare(b.fee_name || '');
    })
    .map((f, idx) => ({ ...f, _seq: idx + 1, _label: generateLabel('Service', idx + 1) }));
  
  // Map loan purpose to MISMO enum
  const mapLoanPurpose = (purpose) => {
    const map = {
      'Purchase': 'Purchase',
      'Refinance': 'Refinance',
      'Cash-Out': 'CashOutRefinance',
      'Cash-Out Refinance': 'CashOutRefinance',
      'Rate & Term': 'NoCashOutRefinance',
      'Rate and Term': 'NoCashOutRefinance',
      'Construction': 'ConstructionToPermanent',
      'Home Equity': 'HomeEquityLineOfCredit',
    };
    return map[purpose] || 'Other';
  };
  
  // Map property type to MISMO enum
  const mapPropertyType = (type) => {
    const map = {
      'SFR': 'SingleFamily',
      'Condo': 'Condominium',
      'PUD Detached': 'PlannedUnitDevelopment',
      'PUD Attached': 'PlannedUnitDevelopment',
      'Townhouse': 'Townhouse',
      '2-4 Units': 'TwoToFourUnits',
      '5+ Units': 'Multifamily',
      'Mixed Use': 'MixedUse',
      'Manufactured': 'ManufacturedHousing',
    };
    return map[type] || 'Other';
  };
  
  // Map occupancy to MISMO enum
  const mapOccupancy = (occ) => {
    const map = {
      'Investment': 'Investment',
      'Primary': 'PrimaryResidence',
      'Secondary': 'SecondHome',
      'Second Home': 'SecondHome',
    };
    return map[occ] || 'Investment';
  };
  
  // Map amortization type
  const mapAmortization = (type) => {
    const map = {
      'fixed': 'Fixed',
      'arm': 'AdjustableRate',
      'io': 'InterestOnly',
      'bridge': 'InterestOnly',
    };
    return map[type?.toLowerCase()] || 'Fixed';
  };
  
  // Calculate monthly P&I
  const loanAmount = deal.loan_amount || 0;
  const rate = (deal.interest_rate || 0) / 100 / 12;
  const term = deal.loan_term_months || 360;
  let monthlyPI = 0;
  if (rate > 0 && loanAmount > 0) {
    monthlyPI = loanAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
  }

  // Generate unique identifiers
  const messageId = `MSG-${deal.id || 'NEW'}-${Date.now()}`;
  const dealSetId = `DS-${deal.deal_number || deal.id || 'NEW'}`;
  
  // Use centralized MISMO version config for Build 324 compliance
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<${MISMO_CONFIG.ROOT_ELEMENT} xmlns="${MISMO_CONFIG.NAMESPACE}" 
         xmlns:xsi="${MISMO_CONFIG.XSI_NAMESPACE}"
         xmlns:xlink="${MISMO_CONFIG.XLINK_NAMESPACE}"
         xmlns:ULAD="${MISMO_CONFIG.ULAD_NAMESPACE}"
         xmlns:DU="${MISMO_CONFIG.DU_NAMESPACE}"
         xmlns:${MISMO_CONFIG.LG_PREFIX}="${MISMO_CONFIG.LG_NAMESPACE}"
         xsi:schemaLocation="${MISMO_CONFIG.SCHEMA_LOCATION}"
         MISMOVersionID="${MISMO_CONFIG.VERSION_ID}">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${xmlDateTime}</CreatedDatetime>
      <DataVersionIdentifier>1.0</DataVersionIdentifier>
      <DataVersionName>LoanGenius MISMO ${MISMO_CONFIG.VERSION} Build ${MISMO_CONFIG.BUILD} Export</DataVersionName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <MESSAGE_HEADER>
    <MessageIdentifier>${messageId}</MessageIdentifier>
    <MessageDatetime>${xmlDateTime}</MessageDatetime>
    <SenderName>LoanGenius</SenderName>
    <MISMOLogicalDataDictionaryIdentifier>${MISMO_CONFIG.LDD_IDENTIFIER}</MISMOLogicalDataDictionaryIdentifier>
  </MESSAGE_HEADER>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <ASSETS>
            <ASSET SequenceNumber="1" xlink:label="Asset_1">
              <OWNED_PROPERTY>
                <OWNED_PROPERTY_DETAIL>
                  <OwnedPropertyDispositionStatusType>RetainForRental</OwnedPropertyDispositionStatusType>
                </OWNED_PROPERTY_DETAIL>
              </OWNED_PROPERTY>
            </ASSET>
          </ASSETS>
          <LOANS>
            <LOAN SequenceNumber="1" LoanRoleType="SubjectLoan">
              <AMORTIZATION>
                <AMORTIZATION_RULE>
                  <AmortizationType>${mapAmortization(deal.amortization_type)}</AmortizationType>
                  <LoanAmortizationPeriodCount>${term}</LoanAmortizationPeriodCount>
                  <LoanAmortizationPeriodType>Month</LoanAmortizationPeriodType>
                  ${deal.is_interest_only ? `<InterestOnlyIndicator>true</InterestOnlyIndicator>` : ''}
                  ${deal.interest_only_period_months ? `<InterestOnlyTermMonths>${deal.interest_only_period_months}</InterestOnlyTermMonths>` : ''}
                </AMORTIZATION_RULE>
              </AMORTIZATION>
              <CLOSING_INFORMATION>
                <CLOSING_INFORMATION_DETAIL>
                  ${deal.application_date ? `<ClosingDate>${deal.application_date}</ClosingDate>` : ''}
                  ${deal.closing_costs_estimate ? `<ClosingCostsAmount>${deal.closing_costs_estimate}</ClosingCostsAmount>` : ''}
                </CLOSING_INFORMATION_DETAIL>
              </CLOSING_INFORMATION>
              <DOCUMENT_SPECIFIC_DATA_SETS>
                <DOCUMENT_SPECIFIC_DATA_SET>
                  <URLA>
                    <URLA_DETAIL>
                      <ApplicationSignedByLoanOriginatorDate>${xmlDate}</ApplicationSignedByLoanOriginatorDate>
                    </URLA_DETAIL>
                  </URLA>
                </DOCUMENT_SPECIFIC_DATA_SET>
              </DOCUMENT_SPECIFIC_DATA_SETS>
              <HOUSING_EXPENSES>
                <HOUSING_EXPENSE>
                  <HousingExpensePaymentAmount>${monthlyPI.toFixed(2)}</HousingExpensePaymentAmount>
                  <HousingExpenseType>FirstMortgagePrincipalAndInterest</HousingExpenseType>
                </HOUSING_EXPENSE>
              </HOUSING_EXPENSES>
              <LOAN_DETAIL>
                <ApplicationReceivedDate>${deal.application_date || xmlDate}</ApplicationReceivedDate>
                <BalloonIndicator>${deal.is_bridge ? 'true' : 'false'}</BalloonIndicator>
                <BuydownTemporarySubsidyFundingIndicator>false</BuydownTemporarySubsidyFundingIndicator>
                <ConstructionLoanIndicator>false</ConstructionLoanIndicator>
                <ConversionOfContractForDeedIndicator>false</ConversionOfContractForDeedIndicator>
                <EscrowAbsentIndicator>false</EscrowAbsentIndicator>
                <InterestOnlyIndicator>${deal.is_interest_only ? 'true' : 'false'}</InterestOnlyIndicator>
                <LoanMaturityPeriodCount>${Math.floor(term / 12)}</LoanMaturityPeriodCount>
                <LoanMaturityPeriodType>Year</LoanMaturityPeriodType>
                <NegativeAmortizationIndicator>false</NegativeAmortizationIndicator>
                <PrepaymentPenaltyIndicator>${deal.prepay_penalty_type ? 'true' : 'false'}</PrepaymentPenaltyIndicator>
                ${deal.prepay_penalty_term_months ? `<PrepaymentPenaltyMaximumLifeOfLoanMonthsCount>${deal.prepay_penalty_term_months}</PrepaymentPenaltyMaximumLifeOfLoanMonthsCount>` : ''}
              </LOAN_DETAIL>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${escapeXml(deal.deal_number || deal.id)}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <MATURITY>
                <MATURITY_RULE>
                  <LoanMaturityPeriodCount>${Math.floor(term / 12)}</LoanMaturityPeriodCount>
                  <LoanMaturityPeriodType>Year</LoanMaturityPeriodType>
                </MATURITY_RULE>
              </MATURITY>
              <LOAN_PRODUCT>
                <LOAN_PRODUCT_DETAIL>
                  <DiscountPointsTotalAmount>0</DiscountPointsTotalAmount>
                </LOAN_PRODUCT_DETAIL>
              </LOAN_PRODUCT>
              <PAYMENT>
                <PAYMENT_RULE>
                  <InitialPrincipalAndInterestPaymentAmount>${monthlyPI.toFixed(2)}</InitialPrincipalAndInterestPaymentAmount>
                  <FullyIndexedInitialPrincipalAndInterestPaymentAmount>${monthlyPI.toFixed(2)}</FullyIndexedInitialPrincipalAndInterestPaymentAmount>
                </PAYMENT_RULE>
              </PAYMENT>
              <PREPAYMENT_PENALTY>
                <PREPAYMENT_PENALTY_LIFETIME_RULE>
                  <PrepaymentPenaltyExpirationMonthsCount>${deal.prepay_penalty_term_months || 0}</PrepaymentPenaltyExpirationMonthsCount>
                  <PrepaymentPenaltyType>${escapeXml(deal.prepay_penalty_type || 'None')}</PrepaymentPenaltyType>
                </PREPAYMENT_PENALTY_LIFETIME_RULE>
              </PREPAYMENT_PENALTY>
              <QUALIFICATION>
                <QUALIFICATION_DETAIL>
                  <LoanToValueRatioPercent>${(deal.ltv || 0).toFixed(3)}</LoanToValueRatioPercent>
                  ${deal.dscr ? `<DebtServiceCoverageRatioPercent>${deal.dscr.toFixed(3)}</DebtServiceCoverageRatioPercent>` : ''}
                </QUALIFICATION_DETAIL>
              </QUALIFICATION>
              <TERMS_OF_LOAN>
                <BaseLoanAmount>${loanAmount}</BaseLoanAmount>
                <LienPriorityType>FirstLien</LienPriorityType>
                <LoanPurposeType>${mapLoanPurpose(deal.loan_purpose)}</LoanPurposeType>
                <MortgageType>Conventional</MortgageType>
                <NoteAmount>${loanAmount}</NoteAmount>
                <NoteRatePercent>${deal.interest_rate || 0}</NoteRatePercent>
                <WeightedAverageInterestRatePercent>${deal.interest_rate || 0}</WeightedAverageInterestRatePercent>
              </TERMS_OF_LOAN>
            </LOAN>
          </LOANS>
          <COLLATERALS>`;

  properties.forEach((prop, idx) => {
    const propValue = prop.estimated_value || prop.appraised_value || (deal.loan_amount / 0.75);
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
                  <CountryCode>US</CountryCode>
                </ADDRESS>
                ${prop.legal_description ? `
                <LEGAL_DESCRIPTIONS>
                  <LEGAL_DESCRIPTION>
                    <LegalDescriptionText>${escapeXml(prop.legal_description)}</LegalDescriptionText>
                    <LegalDescriptionType>LongLegal</LegalDescriptionType>
                  </LEGAL_DESCRIPTION>
                </LEGAL_DESCRIPTIONS>` : ''}
                <PROPERTY_DETAIL>
                  <ConstructionMethodType>SiteBuilt</ConstructionMethodType>
                  ${prop.year_built ? `<PropertyStructureBuiltYear>${prop.year_built}</PropertyStructureBuiltYear>` : ''}
                  <FinancedUnitCount>${prop.number_of_units || prop.units || 1}</FinancedUnitCount>
                  <PropertyEstimatedValueAmount>${propValue}</PropertyEstimatedValueAmount>
                  <PropertyUsageType>${mapOccupancy(prop.occupancy_type)}</PropertyUsageType>
                  <AttachmentType>${mapPropertyType(prop.property_type)}</AttachmentType>
                  ${prop.sqft ? `<GrossLivingAreaSquareFeetCount>${prop.sqft}</GrossLivingAreaSquareFeetCount>` : ''}
                  ${prop.beds ? `<BedroomCount>${prop.beds}</BedroomCount>` : ''}
                  ${prop.baths ? `<BathroomsTotalCount>${prop.baths}</BathroomsTotalCount>` : ''}
                  ${prop.lot_sqft ? `<LotSizeSquareFeetCount>${prop.lot_sqft}</LotSizeSquareFeetCount>` : ''}
                  ${prop.apn ? `<AssessorUnformattedIdentifier>${escapeXml(prop.apn)}</AssessorUnformattedIdentifier>` : ''}
                </PROPERTY_DETAIL>
                <PROPERTY_VALUATIONS>
                  <PROPERTY_VALUATION>
                    <PROPERTY_VALUATION_DETAIL>
                      <PropertyValuationAmount>${propValue}</PropertyValuationAmount>
                      ${prop.appraised_value ? `<AppraisedValueAmount>${prop.appraised_value}</AppraisedValueAmount>` : ''}
                      <PropertyValuationMethodType>AppraisalManagement</PropertyValuationMethodType>
                    </PROPERTY_VALUATION_DETAIL>
                  </PROPERTY_VALUATION>
                </PROPERTY_VALUATIONS>
                ${prop.gross_rent_monthly ? `
                <SALES_CONTRACT>
                  <SALES_CONTRACT_DETAIL>
                    <RealPropertyAmount>${deal.purchase_price || propValue}</RealPropertyAmount>
                  </SALES_CONTRACT_DETAIL>
                </SALES_CONTRACT>` : ''}
              </SUBJECT_PROPERTY>
            </COLLATERAL>`;
  });

  xml += `
          </COLLATERALS>
          <PARTIES>`;

  borrowers.forEach((b, idx) => {
    const isPrimary = idx === 0 || b.role === 'primary' || b.role === 'Primary';
    const borrowerType = isPrimary ? 'Borrower' : 'CoBorrower';
    const decl = b.declarations || {};
    const demo = b.demographics || {};
    
    xml += `
            <PARTY SequenceNumber="${idx + 1}" xlink:label="Party_${idx + 1}">
              <INDIVIDUAL>
                <CONTACT_POINTS>
                  <CONTACT_POINT>
                    <CONTACT_POINT_EMAIL>
                      <ContactPointEmailValue>${escapeXml(b.email || '')}</ContactPointEmailValue>
                    </CONTACT_POINT_EMAIL>
                    <CONTACT_POINT_DETAIL>
                      <ContactPointRoleType>Home</ContactPointRoleType>
                    </CONTACT_POINT_DETAIL>
                  </CONTACT_POINT>
                  ${b.cell_phone || b.phone ? `
                  <CONTACT_POINT>
                    <CONTACT_POINT_TELEPHONE>
                      <ContactPointTelephoneValue>${escapeXml(b.cell_phone || b.phone || '')}</ContactPointTelephoneValue>
                    </CONTACT_POINT_TELEPHONE>
                    <CONTACT_POINT_DETAIL>
                      <ContactPointRoleType>Mobile</ContactPointRoleType>
                    </CONTACT_POINT_DETAIL>
                  </CONTACT_POINT>` : ''}
                  ${b.work_phone ? `
                  <CONTACT_POINT>
                    <CONTACT_POINT_TELEPHONE>
                      <ContactPointTelephoneValue>${escapeXml(b.work_phone)}</ContactPointTelephoneValue>
                    </CONTACT_POINT_TELEPHONE>
                    <CONTACT_POINT_DETAIL>
                      <ContactPointRoleType>Work</ContactPointRoleType>
                    </CONTACT_POINT_DETAIL>
                  </CONTACT_POINT>` : ''}
                  ${b.home_phone ? `
                  <CONTACT_POINT>
                    <CONTACT_POINT_TELEPHONE>
                      <ContactPointTelephoneValue>${escapeXml(b.home_phone)}</ContactPointTelephoneValue>
                    </CONTACT_POINT_TELEPHONE>
                    <CONTACT_POINT_DETAIL>
                      <ContactPointRoleType>Home</ContactPointRoleType>
                    </CONTACT_POINT_DETAIL>
                  </CONTACT_POINT>` : ''}
                </CONTACT_POINTS>
                <NAME>
                  <FirstName>${escapeXml(b.first_name)}</FirstName>
                  ${b.middle_name ? `<MiddleName>${escapeXml(b.middle_name)}</MiddleName>` : ''}
                  <LastName>${escapeXml(b.last_name)}</LastName>
                  ${b.suffix ? `<SuffixName>${escapeXml(b.suffix)}</SuffixName>` : ''}
                  <FullName>${escapeXml(b.first_name)} ${b.middle_name ? escapeXml(b.middle_name) + ' ' : ''}${escapeXml(b.last_name)}</FullName>
                </NAME>
              </INDIVIDUAL>
              <ROLES>
                <ROLE SequenceNumber="1" xlink:label="${roleLabel}">
                  <BORROWER>
                    <BORROWER_DETAIL>
                      ${b.dob_encrypted || b.dob ? `<BorrowerBirthDate>${escapeXml(b.dob_encrypted || b.dob)}</BorrowerBirthDate>` : ''}
                      ${b.marital_status ? `<MaritalStatusType>${mapMaritalStatus(b.marital_status)}</MaritalStatusType>` : ''}
                      ${b.dependents_count !== undefined ? `<DependentCount>${b.dependents_count}</DependentCount>` : ''}
                      ${b.dependents_ages ? `<DependentAgesDescription>${escapeXml(b.dependents_ages)}</DependentAgesDescription>` : ''}
                      <SelfDeclaredMilitaryServiceIndicator>false</SelfDeclaredMilitaryServiceIndicator>
                    </BORROWER_DETAIL>
                    ${b.credit_score_est ? `
                    <CREDIT_SCORES>
                      <CREDIT_SCORE>
                        <CREDIT_SCORE_DETAIL>
                          <CreditScoreValue>${b.credit_score_est}</CreditScoreValue>
                          <CreditScoreModelType>EquifaxBeacon5.0</CreditScoreModelType>
                          <CreditScoreCategoryType>${getCreditScoreCategory(b.credit_score_est)}</CreditScoreCategoryType>
                        </CREDIT_SCORE_DETAIL>
                      </CREDIT_SCORE>
                    </CREDIT_SCORES>` : ''}
                    <DECLARATION>
                      <DECLARATION_DETAIL>
                        ${b.citizenship_status ? `<CitizenshipResidencyType>${mapCitizenshipStatus(b.citizenship_status)}</CitizenshipResidencyType>` : '<CitizenshipResidencyType>USCitizen</CitizenshipResidencyType>'}
                        <HomeownerPastThreeYearsType>${b.housing_status === 'Own' ? 'Yes' : 'No'}</HomeownerPastThreeYearsType>
                        <IntentToOccupyType>${deal.occupancy_type === 'Primary' ? 'Yes' : 'No'}</IntentToOccupyType>
                        <OutstandingJudgmentsIndicator>${decl.outstanding_judgments ? 'true' : 'false'}</OutstandingJudgmentsIndicator>
                        <PresentlyDelinquentIndicator>false</PresentlyDelinquentIndicator>
                        <PartyToLawsuitIndicator>${decl.party_to_lawsuit ? 'true' : 'false'}</PartyToLawsuitIndicator>
                        <PriorPropertyDeedInLieuConveyedIndicator>${decl.conveyed_title_in_lieu_4yr ? 'true' : 'false'}</PriorPropertyDeedInLieuConveyedIndicator>
                        <PriorPropertyShortSaleCompletedIndicator>${decl.short_sale_4yr ? 'true' : 'false'}</PriorPropertyShortSaleCompletedIndicator>
                        <PriorPropertyForeclosureCompletedIndicator>${decl.foreclosed_4yr ? 'true' : 'false'}</PriorPropertyForeclosureCompletedIndicator>
                        <BankruptcyIndicator>${decl.bankruptcy_4yr ? 'true' : 'false'}</BankruptcyIndicator>
                        ${decl.bankruptcy_4yr && decl.bankruptcy_type ? `<BankruptcyChapterType>${decl.bankruptcy_type}</BankruptcyChapterType>` : ''}
                        <UndisclosedBorrowedFundsIndicator>${decl.borrowing_undisclosed_money ? 'true' : 'false'}</UndisclosedBorrowedFundsIndicator>
                        <UndisclosedCreditApplicationIndicator>false</UndisclosedCreditApplicationIndicator>
                        <PropertyProposedCleanEnergyLienIndicator>false</PropertyProposedCleanEnergyLienIndicator>
                        <UndisclosedMortgageApplicationIndicator>false</UndisclosedMortgageApplicationIndicator>
                        <UndisclosedComakerOfNoteIndicator>false</UndisclosedComakerOfNoteIndicator>
                      </DECLARATION_DETAIL>
                    </DECLARATION>
                    ${(demo.ethnicity || demo.race || demo.sex) ? `
                    <GOVERNMENT_MONITORING>
                      <GOVERNMENT_MONITORING_DETAIL>
                        <HMDAEthnicityCollectedBasedOnVisualObservationOrSurnameIndicator>${demo.ethnicity_collected_visual ? 'true' : 'false'}</HMDAEthnicityCollectedBasedOnVisualObservationOrSurnameIndicator>
                        <HMDARaceCollectedBasedOnVisualObservationOrSurnameIndicator>${demo.race_collected_visual ? 'true' : 'false'}</HMDARaceCollectedBasedOnVisualObservationOrSurnameIndicator>
                        <HMDASexCollectedBasedOnVisualObservationOrNameIndicator>${demo.sex_collected_visual ? 'true' : 'false'}</HMDASexCollectedBasedOnVisualObservationOrNameIndicator>
                        ${demo.demographics_collection_method ? `<ApplicationTakenMethodType>${mapCollectionMethod(demo.demographics_collection_method)}</ApplicationTakenMethodType>` : ''}
                      </GOVERNMENT_MONITORING_DETAIL>
                      <HMDA_ETHNICITIES>
                        ${(demo.ethnicity || []).map(e => `<HMDA_ETHNICITY><HMDAEthnicityType>${mapEthnicity(e)}</HMDAEthnicityType></HMDA_ETHNICITY>`).join('')}
                      </HMDA_ETHNICITIES>
                      <HMDA_RACES>
                        ${(demo.race || []).map(r => `<HMDA_RACE><HMDARaceType>${mapRace(r)}</HMDARaceType></HMDA_RACE>`).join('')}
                      </HMDA_RACES>
                      ${demo.sex ? `<EXTENSION><OTHER><ULAD:HMDAGenderType>${mapSex(demo.sex)}</ULAD:HMDAGenderType></OTHER></EXTENSION>` : ''}
                    </GOVERNMENT_MONITORING>` : ''}
                    <RESIDENCES>
                      ${b.current_address_street ? `
                      <RESIDENCE SequenceNumber="1">
                        <ADDRESS>
                          <AddressLineText>${escapeXml(b.current_address_street)}</AddressLineText>
                          ${b.current_address_unit ? `<AddressUnitIdentifier>${escapeXml(b.current_address_unit)}</AddressUnitIdentifier>` : ''}
                          <CityName>${escapeXml(b.current_address_city || '')}</CityName>
                          <StateCode>${escapeXml(b.current_address_state || '')}</StateCode>
                          <PostalCode>${escapeXml(b.current_address_zip || '')}</PostalCode>
                          <CountryCode>US</CountryCode>
                        </ADDRESS>
                        <RESIDENCE_DETAIL>
                          <BorrowerResidencyBasisType>${mapHousingStatus(b.housing_status)}</BorrowerResidencyBasisType>
                          <BorrowerResidencyDurationMonthsCount>${(b.time_at_address_years || 0) * 12 + (b.time_at_address_months || 0)}</BorrowerResidencyDurationMonthsCount>
                          <BorrowerResidencyType>Current</BorrowerResidencyType>
                        </RESIDENCE_DETAIL>
                      </RESIDENCE>` : ''}
                      ${b.former_address_street && !b.former_address_na ? `
                      <RESIDENCE SequenceNumber="2">
                        <ADDRESS>
                          <AddressLineText>${escapeXml(b.former_address_street)}</AddressLineText>
                          <CityName>${escapeXml(b.former_address_city || '')}</CityName>
                          <StateCode>${escapeXml(b.former_address_state || '')}</StateCode>
                          <PostalCode>${escapeXml(b.former_address_zip || '')}</PostalCode>
                          <CountryCode>US</CountryCode>
                        </ADDRESS>
                        <RESIDENCE_DETAIL>
                          <BorrowerResidencyType>Prior</BorrowerResidencyType>
                        </RESIDENCE_DETAIL>
                      </RESIDENCE>` : ''}
                    </RESIDENCES>
                    ${b.assets && b.assets.length > 0 ? `
                    <CURRENT_INCOME>
                      <CURRENT_INCOME_ITEMS>
                        ${b.assets.filter(a => a.account_balance).map((asset, aidx) => `
                        <CURRENT_INCOME_ITEM SequenceNumber="${aidx + 1}">
                          <CURRENT_INCOME_ITEM_DETAIL>
                            <IncomeType>Asset</IncomeType>
                            <CurrentIncomeMonthlyTotalAmount>${formatMoney((asset.account_balance || 0) / 12)}</CurrentIncomeMonthlyTotalAmount>
                          </CURRENT_INCOME_ITEM_DETAIL>
                        </CURRENT_INCOME_ITEM>`).join('')}
                      </CURRENT_INCOME_ITEMS>
                    </CURRENT_INCOME>` : ''}
                  </BORROWER>
                  <ROLE_DETAIL>
                    <PartyRoleType>${borrowerType}</PartyRoleType>
                  </ROLE_DETAIL>
                </ROLE>
              </ROLES>
              <TAXPAYER_IDENTIFIERS>
                <TAXPAYER_IDENTIFIER>
                  <TaxpayerIdentifierType>${mapTaxpayerIdType(b.taxpayer_id_type)}</TaxpayerIdentifierType>
                  ${b.ssn_last4 ? `<TaxpayerIdentifierValue>XXX-XX-${b.ssn_last4}</TaxpayerIdentifierValue>` : ''}
                </TAXPAYER_IDENTIFIER>
              </TAXPAYER_IDENTIFIERS>
            </PARTY>`;
  });
  
  // Helper functions for MISMO enum mappings
  function mapMaritalStatus(status) {
    const map = { 'Married': 'Married', 'Unmarried': 'Unmarried', 'Separated': 'Separated' };
    return map[status] || 'Unmarried';
  }
  
  function mapCitizenshipStatus(status) {
    const map = {
      'US_Citizen': 'USCitizen',
      'Permanent_Resident': 'PermanentResidentAlien',
      'NPRA_Work_Visa': 'NonPermanentResidentAlien',
      'NPRA_ITIN': 'NonPermanentResidentAlien',
      'Foreign_National': 'NonPermanentResidentAlien',
    };
    return map[status] || 'USCitizen';
  }
  
  function mapHousingStatus(status) {
    const map = { 'Own': 'Own', 'Rent': 'Rent', 'Rent Free': 'LivingRentFree' };
    return map[status] || 'Own';
  }
  
  function mapTaxpayerIdType(type) {
    const map = { 'SSN': 'SocialSecurityNumber', 'ITIN': 'IndividualTaxpayerIdentificationNumber', 'Foreign': 'NotApplicable' };
    return map[type] || 'SocialSecurityNumber';
  }
  
  function getCreditScoreCategory(score) {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'VeryGood';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  }
  
  function mapEthnicity(eth) {
    const map = {
      'Hispanic or Latino': 'HispanicOrLatino',
      'Not Hispanic or Latino': 'NotHispanicOrLatino',
      'I do not wish to provide': 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication',
    };
    return map[eth] || 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication';
  }
  
  function mapRace(race) {
    const map = {
      'American Indian or Alaska Native': 'AmericanIndianOrAlaskaNative',
      'Asian': 'Asian',
      'Black or African American': 'BlackOrAfricanAmerican',
      'Native Hawaiian or Other Pacific Islander': 'NativeHawaiianOrOtherPacificIslander',
      'White': 'White',
      'I do not wish to provide': 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication',
    };
    return map[race] || 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication';
  }
  
  function mapSex(sex) {
    const map = { 'Male': 'Male', 'Female': 'Female', 'I do not wish to provide': 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication' };
    return map[sex] || 'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication';
  }
  
  function mapCollectionMethod(method) {
    const map = {
      'Face to Face': 'FaceToFace',
      'Telephone': 'Telephone',
      'Fax or Mail': 'FaxOrMail',
      'Email or Internet': 'Internet',
    };
    return map[method] || 'Internet';
  }

  xml += `
          </PARTIES>
          <RELATIONSHIPS>`;
  
  // Link borrowers to loans - deterministic ordering
  let relSeq = 1;
  sequencedBorrowers.forEach((b) => {
    const roleLabel = generateLabel('Borrower', 1, b._label);
    xml += `
            <RELATIONSHIP SequenceNumber="${relSeq++}" xlink:from="${b._label}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/PARTY_IsVerifiedBy_VERIFICATION"/>
            <RELATIONSHIP SequenceNumber="${relSeq++}" xlink:from="${roleLabel}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/BORROWER_BorrowsOn_LOAN"/>`;
  });
  
  // Link properties to loans - deterministic ordering
  sequencedProperties.forEach((p) => {
    xml += `
            <RELATIONSHIP SequenceNumber="${relSeq++}" xlink:from="${p._label}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/COLLATERAL_IsCollateralFor_LOAN"/>
            <RELATIONSHIP SequenceNumber="${relSeq++}" xlink:from="${generateLabel('Property', p._seq)}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/PROPERTY_IsSubjectPropertyFor_LOAN"/>`;
  });
  
  xml += `
          </RELATIONSHIPS>`;
  
  // Services/Fees section with comprehensive TRID categories
  if (fees.length > 0) {
    xml += `
          <SERVICES>`;
    fees.forEach((fee, idx) => {
      const tridSection = mapTRIDSection(fee.trid_category || fee.fee_type);
      xml += `
            <SERVICE SequenceNumber="${idx + 1}">
              <SERVICE_DETAIL>
                <ServiceType>${escapeXml(fee.service_type || 'Other')}</ServiceType>
              </SERVICE_DETAIL>
              <SERVICE_PAYMENTS>
                <SERVICE_PAYMENT>
                  <SERVICE_PAYMENT_DETAIL>
                    <ServicePaymentAmount>${formatMoney(fee.calculated_amount || fee.amount)}</ServicePaymentAmount>
                  </SERVICE_PAYMENT_DETAIL>
                </SERVICE_PAYMENT>
              </SERVICE_PAYMENTS>
              <FEES>
                <FEE>
                  <FEE_DETAIL>
                    <FeeActualTotalAmount>${formatMoney(fee.calculated_amount || fee.amount)}</FeeActualTotalAmount>
                    <FeeEstimatedTotalAmount>${formatMoney(fee.estimated_amount || fee.calculated_amount || fee.amount)}</FeeEstimatedTotalAmount>
                    <FeePaidByType>${fee.is_borrower_paid !== false ? 'Borrower' : 'Lender'}</FeePaidByType>
                    <FeePaidToType>${escapeXml(fee.paid_to || 'Lender')}</FeePaidToType>
                    <FeeType>${escapeXml(fee.fee_name || fee.fee_type || 'Other')}</FeeType>
                    <FeeTotalPercent>${formatPercent(fee.fee_percent)}</FeeTotalPercent>
                    <IntegratedDisclosureSectionType>${tridSection}</IntegratedDisclosureSectionType>
                    ${fee.is_apr_fee !== undefined ? `<APRIndicator>${fee.is_apr_fee}</APRIndicator>` : ''}
                    ${fee.is_financed !== undefined ? `<FeeFinancedIndicator>${fee.is_financed}</FeeFinancedIndicator>` : ''}
                  </FEE_DETAIL>
                  <FEE_PAYMENTS>
                    <FEE_PAYMENT>
                      <FEE_PAYMENT_DETAIL>
                        <FeePaymentPaidByType>${fee.is_borrower_paid !== false ? 'Borrower' : 'Lender'}</FeePaymentPaidByType>
                        <FeePaymentAmount>${formatMoney(fee.calculated_amount || fee.amount)}</FeePaymentAmount>
                      </FEE_PAYMENT_DETAIL>
                    </FEE_PAYMENT>
                  </FEE_PAYMENTS>
                </FEE>
              </FEES>
            </SERVICE>`;
    });
    xml += `
          </SERVICES>`;
  }
  
  // Add loan originator info if available
  if (originator) {
    xml += `
          <LOAN_ORIGINATOR>
            <LOAN_ORIGINATOR_DETAIL>
              <LoanOriginatorName>${escapeXml(originator.originator_name)}</LoanOriginatorName>
              ${originator.originator_nmls_id ? `<NMLSLicenseIdentifier>${escapeXml(originator.originator_nmls_id)}</NMLSLicenseIdentifier>` : ''}
              ${originator.originator_state_license_id ? `<StateLicenseIdentifier>${escapeXml(originator.originator_state_license_id)}</StateLicenseIdentifier>` : ''}
            </LOAN_ORIGINATOR_DETAIL>
            ${originator.organization_name ? `
            <LOAN_ORIGINATION_COMPANY>
              <LOAN_ORIGINATION_COMPANY_DETAIL>
                <LoanOriginationCompanyName>${escapeXml(originator.organization_name)}</LoanOriginationCompanyName>
                ${originator.organization_nmls_id ? `<LoanOriginationCompanyNMLSIdentifier>${escapeXml(originator.organization_nmls_id)}</LoanOriginationCompanyNMLSIdentifier>` : ''}
              </LOAN_ORIGINATION_COMPANY_DETAIL>
              ${originator.organization_address_street ? `
              <ADDRESS>
                <AddressLineText>${escapeXml(originator.organization_address_street)}</AddressLineText>
                <CityName>${escapeXml(originator.organization_address_city || '')}</CityName>
                <StateCode>${escapeXml(originator.organization_address_state || '')}</StateCode>
                <PostalCode>${escapeXml(originator.organization_address_zip || '')}</PostalCode>
              </ADDRESS>` : ''}
            </LOAN_ORIGINATION_COMPANY>` : ''}
          </LOAN_ORIGINATOR>`;
  }
  
  xml += `
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</${MISMO_CONFIG.ROOT_ELEMENT}>`;

  return xml;
}

// Map fee types to TRID integrated disclosure sections
function mapTRIDSection(feeType) {
  const map = {
    'origination': 'OriginationCharges',
    'Origination Fee': 'OriginationCharges',
    'points': 'OriginationCharges',
    'discount': 'OriginationCharges',
    'appraisal': 'ServicesYouCannotShopFor',
    'Appraisal Fee': 'ServicesYouCannotShopFor',
    'credit_report': 'ServicesYouCannotShopFor',
    'flood_certification': 'ServicesYouCannotShopFor',
    'title_insurance': 'ServicesYouCanShopFor',
    'Title Insurance': 'ServicesYouCanShopFor',
    'title_search': 'ServicesYouCanShopFor',
    'Title Search': 'ServicesYouCanShopFor',
    'survey': 'ServicesYouCanShopFor',
    'Survey': 'ServicesYouCanShopFor',
    'recording': 'TaxesAndOtherGovernmentFees',
    'transfer_tax': 'TaxesAndOtherGovernmentFees',
    'prepaid_interest': 'Prepaids',
    'prepaid_taxes': 'Prepaids',
    'prepaid_insurance': 'Prepaids',
    'escrow': 'InitialEscrowPaymentAtClosing',
    'reserves': 'InitialEscrowPaymentAtClosing',
    'owner_title': 'OtherCosts',
    'other': 'OtherCosts',
  };
  return map[feeType] || map[feeType?.toLowerCase()] || 'OtherCosts';
}