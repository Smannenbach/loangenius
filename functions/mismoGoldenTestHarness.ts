/**
 * MISMO Golden Test Pack + Round-Trip Harness
 * 
 * Generates 30+ test cases and validates:
 * - Export produces XSD-valid XML
 * - Import parses correctly
 * - Round-trip (Export -> Import -> Export) produces identical output
 * 
 * Test Coverage:
 * - Purchase / Rate&Term / Cash-Out / Delayed Financing
 * - Individual vesting vs Entity (Corp/GP/LLC/Trust)
 * - 0/1/2 applicants
 * - Assets: 0, 1, 5 rows
 * - REO: 0, 2, 6, 9 rows
 * - Declarations: bankruptcy yes/no, undisclosed money yes/no
 * - Demographics gating for individual vesting only
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// TEST CASE TEMPLATES
// ============================================================

const LOAN_PURPOSE_VARIANTS = ['Purchase', 'Rate & Term', 'Cash-Out', 'Delayed Financing'];
const VESTING_VARIANTS = ['Individual', 'Entity'];
const ENTITY_TYPES = ['Corporation', 'GeneralPartnership', 'LimitedLiabilityCompany', 'Trust'];
const APPLICANT_COUNTS = [0, 1, 2];
const ASSET_COUNTS = [0, 1, 5];
const REO_COUNTS = [0, 2, 6, 9];

// Base test case data
const BASE_TEST_DATA = {
  deal_number: 'LG-TEST-001',
  loan_amount: 500000,
  interest_rate: 7.25,
  loan_term_months: 360,
  property_street: '123 Test Street',
  property_city: 'Los Angeles',
  property_state: 'CA',
  property_zip: '90001',
  property_county: 'Los Angeles',
  property_type: 'Detached',
  occupancy_type: 'Investment',
  appraised_value: 650000,
  purchase_price: 600000,
  dscr: 1.25,
  is_business_purpose_loan: true
};

const INDIVIDUAL_BORROWER = {
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'Q',
  dob: '1980-01-15',
  ssn: '123456789',
  email: 'john.doe@test.com',
  phone: '+15551234567',
  citizenship_status: 'USCitizen',
  marital_status: 'Married'
};

const CO_BORROWER = {
  first_name: 'Jane',
  last_name: 'Doe',
  middle_name: 'M',
  dob: '1982-03-20',
  ssn: '987654321',
  email: 'jane.doe@test.com',
  phone: '+15559876543',
  citizenship_status: 'USCitizen',
  marital_status: 'Married'
};

const ENTITY_DATA = {
  entity_name: 'Test Holdings LLC',
  entity_type: 'LimitedLiabilityCompany',
  entity_ein: '12-3456789',
  entity_formation_date: '2020-01-01',
  entity_formation_state: 'DE'
};

const SAMPLE_ASSET = {
  asset_type: 'CheckingAccount',
  institution_name: 'Test Bank',
  account_number: '****1234',
  market_value: 50000
};

const SAMPLE_REO = {
  property_street: '456 Investment Ave',
  property_city: 'Phoenix',
  property_state: 'AZ',
  property_zip: '85001',
  property_type: 'Detached',
  market_value: 300000,
  monthly_rent: 2000,
  mortgage_balance: 200000
};

const DECLARATIONS_BANKRUPTCY = {
  has_bankruptcy: true,
  bankruptcy_chapter: 'Chapter7',
  bankruptcy_date: '2015-06-01'
};

const DECLARATIONS_UNDISCLOSED = {
  has_undisclosed_money: true,
  undisclosed_money_amount: 50000,
  undisclosed_money_source: 'Gift'
};

const DEMOGRAPHICS_INDIVIDUAL = {
  ethnicity: 'NotHispanicOrLatino',
  race: 'White',
  sex: 'Male'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, pack_id, test_case_id, canonical_data } = body;

    // ACTION: Generate all test cases
    if (action === 'generate_test_cases') {
      const testCases = generateAllTestCases();
      return Response.json({
        success: true,
        test_cases: testCases,
        total_count: testCases.length
      });
    }

    // ACTION: Run single test case
    if (action === 'run_test_case') {
      const effectivePackId = pack_id || 'PACK_A_GENERIC_MISMO_34_B324';
      const result = await runTestCase(base44, canonical_data, effectivePackId);
      return Response.json({
        success: true,
        result
      });
    }

    // ACTION: Run full test suite
    if (action === 'run_full_suite') {
      const effectivePackId = pack_id || 'PACK_A_GENERIC_MISMO_34_B324';
      const results = await runFullTestSuite(base44, effectivePackId);
      return Response.json({
        success: true,
        results
      });
    }

    // ACTION: Validate round-trip
    if (action === 'validate_round_trip') {
      const { xml_before, xml_after } = body;
      const diff = computeDiff(xml_before, xml_after);
      return Response.json({
        success: true,
        round_trip_valid: diff.length === 0,
        diff
      });
    }

    // ACTION: Get test case by ID
    if (action === 'get_test_case') {
      const testCases = generateAllTestCases();
      const testCase = testCases.find(tc => tc.id === test_case_id);
      if (!testCase) {
        return Response.json({ error: 'Test case not found' }, { status: 404 });
      }
      return Response.json({
        success: true,
        test_case: testCase
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Golden Test Harness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ============================================================
// TEST CASE GENERATION
// ============================================================

function generateAllTestCases() {
  const testCases = [];
  let caseId = 1;

  // Generate test cases for each combination
  for (const purpose of LOAN_PURPOSE_VARIANTS) {
    for (const vesting of VESTING_VARIANTS) {
      // For Entity vesting, test each entity type
      const entityTypes = vesting === 'Entity' ? ENTITY_TYPES : [null];
      
      for (const entityType of entityTypes) {
        // Test different applicant counts
        for (const applicantCount of APPLICANT_COUNTS) {
          // Skip invalid combos: Entity with multiple applicants handled differently
          if (vesting === 'Entity' && applicantCount > 1) continue;
          
          // Create test case
          const testCase = createTestCase(
            caseId++,
            purpose,
            vesting,
            entityType,
            applicantCount,
            0, // assets
            0, // REO
            false, // bankruptcy
            false  // undisclosed money
          );
          testCases.push(testCase);
        }
      }
    }
  }

  // Add asset variation tests
  for (const assetCount of ASSET_COUNTS) {
    if (assetCount === 0) continue; // Already covered
    const testCase = createTestCase(
      caseId++,
      'Purchase',
      'Individual',
      null,
      1,
      assetCount,
      0,
      false,
      false
    );
    testCase.name = `Assets Test - ${assetCount} assets`;
    testCases.push(testCase);
  }

  // Add REO variation tests
  for (const reoCount of REO_COUNTS) {
    if (reoCount === 0) continue; // Already covered
    const testCase = createTestCase(
      caseId++,
      'Cash-Out',
      'Individual',
      null,
      1,
      0,
      reoCount,
      false,
      false
    );
    testCase.name = `REO Test - ${reoCount} properties`;
    testCases.push(testCase);
  }

  // Add declaration tests
  // Bankruptcy yes
  const bankruptcyTest = createTestCase(
    caseId++,
    'Rate & Term',
    'Individual',
    null,
    1,
    1,
    0,
    true,
    false
  );
  bankruptcyTest.name = 'Declarations - Bankruptcy Yes';
  testCases.push(bankruptcyTest);

  // Undisclosed money yes
  const undisclosedTest = createTestCase(
    caseId++,
    'Purchase',
    'Individual',
    null,
    1,
    1,
    0,
    false,
    true
  );
  undisclosedTest.name = 'Declarations - Undisclosed Money Yes';
  testCases.push(undisclosedTest);

  // Both declarations
  const bothDeclTest = createTestCase(
    caseId++,
    'Cash-Out',
    'Individual',
    null,
    1,
    2,
    2,
    true,
    true
  );
  bothDeclTest.name = 'Declarations - Bankruptcy + Undisclosed Money';
  testCases.push(bothDeclTest);

  // Demographics test (Individual only)
  const demographicsTest = createTestCase(
    caseId++,
    'Purchase',
    'Individual',
    null,
    2,
    3,
    2,
    false,
    false
  );
  demographicsTest.name = 'Full Application - Demographics Included';
  demographicsTest.canonical_data.include_demographics = true;
  demographicsTest.canonical_data = {
    ...demographicsTest.canonical_data,
    ...DEMOGRAPHICS_INDIVIDUAL
  };
  testCases.push(demographicsTest);

  return testCases;
}

function createTestCase(id, purpose, vesting, entityType, applicantCount, assetCount, reoCount, hasBankruptcy, hasUndisclosedMoney) {
  const canonical = {
    ...BASE_TEST_DATA,
    deal_number: `LG-TEST-${String(id).padStart(3, '0')}`,
    loan_purpose: purpose,
    vesting_type: vesting
  };

  // Add borrower data based on vesting type
  if (vesting === 'Individual') {
    canonical.first_name = INDIVIDUAL_BORROWER.first_name;
    canonical.last_name = INDIVIDUAL_BORROWER.last_name;
    canonical.middle_name = INDIVIDUAL_BORROWER.middle_name;
    canonical.dob = INDIVIDUAL_BORROWER.dob;
    canonical.ssn = INDIVIDUAL_BORROWER.ssn;
    canonical.email = INDIVIDUAL_BORROWER.email;
    canonical.phone = INDIVIDUAL_BORROWER.phone;
    canonical.citizenship_status = INDIVIDUAL_BORROWER.citizenship_status;
    canonical.marital_status = INDIVIDUAL_BORROWER.marital_status;

    // Add co-borrower if applicantCount > 1
    if (applicantCount > 1) {
      canonical.borrowers = [CO_BORROWER];
    }
  } else {
    // Entity vesting
    canonical.entity_name = ENTITY_DATA.entity_name;
    canonical.entity_type = entityType || ENTITY_DATA.entity_type;
    canonical.entity_ein = ENTITY_DATA.entity_ein;
    canonical.entity_formation_date = ENTITY_DATA.entity_formation_date;
    canonical.entity_formation_state = ENTITY_DATA.entity_formation_state;
  }

  // Add assets
  canonical.assets = [];
  for (let i = 0; i < assetCount; i++) {
    canonical.assets.push({
      ...SAMPLE_ASSET,
      sequence_number: i + 1,
      market_value: SAMPLE_ASSET.market_value + (i * 10000)
    });
  }

  // Add REO properties
  canonical.reo_properties = [];
  for (let i = 0; i < reoCount; i++) {
    canonical.reo_properties.push({
      ...SAMPLE_REO,
      sequence_number: i + 1,
      property_street: `${i + 100} Investment Ave Unit ${i + 1}`
    });
  }

  // Add declarations
  canonical.declarations = {};
  if (hasBankruptcy) {
    canonical.declarations = { ...canonical.declarations, ...DECLARATIONS_BANKRUPTCY };
  }
  if (hasUndisclosedMoney) {
    canonical.declarations = { ...canonical.declarations, ...DECLARATIONS_UNDISCLOSED };
  }

  // Cash-out specific
  if (purpose === 'Cash-Out' || purpose === 'Delayed Financing') {
    canonical.cash_out_amount = 50000;
  }

  return {
    id: `TC-${String(id).padStart(3, '0')}`,
    name: `${purpose} - ${vesting}${entityType ? ` (${entityType})` : ''} - ${applicantCount} applicant(s)`,
    description: `Test case: ${purpose}, ${vesting} vesting, ${applicantCount} applicants, ${assetCount} assets, ${reoCount} REO`,
    canonical_data: canonical,
    expected: {
      xsd_valid: true,
      round_trip_stable: true,
      diff_empty: true
    }
  };
}

// ============================================================
// TEST EXECUTION
// ============================================================

async function runTestCase(base44, canonicalData, packId) {
  const artifacts = {
    canonical_before: canonicalData,
    exported_xml: null,
    validation_report: null,
    canonical_after: null,
    diff: null
  };

  const result = {
    test_id: canonicalData.deal_number,
    pack_id: packId,
    started_at: new Date().toISOString(),
    status: 'running',
    xsd_valid: false,
    round_trip_stable: false,
    diff_empty: false,
    errors: [],
    artifacts
  };

  try {
    // Step 1: Export to XML
    const exportResponse = await base44.asServiceRole.functions.invoke('mismoDeterministicExporter', {
      action: 'export',
      canonical_data: canonicalData,
      pack_id: packId
    });

    if (!exportResponse.data?.success) {
      result.errors.push({ step: 'export', message: 'Export failed' });
      result.status = 'failed';
      return result;
    }

    artifacts.exported_xml = exportResponse.data.xml_content;

    // Step 2: Validate XML
    const validateResponse = await base44.asServiceRole.functions.invoke('mismoSchemaPackManager', {
      action: 'validate_xml',
      xml_content: artifacts.exported_xml,
      pack_id: packId
    });

    artifacts.validation_report = validateResponse.data?.validation;
    result.xsd_valid = validateResponse.data?.validation?.status !== 'FAIL';

    if (!result.xsd_valid) {
      result.errors.push({ 
        step: 'validation', 
        message: 'XSD validation failed',
        details: validateResponse.data?.validation?.errors?.slice(0, 5)
      });
    }

    // Step 3: Import XML back to canonical
    const importResponse = await base44.asServiceRole.functions.invoke('mismoImportMapper', {
      action: 'import',
      xml_content: artifacts.exported_xml,
      pack_id: packId
    });

    if (importResponse.data?.success) {
      artifacts.canonical_after = importResponse.data?.import_result?.mapped_fields;
    }

    // Step 4: Export again for round-trip comparison
    if (artifacts.canonical_after) {
      const reexportResponse = await base44.asServiceRole.functions.invoke('mismoDeterministicExporter', {
        action: 'export',
        canonical_data: artifacts.canonical_after,
        pack_id: packId
      });

      if (reexportResponse.data?.success) {
        // Compare first and second export
        artifacts.diff = computeDiff(artifacts.exported_xml, reexportResponse.data.xml_content);
        result.diff_empty = artifacts.diff.length === 0;
        result.round_trip_stable = result.diff_empty;
      }
    }

    // Determine final status
    result.status = result.xsd_valid && result.round_trip_stable ? 'passed' : 'failed';
    result.finished_at = new Date().toISOString();

  } catch (error) {
    result.status = 'error';
    result.errors.push({ step: 'execution', message: error.message });
    result.finished_at = new Date().toISOString();
  }

  return result;
}

async function runFullTestSuite(base44, packId) {
  const testCases = generateAllTestCases();
  const results = {
    pack_id: packId,
    started_at: new Date().toISOString(),
    total_cases: testCases.length,
    passed: 0,
    failed: 0,
    errors: 0,
    test_results: []
  };

  for (const testCase of testCases) {
    const result = await runTestCase(base44, testCase.canonical_data, packId);
    result.test_case_id = testCase.id;
    result.test_case_name = testCase.name;
    results.test_results.push(result);

    if (result.status === 'passed') {
      results.passed++;
    } else if (result.status === 'failed') {
      results.failed++;
    } else {
      results.errors++;
    }
  }

  results.finished_at = new Date().toISOString();
  results.overall_status = results.failed === 0 && results.errors === 0 ? 'PASS' : 'FAIL';

  return results;
}

// ============================================================
// DIFF COMPUTATION
// ============================================================

function computeDiff(xmlBefore, xmlAfter) {
  const diff = [];

  if (!xmlBefore || !xmlAfter) {
    diff.push({ type: 'missing', message: 'One or both XMLs are missing' });
    return diff;
  }

  // Normalize both XMLs for comparison
  const normalizedBefore = normalizeXml(xmlBefore);
  const normalizedAfter = normalizeXml(xmlAfter);

  if (normalizedBefore === normalizedAfter) {
    return []; // Identical
  }

  // Find first difference
  const linesBefore = normalizedBefore.split('\n');
  const linesAfter = normalizedAfter.split('\n');

  const maxLines = Math.max(linesBefore.length, linesAfter.length);
  
  for (let i = 0; i < maxLines; i++) {
    const lineBefore = linesBefore[i] || '';
    const lineAfter = linesAfter[i] || '';

    if (lineBefore !== lineAfter) {
      diff.push({
        line: i + 1,
        type: 'difference',
        before: lineBefore.substring(0, 100),
        after: lineAfter.substring(0, 100)
      });

      // Limit diff output
      if (diff.length >= 10) {
        diff.push({ type: 'truncated', message: 'Additional differences not shown' });
        break;
      }
    }
  }

  return diff;
}

function normalizeXml(xml) {
  if (!xml) return '';
  
  return xml
    // Remove timestamps and UUIDs (they change between runs)
    .replace(/<MessageDatetime>[^<]+<\/MessageDatetime>/g, '<MessageDatetime>NORMALIZED</MessageDatetime>')
    .replace(/<MessageIdentifier>[^<]+<\/MessageIdentifier>/g, '<MessageIdentifier>NORMALIZED</MessageIdentifier>')
    .replace(/LG-[a-f0-9-]+/gi, 'LG-NORMALIZED')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}