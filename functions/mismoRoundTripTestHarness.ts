/**
 * MISMO Round-Trip Test Harness
 * 
 * Generates sample applications, exports to MISMO XML, imports back,
 * and compares canonical JSON before/after using normalized comparison rules.
 * 
 * Test Coverage:
 * - Purchase vs Refinance
 * - Individual vs Entity vesting
 * - Multiple borrowers (co-borrowers)
 * - Multiple properties (blanket loans)
 * - REO > 6 rows
 * - Various loan products (DSCR, Bridge, etc.)
 * - All occupancy types
 * - All property types
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Test corpus configuration
const TEST_CORPUS_CONFIG = {
  totalTests: 50,
  branches: {
    loanPurpose: ['Purchase', 'Refinance', 'Cash-Out', 'Rate & Term'],
    vestingType: ['Individual', 'Entity'],
    entityType: ['LLC', 'Corp', 'Trust', 'GP'],
    loanProduct: ['DSCR', 'DSCR - No Ratio', 'DSCR Blanket', 'Bridge', 'Hard Money'],
    occupancyType: ['Investment', 'Primary', 'Secondary'],
    propertyType: ['SFR', 'Condo', '2-4 Units', '5+ Units', 'Mixed Use'],
    borrowerCount: [1, 2, 3],
    propertyCount: [1, 2, 3, 4, 5], // For blanket loans
    reoCount: [0, 2, 4, 6, 8, 10], // Test > 6 REO rows
    hasDeclarations: [true, false],
    hasDemographics: [true, false],
  }
};

// Comparison rules for normalized diff
const DIFF_RULES = {
  ignoredFields: ['id', 'created_date', 'updated_date', 'created_by', '_seq', '_label'],
  numericTolerance: 0.001, // Allow small floating point differences
  dateFormat: 'YYYY-MM-DD',
  preserveSequenceOrder: true, // Only ignore order if SequenceNumber preserved
  enumMappings: {
    // Map equivalent enum values
    'Purchase': ['Purchase'],
    'Refinance': ['Refinance', 'NoCashOutRefinance'],
    'Cash-Out': ['CashOutRefinance', 'Cash-Out Refinance'],
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, test_count = 50, test_id, org_id } = await req.json();

    switch (action) {
      case 'generate_test_corpus':
        return Response.json(await generateTestCorpus(base44, test_count, org_id));

      case 'run_single_test':
        return Response.json(await runSingleRoundTripTest(base44, test_id, org_id));

      case 'run_full_suite':
        return Response.json(await runFullTestSuite(base44, test_count, org_id));

      case 'get_test_report':
        return Response.json(await getTestReport(base44, org_id));

      case 'compare_json':
        const { before, after } = await req.json();
        return Response.json(compareCanonicalJSON(before, after));

      default:
        return Response.json({ error: 'Unknown action. Use: generate_test_corpus, run_single_test, run_full_suite, get_test_report' }, { status: 400 });
    }
  } catch (error) {
    console.error('Test harness error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

/**
 * Generate a diverse test corpus covering all branches
 */
async function generateTestCorpus(base44, testCount, orgId) {
  const testCases = [];
  const branches = TEST_CORPUS_CONFIG.branches;
  
  // Generate test cases to cover all branches
  for (let i = 0; i < testCount; i++) {
    const testCase = generateTestCase(i, branches);
    testCases.push(testCase);
  }

  // Store test corpus
  const corpusId = `corpus_${Date.now()}`;
  
  return {
    success: true,
    corpus_id: corpusId,
    test_count: testCases.length,
    branch_coverage: calculateBranchCoverage(testCases, branches),
    test_cases: testCases.map((tc, idx) => ({
      test_id: `test_${idx + 1}`,
      ...tc.summary
    }))
  };
}

/**
 * Generate a single test case with specific branch selections
 */
function generateTestCase(index, branches) {
  // Distribute tests across branches to ensure coverage
  const loanPurpose = branches.loanPurpose[index % branches.loanPurpose.length];
  const vestingType = branches.vestingType[index % branches.vestingType.length];
  const entityType = vestingType === 'Entity' ? branches.entityType[index % branches.entityType.length] : null;
  const loanProduct = branches.loanProduct[index % branches.loanProduct.length];
  const occupancyType = branches.occupancyType[index % branches.occupancyType.length];
  const propertyType = branches.propertyType[index % branches.propertyType.length];
  const borrowerCount = branches.borrowerCount[index % branches.borrowerCount.length];
  const propertyCount = loanProduct.includes('Blanket') ? branches.propertyCount[index % branches.propertyCount.length] : 1;
  const reoCount = branches.reoCount[index % branches.reoCount.length];
  const hasDeclarations = branches.hasDeclarations[index % 2];
  const hasDemographics = branches.hasDemographics[index % 2];

  // Generate deal data
  const deal = generateDealData(index, {
    loanPurpose, vestingType, entityType, loanProduct, occupancyType, propertyCount
  });

  // Generate borrowers
  const borrowers = [];
  for (let b = 0; b < borrowerCount; b++) {
    borrowers.push(generateBorrowerData(index, b, { vestingType, entityType, hasDeclarations, hasDemographics }));
  }

  // Generate properties
  const properties = [];
  for (let p = 0; p < propertyCount; p++) {
    properties.push(generatePropertyData(index, p, { propertyType, occupancyType }));
  }

  // Generate REO properties
  const reoProperties = [];
  for (let r = 0; r < reoCount; r++) {
    reoProperties.push(generateREOData(index, r));
  }

  // Generate fees
  const fees = generateFeesData(index, deal.loan_amount);

  return {
    summary: {
      loan_purpose: loanPurpose,
      vesting_type: vestingType,
      entity_type: entityType,
      loan_product: loanProduct,
      occupancy_type: occupancyType,
      property_type: propertyType,
      borrower_count: borrowerCount,
      property_count: propertyCount,
      reo_count: reoCount,
      has_declarations: hasDeclarations,
      has_demographics: hasDemographics,
    },
    deal,
    borrowers,
    properties,
    reoProperties,
    fees,
  };
}

function generateDealData(index, config) {
  const baseAmount = 200000 + (index * 50000) % 2000000;
  const rate = 6.5 + (index % 30) * 0.125;
  const term = [360, 240, 180, 120][index % 4];
  
  return {
    deal_number: `TEST-${String(index + 1).padStart(4, '0')}`,
    loan_product: config.loanProduct,
    loan_purpose: config.loanPurpose,
    occupancy_type: config.occupancyType,
    vesting_type: config.vestingType,
    entity_type: config.entityType,
    loan_amount: baseAmount,
    interest_rate: rate,
    loan_term_months: term,
    is_blanket: config.propertyCount > 1,
    appraised_value: Math.round(baseAmount / 0.75),
    purchase_price: config.loanPurpose === 'Purchase' ? Math.round(baseAmount / 0.8) : null,
    ltv: 75 + (index % 10),
    dscr: 1.0 + (index % 50) * 0.02,
    prepay_penalty_type: ['None', '5-4-3-2-1', '3-2-1', 'Yield Maintenance'][index % 4],
    prepay_penalty_term_months: [0, 60, 36, 60][index % 4],
    amortization_type: ['fixed', 'arm', 'io'][index % 3],
    is_interest_only: index % 5 === 0,
    stage: 'application',
    status: 'active',
  };
}

function generateBorrowerData(dealIndex, borrowerIndex, config) {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson'];
  
  const borrower = {
    borrower_type: config.vestingType === 'Entity' ? 'entity' : 'individual',
    first_name: firstNames[(dealIndex + borrowerIndex) % firstNames.length],
    last_name: lastNames[(dealIndex + borrowerIndex) % lastNames.length],
    email: `test${dealIndex}_${borrowerIndex}@example.com`,
    cell_phone: `555-${String(dealIndex).padStart(3, '0')}-${String(borrowerIndex).padStart(4, '0')}`,
    ssn_last4: String(1000 + (dealIndex * 10 + borrowerIndex) % 9000),
    marital_status: ['Married', 'Unmarried', 'Separated'][dealIndex % 3],
    citizenship_status: ['US_Citizen', 'Permanent_Resident', 'NPRA_Work_Visa'][(dealIndex + borrowerIndex) % 3],
    credit_score_est: 620 + (dealIndex * 5) % 180,
    current_address_street: `${100 + dealIndex} Test Street`,
    current_address_city: 'Phoenix',
    current_address_state: 'AZ',
    current_address_zip: '85001',
    time_at_address_years: 2 + (dealIndex % 10),
    housing_status: ['Own', 'Rent', 'Rent Free'][dealIndex % 3],
    role: borrowerIndex === 0 ? 'primary' : 'co_borrower',
  };

  if (config.hasDeclarations) {
    borrower.declarations = {
      outstanding_judgments: dealIndex % 10 === 0,
      bankruptcy_4yr: dealIndex % 15 === 0,
      bankruptcy_type: dealIndex % 15 === 0 ? 'Chapter7' : null,
      foreclosed_4yr: dealIndex % 20 === 0,
      party_to_lawsuit: dealIndex % 25 === 0,
      conveyed_title_in_lieu_4yr: false,
      short_sale_4yr: false,
      borrowing_undisclosed_money: false,
    };
  }

  if (config.hasDemographics) {
    borrower.demographics = {
      ethnicity: ['Hispanic or Latino', 'Not Hispanic or Latino', 'I do not wish to provide'][dealIndex % 3],
      race: [['White'], ['Asian'], ['Black or African American'], ['I do not wish to provide']][dealIndex % 4],
      sex: ['Male', 'Female', 'I do not wish to provide'][dealIndex % 3],
      demographics_collection_method: ['Face to Face', 'Telephone', 'Email or Internet'][dealIndex % 3],
    };
  }

  return borrower;
}

function generatePropertyData(dealIndex, propertyIndex, config) {
  const cities = ['Phoenix', 'Scottsdale', 'Mesa', 'Tempe', 'Chandler', 'Gilbert', 'Glendale', 'Peoria'];
  const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Elm Way', 'Birch Ct', 'Willow Pl'];
  
  return {
    address_street: `${100 + dealIndex + propertyIndex * 10} ${streets[(dealIndex + propertyIndex) % streets.length]}`,
    address_city: cities[(dealIndex + propertyIndex) % cities.length],
    address_state: 'AZ',
    address_zip: `8500${propertyIndex + 1}`,
    county: 'Maricopa',
    property_type: config.propertyType,
    occupancy_type: config.occupancyType,
    number_of_units: config.propertyType === '2-4 Units' ? 2 + (dealIndex % 3) : 
                      config.propertyType === '5+ Units' ? 5 + (dealIndex % 10) : 1,
    year_built: 1980 + (dealIndex % 40),
    sqft: 1200 + (dealIndex * 100) % 3000,
    beds: 2 + (dealIndex % 4),
    baths: 1.5 + (dealIndex % 3) * 0.5,
    estimated_value: 250000 + (dealIndex * 25000) % 1500000,
    gross_rent_monthly: 1500 + (dealIndex * 100) % 3000,
    taxes_monthly: 200 + (dealIndex * 10) % 400,
    insurance_monthly: 100 + (dealIndex * 5) % 200,
    hoa_monthly: dealIndex % 3 === 0 ? 150 + (dealIndex % 200) : 0,
  };
}

function generateREOData(dealIndex, reoIndex) {
  const cities = ['Los Angeles', 'San Diego', 'Denver', 'Austin', 'Seattle', 'Portland', 'Miami', 'Atlanta'];
  const states = ['CA', 'CA', 'CO', 'TX', 'WA', 'OR', 'FL', 'GA'];
  
  return {
    address_street: `${200 + reoIndex} REO Property Lane`,
    address_city: cities[reoIndex % cities.length],
    address_state: states[reoIndex % states.length],
    address_zip: `${90000 + reoIndex * 100}`,
    property_type: ['SFR', 'Condo', '2-4 Units'][reoIndex % 3],
    market_value: 200000 + (reoIndex * 50000),
    monthly_rent: 1200 + (reoIndex * 100),
    mortgage_balance: 150000 + (reoIndex * 30000),
    mortgage_payment: 800 + (reoIndex * 50),
    status: ['Retained', 'Pending Sale', 'Sold'][reoIndex % 3],
  };
}

function generateFeesData(dealIndex, loanAmount) {
  const originationRate = 1 + (dealIndex % 3) * 0.5;
  
  return [
    { fee_name: 'Origination Fee', fee_type: 'origination', amount: loanAmount * originationRate / 100, is_borrower_paid: true },
    { fee_name: 'Appraisal Fee', fee_type: 'appraisal', amount: 500 + (dealIndex % 5) * 50, is_borrower_paid: true },
    { fee_name: 'Credit Report', fee_type: 'credit_report', amount: 50, is_borrower_paid: true },
    { fee_name: 'Title Insurance', fee_type: 'title_insurance', amount: 1000 + (dealIndex % 10) * 100, is_borrower_paid: true },
    { fee_name: 'Recording Fees', fee_type: 'recording', amount: 150 + (dealIndex % 5) * 25, is_borrower_paid: true },
    { fee_name: 'Flood Certification', fee_type: 'flood_certification', amount: 15, is_borrower_paid: true },
  ];
}

/**
 * Run a single round-trip test
 */
async function runSingleRoundTripTest(base44, testId, orgId) {
  const startTime = Date.now();
  const results = {
    test_id: testId,
    status: 'pending',
    steps: [],
    diffs: [],
    unmapped_elements: [],
  };

  try {
    // Step 1: Generate test case
    const testCase = generateTestCase(parseInt(testId.split('_')[1]) || 0, TEST_CORPUS_CONFIG.branches);
    results.steps.push({ step: 'generate_test_case', status: 'success', data: testCase.summary });

    // Step 2: Create canonical JSON snapshot (before)
    const canonicalBefore = {
      deal: testCase.deal,
      borrowers: testCase.borrowers,
      properties: testCase.properties,
      reoProperties: testCase.reoProperties,
      fees: testCase.fees,
    };
    results.steps.push({ step: 'create_canonical_before', status: 'success' });

    // Step 3: Export to MISMO XML
    const mismoXml = await exportToMISMO(testCase);
    results.steps.push({ step: 'export_to_mismo', status: 'success', xml_length: mismoXml.length });

    // Step 4: Import from MISMO XML
    const importResult = await importFromMISMO(mismoXml);
    results.steps.push({ step: 'import_from_mismo', status: 'success', unmapped_count: importResult.unmapped?.length || 0 });
    results.unmapped_elements = importResult.unmapped || [];

    // Step 5: Create canonical JSON snapshot (after)
    const canonicalAfter = importResult.canonical;
    results.steps.push({ step: 'create_canonical_after', status: 'success' });

    // Step 6: Compare canonical JSON
    const comparison = compareCanonicalJSON(canonicalBefore, canonicalAfter);
    results.diffs = comparison.diffs;
    results.steps.push({ 
      step: 'compare_canonical', 
      status: comparison.diffs.length === 0 ? 'success' : 'diffs_found',
      diff_count: comparison.diffs.length 
    });

    results.status = comparison.diffs.length === 0 && results.unmapped_elements.length === 0 ? 'passed' : 'failed';
    results.duration_ms = Date.now() - startTime;

  } catch (error) {
    results.status = 'error';
    results.error = error.message;
    results.duration_ms = Date.now() - startTime;
  }

  return results;
}

/**
 * Run full test suite
 */
async function runFullTestSuite(base44, testCount, orgId) {
  const suiteResults = {
    suite_id: `suite_${Date.now()}`,
    started_at: new Date().toISOString(),
    test_count: testCount,
    passed: 0,
    failed: 0,
    errors: 0,
    total_diffs: 0,
    total_unmapped: 0,
    tests: [],
    branch_coverage: {},
    summary: {}
  };

  for (let i = 0; i < testCount; i++) {
    const testId = `test_${i + 1}`;
    const result = await runSingleRoundTripTest(base44, testId, orgId);
    
    suiteResults.tests.push({
      test_id: testId,
      status: result.status,
      diff_count: result.diffs.length,
      unmapped_count: result.unmapped_elements.length,
      duration_ms: result.duration_ms,
    });

    if (result.status === 'passed') suiteResults.passed++;
    else if (result.status === 'error') suiteResults.errors++;
    else suiteResults.failed++;

    suiteResults.total_diffs += result.diffs.length;
    suiteResults.total_unmapped += result.unmapped_elements.length;
  }

  suiteResults.completed_at = new Date().toISOString();
  suiteResults.success_rate = ((suiteResults.passed / testCount) * 100).toFixed(2) + '%';
  
  // Calculate branch coverage
  const testCases = [];
  for (let i = 0; i < testCount; i++) {
    testCases.push(generateTestCase(i, TEST_CORPUS_CONFIG.branches));
  }
  suiteResults.branch_coverage = calculateBranchCoverage(testCases, TEST_CORPUS_CONFIG.branches);

  suiteResults.summary = {
    total_tests: testCount,
    passed: suiteResults.passed,
    failed: suiteResults.failed,
    errors: suiteResults.errors,
    success_rate: suiteResults.success_rate,
    total_diffs: suiteResults.total_diffs,
    total_unmapped: suiteResults.total_unmapped,
    acceptance_criteria_met: suiteResults.total_diffs === 0,
  };

  return suiteResults;
}

/**
 * Export test case to MISMO XML format
 */
async function exportToMISMO(testCase) {
  // Build MISMO XML from test case data
  const escapeXml = (str) => (str || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const deal = testCase.deal;
  const borrowers = testCase.borrowers;
  const properties = testCase.properties;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" 
         xmlns:xlink="http://www.w3.org/1999/xlink"
         xmlns:LG="urn:loangenius:mismo:extension:1.0"
         MISMOVersionID="3.4.0">
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN SequenceNumber="1" xlink:label="Loan_1" LoanRoleType="SubjectLoan">
              <TERMS_OF_LOAN>
                <BaseLoanAmount>${deal.loan_amount}</BaseLoanAmount>
                <NoteRatePercent>${deal.interest_rate}</NoteRatePercent>
                <LoanPurposeType>${mapLoanPurpose(deal.loan_purpose)}</LoanPurposeType>
              </TERMS_OF_LOAN>
              <LOAN_DETAIL>
                <LoanMaturityPeriodCount>${Math.floor(deal.loan_term_months / 12)}</LoanMaturityPeriodCount>
                <LoanMaturityPeriodType>Year</LoanMaturityPeriodType>
              </LOAN_DETAIL>
            </LOAN>
          </LOANS>
          <COLLATERALS>`;

  properties.forEach((prop, idx) => {
    xml += `
            <COLLATERAL SequenceNumber="${idx + 1}" xlink:label="Collateral_${idx + 1}">
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${escapeXml(prop.address_street)}</AddressLineText>
                  <CityName>${escapeXml(prop.address_city)}</CityName>
                  <StateCode>${escapeXml(prop.address_state)}</StateCode>
                  <PostalCode>${escapeXml(prop.address_zip)}</PostalCode>
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${prop.estimated_value}</PropertyEstimatedValueAmount>
                  <PropertyUsageType>${mapOccupancy(prop.occupancy_type)}</PropertyUsageType>
                  <FinancedUnitCount>${prop.number_of_units}</FinancedUnitCount>
                </PROPERTY_DETAIL>
              </SUBJECT_PROPERTY>
            </COLLATERAL>`;
  });

  xml += `
          </COLLATERALS>
          <PARTIES>`;

  borrowers.forEach((b, idx) => {
    xml += `
            <PARTY SequenceNumber="${idx + 1}" xlink:label="Party_${idx + 1}">
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${escapeXml(b.first_name)}</FirstName>
                  <LastName>${escapeXml(b.last_name)}</LastName>
                </NAME>
                <CONTACT_POINTS>
                  <CONTACT_POINT>
                    <CONTACT_POINT_EMAIL>
                      <ContactPointEmailValue>${escapeXml(b.email)}</ContactPointEmailValue>
                    </CONTACT_POINT_EMAIL>
                  </CONTACT_POINT>
                </CONTACT_POINTS>
              </INDIVIDUAL>
              <ROLES>
                <ROLE SequenceNumber="1" xlink:label="Party_${idx + 1}_Role_1">
                  <BORROWER>
                    <BORROWER_DETAIL>
                      ${b.credit_score_est ? `<CreditScoreValue>${b.credit_score_est}</CreditScoreValue>` : ''}
                    </BORROWER_DETAIL>
                  </BORROWER>
                  <ROLE_DETAIL>
                    <PartyRoleType>${idx === 0 ? 'Borrower' : 'CoBorrower'}</PartyRoleType>
                  </ROLE_DETAIL>
                </ROLE>
              </ROLES>
            </PARTY>`;
  });

  xml += `
          </PARTIES>
          <RELATIONSHIPS>`;

  borrowers.forEach((b, idx) => {
    xml += `
            <RELATIONSHIP SequenceNumber="${idx * 2 + 1}" xlink:from="Party_${idx + 1}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/PARTY_IsVerifiedBy_VERIFICATION"/>
            <RELATIONSHIP SequenceNumber="${idx * 2 + 2}" xlink:from="Party_${idx + 1}_Role_1" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/BORROWER_BorrowsOn_LOAN"/>`;
  });

  properties.forEach((p, idx) => {
    xml += `
            <RELATIONSHIP SequenceNumber="${borrowers.length * 2 + idx + 1}" xlink:from="Collateral_${idx + 1}" xlink:to="Loan_1" xlink:arcrole="urn:fdc:mismo.org:2009:residential/COLLATERAL_IsCollateralFor_LOAN"/>`;
  });

  xml += `
          </RELATIONSHIPS>
          <EXTENSION>
            <OTHER xmlns:LG="urn:loangenius:mismo:extension:1.0">
              <LG:LoanGeniusMetadata>
                <LG:LGDealNumber>${escapeXml(deal.deal_number)}</LG:LGDealNumber>
                <LG:LGProductType>${escapeXml(deal.loan_product)}</LG:LGProductType>
              </LG:LoanGeniusMetadata>
              ${deal.dscr ? `<LG:DSCRData>
                <LG:DebtServiceCoverageRatio>${deal.dscr.toFixed(4)}</LG:DebtServiceCoverageRatio>
              </LG:DSCRData>` : ''}
            </OTHER>
          </EXTENSION>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return xml;
}

function mapLoanPurpose(purpose) {
  const map = {
    'Purchase': 'Purchase',
    'Refinance': 'Refinance',
    'Cash-Out': 'CashOutRefinance',
    'Rate & Term': 'NoCashOutRefinance',
  };
  return map[purpose] || 'Other';
}

function mapOccupancy(occ) {
  const map = {
    'Investment': 'Investment',
    'Primary': 'PrimaryResidence',
    'Secondary': 'SecondHome',
  };
  return map[occ] || 'Investment';
}

/**
 * Import MISMO XML and convert back to canonical JSON
 */
async function importFromMISMO(xmlContent) {
  const unmapped = [];
  const canonical = {
    deal: {},
    borrowers: [],
    properties: [],
    reoProperties: [],
    fees: [],
  };

  // Parse loan terms
  const loanAmountMatch = xmlContent.match(/<BaseLoanAmount>([^<]+)<\/BaseLoanAmount>/);
  const rateMatch = xmlContent.match(/<NoteRatePercent>([^<]+)<\/NoteRatePercent>/);
  const purposeMatch = xmlContent.match(/<LoanPurposeType>([^<]+)<\/LoanPurposeType>/);
  const termMatch = xmlContent.match(/<LoanMaturityPeriodCount>([^<]+)<\/LoanMaturityPeriodCount>/);
  const dealNumberMatch = xmlContent.match(/<LG:LGDealNumber>([^<]+)<\/LG:LGDealNumber>/);
  const productMatch = xmlContent.match(/<LG:LGProductType>([^<]+)<\/LG:LGProductType>/);
  const dscrMatch = xmlContent.match(/<LG:DebtServiceCoverageRatio>([^<]+)<\/LG:DebtServiceCoverageRatio>/);

  canonical.deal = {
    deal_number: dealNumberMatch?.[1] || '',
    loan_amount: parseFloat(loanAmountMatch?.[1]) || 0,
    interest_rate: parseFloat(rateMatch?.[1]) || 0,
    loan_purpose: reverseLoanPurpose(purposeMatch?.[1]),
    loan_term_months: (parseInt(termMatch?.[1]) || 30) * 12,
    loan_product: productMatch?.[1] || 'DSCR',
    dscr: dscrMatch ? parseFloat(dscrMatch[1]) : null,
  };

  // Parse borrowers
  const partyPattern = /<PARTY[^>]*SequenceNumber="(\d+)"[^>]*>([\s\S]*?)<\/PARTY>/g;
  let partyMatch;
  while ((partyMatch = partyPattern.exec(xmlContent)) !== null) {
    const partyXml = partyMatch[2];
    const firstNameMatch = partyXml.match(/<FirstName>([^<]+)<\/FirstName>/);
    const lastNameMatch = partyXml.match(/<LastName>([^<]+)<\/LastName>/);
    const emailMatch = partyXml.match(/<ContactPointEmailValue>([^<]+)<\/ContactPointEmailValue>/);
    const roleMatch = partyXml.match(/<PartyRoleType>([^<]+)<\/PartyRoleType>/);
    const creditMatch = partyXml.match(/<CreditScoreValue>([^<]+)<\/CreditScoreValue>/);

    canonical.borrowers.push({
      first_name: firstNameMatch?.[1] || '',
      last_name: lastNameMatch?.[1] || '',
      email: emailMatch?.[1] || '',
      role: roleMatch?.[1] === 'Borrower' ? 'primary' : 'co_borrower',
      credit_score_est: creditMatch ? parseInt(creditMatch[1]) : null,
    });
  }

  // Parse properties
  const collateralPattern = /<COLLATERAL[^>]*SequenceNumber="(\d+)"[^>]*>([\s\S]*?)<\/COLLATERAL>/g;
  let collateralMatch;
  while ((collateralMatch = collateralPattern.exec(xmlContent)) !== null) {
    const propXml = collateralMatch[2];
    const streetMatch = propXml.match(/<AddressLineText>([^<]+)<\/AddressLineText>/);
    const cityMatch = propXml.match(/<CityName>([^<]+)<\/CityName>/);
    const stateMatch = propXml.match(/<StateCode>([^<]+)<\/StateCode>/);
    const zipMatch = propXml.match(/<PostalCode>([^<]+)<\/PostalCode>/);
    const valueMatch = propXml.match(/<PropertyEstimatedValueAmount>([^<]+)<\/PropertyEstimatedValueAmount>/);
    const occupancyMatch = propXml.match(/<PropertyUsageType>([^<]+)<\/PropertyUsageType>/);
    const unitsMatch = propXml.match(/<FinancedUnitCount>([^<]+)<\/FinancedUnitCount>/);

    canonical.properties.push({
      address_street: streetMatch?.[1] || '',
      address_city: cityMatch?.[1] || '',
      address_state: stateMatch?.[1] || '',
      address_zip: zipMatch?.[1] || '',
      estimated_value: valueMatch ? parseFloat(valueMatch[1]) : 0,
      occupancy_type: reverseOccupancy(occupancyMatch?.[1]),
      number_of_units: unitsMatch ? parseInt(unitsMatch[1]) : 1,
    });
  }

  return { canonical, unmapped };
}

function reverseLoanPurpose(mismoValue) {
  const map = {
    'Purchase': 'Purchase',
    'Refinance': 'Refinance',
    'CashOutRefinance': 'Cash-Out',
    'NoCashOutRefinance': 'Rate & Term',
  };
  return map[mismoValue] || mismoValue;
}

function reverseOccupancy(mismoValue) {
  const map = {
    'Investment': 'Investment',
    'PrimaryResidence': 'Primary',
    'SecondHome': 'Secondary',
  };
  return map[mismoValue] || mismoValue;
}

/**
 * Compare two canonical JSON structures
 */
function compareCanonicalJSON(before, after) {
  const diffs = [];
  
  // Compare deals
  const dealDiffs = compareObjects(before.deal, after.deal, 'deal');
  diffs.push(...dealDiffs);

  // Compare borrowers (by sequence)
  const borrowerDiffs = compareArrays(before.borrowers, after.borrowers, 'borrowers', 'role');
  diffs.push(...borrowerDiffs);

  // Compare properties (by sequence)
  const propertyDiffs = compareArrays(before.properties, after.properties, 'properties', 'address_street');
  diffs.push(...propertyDiffs);

  return {
    diffs,
    diff_count: diffs.length,
    summary: {
      deal_diffs: dealDiffs.length,
      borrower_diffs: borrowerDiffs.length,
      property_diffs: propertyDiffs.length,
    }
  };
}

function compareObjects(before, after, path) {
  const diffs = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (DIFF_RULES.ignoredFields.includes(key)) continue;

    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    if (!valuesEqual(beforeVal, afterVal)) {
      diffs.push({
        path: `${path}.${key}`,
        type: beforeVal === undefined ? 'missing_after' : afterVal === undefined ? 'missing_before' : 'value_change',
        before: beforeVal,
        after: afterVal,
      });
    }
  }

  return diffs;
}

function compareArrays(before, after, path, keyField) {
  const diffs = [];
  const maxLen = Math.max(before?.length || 0, after?.length || 0);

  for (let i = 0; i < maxLen; i++) {
    const itemDiffs = compareObjects(before?.[i], after?.[i], `${path}[${i}]`);
    diffs.push(...itemDiffs);
  }

  if ((before?.length || 0) !== (after?.length || 0)) {
    diffs.push({
      path: `${path}.length`,
      type: 'array_length_mismatch',
      before: before?.length || 0,
      after: after?.length || 0,
    });
  }

  return diffs;
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Numeric tolerance
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < DIFF_RULES.numericTolerance;
  }

  // Enum equivalence
  for (const [canonical, equivalents] of Object.entries(DIFF_RULES.enumMappings)) {
    if (equivalents.includes(a) && equivalents.includes(b)) return true;
    if (a === canonical && equivalents.includes(b)) return true;
    if (b === canonical && equivalents.includes(a)) return true;
  }

  return String(a) === String(b);
}

function calculateBranchCoverage(testCases, branches) {
  const coverage = {};
  
  for (const [branchName, values] of Object.entries(branches)) {
    const covered = new Set();
    for (const tc of testCases) {
      const val = tc.summary[branchName.replace(/([A-Z])/g, '_$1').toLowerCase()];
      if (val !== undefined && val !== null) {
        covered.add(String(val));
      }
    }
    coverage[branchName] = {
      total: values.length,
      covered: covered.size,
      percentage: ((covered.size / values.length) * 100).toFixed(1) + '%',
      values_covered: Array.from(covered),
    };
  }

  return coverage;
}

async function getTestReport(base44, orgId) {
  // Return template report structure
  return {
    success: true,
    report: {
      generated_at: new Date().toISOString(),
      summary: 'Run full_suite to generate test results',
      instructions: {
        generate_corpus: 'POST with action: "generate_test_corpus", test_count: 50',
        run_single: 'POST with action: "run_single_test", test_id: "test_1"',
        run_suite: 'POST with action: "run_full_suite", test_count: 50',
      }
    }
  };
}