import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Golden Test Pack Generator
// Generates 30+ test cases for MISMO export/import validation

const TEST_SCENARIOS = [
  // Purchase loans
  { id: 'T001', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 1, assets: 0, reo: 0, bankruptcy: false },
  { id: 'T002', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 2, assets: 1, reo: 0, bankruptcy: false },
  { id: 'T003', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'LLC', applicants: 1, assets: 5, reo: 2, bankruptcy: false },
  { id: 'T004', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'Corporation', applicants: 2, assets: 3, reo: 6, bankruptcy: false },
  { id: 'T005', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'Trust', applicants: 1, assets: 2, reo: 9, bankruptcy: false },
  
  // Refinance loans
  { id: 'T006', loan_purpose: 'Refinance', vesting: 'Individual', applicants: 1, assets: 1, reo: 0, bankruptcy: false },
  { id: 'T007', loan_purpose: 'Refinance', vesting: 'Individual', applicants: 2, assets: 5, reo: 2, bankruptcy: true, bankruptcy_chapter: 'Chapter7' },
  { id: 'T008', loan_purpose: 'Refinance', vesting: 'Entity', entity_type: 'GP', applicants: 1, assets: 3, reo: 6, bankruptcy: false },
  { id: 'T009', loan_purpose: 'Refinance', vesting: 'Entity', entity_type: 'LLC', applicants: 0, assets: 1, reo: 0, bankruptcy: false },
  
  // Cash-Out Refinance
  { id: 'T010', loan_purpose: 'CashOutRefinance', vesting: 'Individual', applicants: 1, assets: 2, reo: 0, bankruptcy: false, cash_out: 50000 },
  { id: 'T011', loan_purpose: 'CashOutRefinance', vesting: 'Individual', applicants: 2, assets: 5, reo: 2, bankruptcy: false, cash_out: 100000 },
  { id: 'T012', loan_purpose: 'CashOutRefinance', vesting: 'Entity', entity_type: 'LLC', applicants: 1, assets: 1, reo: 9, bankruptcy: false, cash_out: 75000 },
  { id: 'T013', loan_purpose: 'CashOutRefinance', vesting: 'Individual', applicants: 2, assets: 3, reo: 6, bankruptcy: true, bankruptcy_chapter: 'Chapter13', cash_out: 25000 },
  
  // No Cash-Out Refinance
  { id: 'T014', loan_purpose: 'NoCashOutRefinance', vesting: 'Individual', applicants: 1, assets: 1, reo: 0, bankruptcy: false },
  { id: 'T015', loan_purpose: 'NoCashOutRefinance', vesting: 'Entity', entity_type: 'Trust', applicants: 0, assets: 5, reo: 2, bankruptcy: false },
  
  // Edge cases: varying asset/REO counts
  { id: 'T016', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 1, assets: 0, reo: 0, bankruptcy: false },
  { id: 'T017', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 1, assets: 5, reo: 0, bankruptcy: false },
  { id: 'T018', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 2, assets: 0, reo: 2, bankruptcy: false },
  { id: 'T019', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 2, assets: 5, reo: 6, bankruptcy: false },
  { id: 'T020', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 1, assets: 3, reo: 9, bankruptcy: false },
  
  // Bankruptcy scenarios
  { id: 'T021', loan_purpose: 'Refinance', vesting: 'Individual', applicants: 1, assets: 2, reo: 0, bankruptcy: true, bankruptcy_chapter: 'Chapter7', bankruptcy_date: '2020-01-15' },
  { id: 'T022', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 2, assets: 1, reo: 2, bankruptcy: true, bankruptcy_chapter: 'Chapter13', bankruptcy_date: '2021-06-30' },
  { id: 'T023', loan_purpose: 'CashOutRefinance', vesting: 'Individual', applicants: 1, assets: 5, reo: 0, bankruptcy: true, bankruptcy_chapter: 'Chapter11', bankruptcy_date: '2019-11-20', cash_out: 30000 },
  
  // Undisclosed money scenarios
  { id: 'T024', loan_purpose: 'Purchase', vesting: 'Individual', applicants: 1, assets: 1, reo: 0, bankruptcy: false, undisclosed_money: true, undisclosed_amount: 15000 },
  { id: 'T025', loan_purpose: 'Refinance', vesting: 'Individual', applicants: 2, assets: 2, reo: 2, bankruptcy: false, undisclosed_money: true, undisclosed_amount: 25000 },
  
  // Entity vesting variations (no demographics shown)
  { id: 'T026', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'LLC', applicants: 1, assets: 2, reo: 0, bankruptcy: false },
  { id: 'T027', loan_purpose: 'Refinance', vesting: 'Entity', entity_type: 'Corporation', applicants: 2, assets: 5, reo: 6, bankruptcy: false },
  { id: 'T028', loan_purpose: 'CashOutRefinance', vesting: 'Entity', entity_type: 'GP', applicants: 1, assets: 1, reo: 9, bankruptcy: false, cash_out: 40000 },
  { id: 'T029', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'Trust', applicants: 0, assets: 3, reo: 2, bankruptcy: false },
  
  // Complex combinations
  { id: 'T030', loan_purpose: 'CashOutRefinance', vesting: 'Individual', applicants: 2, assets: 5, reo: 9, bankruptcy: true, bankruptcy_chapter: 'Chapter7', undisclosed_money: true, undisclosed_amount: 10000, cash_out: 60000 },
  { id: 'T031', loan_purpose: 'Purchase', vesting: 'Entity', entity_type: 'LLC', applicants: 2, assets: 5, reo: 6, bankruptcy: false },
  { id: 'T032', loan_purpose: 'Refinance', vesting: 'Individual', applicants: 1, assets: 0, reo: 9, bankruptcy: false },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, test_id, pack_id } = await req.json();

    // ACTION: Generate full test pack
    if (action === 'generate_pack') {
      const pack = await generateGoldenTestPack(base44, pack_id);
      return Response.json({
        success: true,
        pack
      });
    }

    // ACTION: Generate single test case
    if (action === 'generate_test') {
      const scenario = TEST_SCENARIOS.find(s => s.id === test_id);
      if (!scenario) {
        return Response.json({ error: 'Test not found' }, { status: 404 });
      }
      
      const testCase = await generateTestCase(base44, scenario, pack_id);
      return Response.json({
        success: true,
        test_case: testCase
      });
    }

    // ACTION: Run round-trip test
    if (action === 'run_roundtrip') {
      const scenario = TEST_SCENARIOS.find(s => s.id === test_id);
      if (!scenario) {
        return Response.json({ error: 'Test not found' }, { status: 404 });
      }
      
      const result = await runRoundTripTest(base44, scenario, pack_id);
      return Response.json({
        success: true,
        roundtrip_result: result
      });
    }

    // ACTION: List all test scenarios
    if (action === 'list_scenarios') {
      return Response.json({
        success: true,
        scenarios: TEST_SCENARIOS.map(s => ({
          id: s.id,
          loan_purpose: s.loan_purpose,
          vesting: s.vesting,
          entity_type: s.entity_type,
          applicants: s.applicants,
          assets: s.assets,
          reo: s.reo
        })),
        total_count: TEST_SCENARIOS.length
      });
    }

    // ACTION: Run full regression suite
    if (action === 'run_regression') {
      const results = await runFullRegression(base44, pack_id);
      return Response.json({
        success: true,
        regression_results: results
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Golden Test Pack error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Generate full golden test pack
async function generateGoldenTestPack(base44, packId) {
  const testCases = [];
  
  for (const scenario of TEST_SCENARIOS) {
    const testCase = await generateTestCase(base44, scenario, packId);
    testCases.push(testCase);
  }

  return {
    pack_id: `GOLDEN_PACK_${Date.now()}`,
    pack_version: '1.0',
    schema_pack: packId || 'PACK_A_GENERIC_MISMO_34_B324',
    test_count: testCases.length,
    generated_at: new Date().toISOString(),
    test_cases: testCases
  };
}

// Generate single test case
async function generateTestCase(base44, scenario, packId) {
  // Build canonical data
  const canonicalBefore = buildCanonicalData(scenario);
  
  // Mock export (in production, call actual export function)
  const exported = await mockExport(canonicalBefore, packId);
  
  // Mock validation (in production, call actual validator)
  const validationReport = mockValidation(exported.xml, packId);
  
  // Mock import (in production, call actual import)
  const canonicalAfter = await mockImport(exported.xml, packId);
  
  // Generate diff
  const diff = generateDiff(canonicalBefore, canonicalAfter);

  return {
    test_id: scenario.id,
    scenario,
    canonical_before: canonicalBefore,
    exported_xml: exported.xml,
    exported_metadata: exported.metadata,
    validation_report: validationReport,
    canonical_after: canonicalAfter,
    diff,
    passed: diff.differences.length === 0 && validationReport.status !== 'FAIL'
  };
}

// Build canonical data from scenario
function buildCanonicalData(scenario) {
  const data = {
    loan_amount: 500000 + Math.floor(Math.random() * 500000),
    loan_purpose: scenario.loan_purpose,
    interest_rate: 7.5 + Math.random() * 2,
    loan_term_months: 360,
    property_street: '123 Test Street',
    property_city: 'Los Angeles',
    property_state: 'CA',
    property_zip: '90210',
    property_type: 'Detached',
    occupancy_type: 'Investment',
    vesting_type: scenario.vesting,
    estimated_value: 625000 + Math.floor(Math.random() * 375000)
  };

  // Add cash-out if applicable
  if (scenario.cash_out) {
    data.cash_out_amount = scenario.cash_out;
  }

  // Add entity fields
  if (scenario.vesting === 'Entity') {
    data.entity_type = scenario.entity_type;
    data.entity_name = `Test ${scenario.entity_type} ${scenario.id}`;
  }

  // Add applicants
  data.applicants = [];
  for (let i = 0; i < scenario.applicants; i++) {
    data.applicants.push({
      first_name: `Borrower${i + 1}`,
      last_name: `Test${scenario.id}`,
      email: `borrower${i + 1}.${scenario.id.toLowerCase()}@test.com`,
      phone: `555010${String(i + 1).padStart(4, '0')}`,
      ssn: `${String(i + 1).padStart(3, '0')}${String(20 + i).padStart(2, '0')}${String(1000 + i).padStart(4, '0')}`,
      dob: `198${5 + i}-0${i + 1}-15`
    });
  }

  // Add assets
  data.assets = [];
  const assetTypes = ['CheckingAccount', 'SavingsAccount', 'MoneyMarketFund', 'RetirementFund', 'Stocks'];
  for (let i = 0; i < scenario.assets; i++) {
    data.assets.push({
      asset_type: assetTypes[i % assetTypes.length],
      account_balance: 10000 + Math.floor(Math.random() * 90000),
      bank_name: `Bank ${i + 1}`
    });
  }

  // Add REO properties
  data.reo_properties = [];
  for (let i = 0; i < scenario.reo; i++) {
    data.reo_properties.push({
      address_street: `${100 + i} REO Street`,
      address_city: 'Test City',
      address_state: 'CA',
      address_zip: `9${String(i).padStart(4, '0')}`,
      property_value: 300000 + Math.floor(Math.random() * 200000),
      monthly_rent: 2000 + Math.floor(Math.random() * 1000)
    });
  }

  // Add declarations
  data.declarations = {
    has_bankruptcy: scenario.bankruptcy || false,
    has_undisclosed_money: scenario.undisclosed_money || false
  };

  if (scenario.bankruptcy) {
    data.declarations.bankruptcy_chapter = scenario.bankruptcy_chapter || 'Chapter7';
    data.declarations.bankruptcy_date = scenario.bankruptcy_date || '2020-01-15';
  }

  if (scenario.undisclosed_money) {
    data.declarations.undisclosed_amount = scenario.undisclosed_amount || 10000;
  }

  // Add demographics ONLY if Individual vesting
  if (scenario.vesting === 'Individual') {
    data.demographics = {
      ethnicity: 'NotHispanicOrLatino',
      race: ['White'],
      sex: 'Male'
    };
  }

  return data;
}

// Mock export function
async function mockExport(canonicalData, packId) {
  // In production, this would call actual MISMO exporter
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xlink="http://www.w3.org/1999/xlink">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <DataVersionIdentifier>MISMO_3.4.0_B324</DataVersionIdentifier>
      <MISMOLogicalDataDictionaryIdentifier>${packId === 'PACK_B_DU_ULAD_STRICT_34_B324' ? 'MISMO_3.4.0_B324_DU_ULAD' : 'MISMO_3.4.0_B324'}</MISMOLogicalDataDictionaryIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <TERMS_OF_LOAN>
                <NoteAmount>${canonicalData.loan_amount}</NoteAmount>
                <NoteRatePercent>${canonicalData.interest_rate}</NoteRatePercent>
              </TERMS_OF_LOAN>
              <LOAN_DETAIL>
                <LoanPurposeType>${canonicalData.loan_purpose}</LoanPurposeType>
              </LOAN_DETAIL>
            </LOAN>
          </LOANS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return {
    xml,
    metadata: {
      pack_id: packId,
      export_mode: packId === 'PACK_B_DU_ULAD_STRICT_34_B324' ? 'DU_ULAD_STRICT' : 'GENERIC_MISMO_34',
      exported_at: new Date().toISOString()
    }
  };
}

// Mock validation
function mockValidation(xml, packId) {
  return {
    status: 'PASS',
    errors: [],
    warnings: [],
    pack_id: packId,
    validated_at: new Date().toISOString()
  };
}

// Mock import
async function mockImport(xml, packId) {
  // In production, parse XML and map to canonical
  return {
    loan_amount: 500000,
    loan_purpose: 'Purchase',
    interest_rate: 7.5
  };
}

// Generate diff between before/after
function generateDiff(before, after) {
  const differences = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      differences.push({
        field: key,
        before: before[key],
        after: after[key],
        diff_type: !before[key] ? 'added' : !after[key] ? 'removed' : 'changed'
      });
    }
  }

  return {
    is_identical: differences.length === 0,
    difference_count: differences.length,
    differences
  };
}

// Run round-trip test
async function runRoundTripTest(base44, scenario, packId) {
  const testCase = await generateTestCase(base44, scenario, packId);
  
  return {
    test_id: scenario.id,
    passed: testCase.passed,
    validation_status: testCase.validation_report.status,
    diff_count: testCase.diff.difference_count,
    summary: {
      export_successful: !!testCase.exported_xml,
      validation_passed: testCase.validation_report.status !== 'FAIL',
      import_successful: !!testCase.canonical_after,
      roundtrip_stable: testCase.diff.is_identical
    }
  };
}

// Run full regression suite
async function runFullRegression(base44, packId) {
  const results = {
    pack_id: packId,
    total_tests: TEST_SCENARIOS.length,
    passed: 0,
    failed: 0,
    xsd_failures: 0,
    diff_failures: 0,
    enum_failures: 0,
    test_results: [],
    started_at: new Date().toISOString()
  };

  for (const scenario of TEST_SCENARIOS) {
    const testResult = await runRoundTripTest(base44, scenario, packId);
    results.test_results.push(testResult);
    
    if (testResult.passed) {
      results.passed++;
    } else {
      results.failed++;
      
      if (testResult.validation_status === 'FAIL') {
        results.xsd_failures++;
      }
      if (testResult.diff_count > 0) {
        results.diff_failures++;
      }
    }
  }

  results.completed_at = new Date().toISOString();
  results.overall_status = results.failed === 0 ? 'PASS' : 'FAIL';

  return results;
}