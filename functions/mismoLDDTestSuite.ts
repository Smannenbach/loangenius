/**
 * MISMO LDD Mapping Test Suite
 * 100% coverage test for Business Purpose Application fields
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Complete BPA test data with all field variations
const BPA_TEST_DATA = {
  // === LOAN INFORMATION ===
  loan_amount: 500000,
  interest_rate: 7.5,
  loan_term_months: 360,
  loan_purpose: 'Purchase',
  loan_product: 'DSCR',
  amortization_type: 'fixed',
  is_interest_only: false,
  interest_only_period_months: null,
  prepay_penalty_type: '3 Year',
  prepay_penalty_term_months: 36,
  ltv: 75.0,
  dscr: 1.25,
  
  // === PROPERTY INFORMATION ===
  property_type: 'SFR',
  occupancy_type: 'Investment',
  address_street: '123 Main Street',
  address_unit: 'Unit 4B',
  address_city: 'Phoenix',
  address_state: 'AZ',
  address_zip: '85001',
  county: 'Maricopa',
  number_of_units: 1,
  year_built: 2010,
  sqft: 2500,
  lot_sqft: 5000,
  beds: 4,
  baths: 2.5,
  appraised_value: 666667,
  purchase_price: 650000,
  gross_rent_monthly: 3500,
  taxes_monthly: 350,
  insurance_monthly: 150,
  hoa_monthly: 100,
  
  // === BORROWER INFORMATION ===
  first_name: 'John',
  middle_name: 'Michael',
  last_name: 'Smith',
  suffix: 'Jr',
  email: 'john.smith@email.com',
  cell_phone: '602-555-1234',
  home_phone: '602-555-5678',
  ssn_encrypted: '123-45-6789',
  citizenship_status: 'US_Citizen',
  marital_status: 'Married',
  credit_score_est: 720,
  housing_status: 'Own',
  dependents_count: 2,
  
  // Current Address
  current_address_street: '456 Oak Avenue',
  current_address_city: 'Scottsdale',
  current_address_state: 'AZ',
  current_address_zip: '85251',
  time_at_address_years: 5,
  time_at_address_months: 3,
  
  // === ENTITY INFORMATION ===
  vesting_type: 'Entity',
  entity_type: 'LLC',
  entity_name: 'Smith Investments LLC',
  ein: '12-3456789',
  
  // === ASSETS ===
  assets: [
    { account_type: 'Checking', bank_name: 'Chase Bank', account_balance: 50000 },
    { account_type: 'Savings', bank_name: 'Wells Fargo', account_balance: 100000 },
    { account_type: 'Brokerage', bank_name: 'Fidelity', account_balance: 250000 },
  ],
};

// Test cases for enum validation
const ENUM_TEST_CASES = [
  // LoanPurposeType
  { enumType: 'LoanPurposeType', value: 'Purchase', expectedMismo: 'Purchase', shouldPass: true },
  { enumType: 'LoanPurposeType', value: 'Cash-Out', expectedMismo: 'CashOutRefinance', shouldPass: true },
  { enumType: 'LoanPurposeType', value: 'Rate & Term', expectedMismo: 'NoCashOutRefinance', shouldPass: true },
  { enumType: 'LoanPurposeType', value: 'InvalidPurpose', expectedMismo: null, shouldPass: false },
  
  // PropertyType
  { enumType: 'PropertyType', value: 'SFR', expectedMismo: 'SingleFamily', shouldPass: true },
  { enumType: 'PropertyType', value: 'Condo', expectedMismo: 'Condominium', shouldPass: true },
  { enumType: 'PropertyType', value: '2-4 Units', expectedMismo: 'TwoToFourFamily', shouldPass: true },
  { enumType: 'PropertyType', value: '5+ Units', expectedMismo: 'Multifamily', shouldPass: true },
  { enumType: 'PropertyType', value: 'InvalidProperty', expectedMismo: null, shouldPass: false },
  
  // PropertyUsageType
  { enumType: 'PropertyUsageType', value: 'Investment', expectedMismo: 'Investment', shouldPass: true },
  { enumType: 'PropertyUsageType', value: 'Primary', expectedMismo: 'PrimaryResidence', shouldPass: true },
  { enumType: 'PropertyUsageType', value: 'Secondary', expectedMismo: 'SecondHome', shouldPass: true },
  
  // AmortizationType
  { enumType: 'AmortizationType', value: 'fixed', expectedMismo: 'Fixed', shouldPass: true },
  { enumType: 'AmortizationType', value: 'arm', expectedMismo: 'AdjustableRate', shouldPass: true },
  { enumType: 'AmortizationType', value: 'io', expectedMismo: 'InterestOnly', shouldPass: true },
  
  // MortgageType
  { enumType: 'MortgageType', value: 'DSCR', expectedMismo: 'Other', shouldPass: true },
  { enumType: 'MortgageType', value: 'Conventional', expectedMismo: 'Conventional', shouldPass: true },
  { enumType: 'MortgageType', value: 'FHA', expectedMismo: 'FHA', shouldPass: true },
  
  // CitizenshipResidencyType
  { enumType: 'CitizenshipResidencyType', value: 'US_Citizen', expectedMismo: 'USCitizen', shouldPass: true },
  { enumType: 'CitizenshipResidencyType', value: 'Permanent_Resident', expectedMismo: 'PermanentResidentAlien', shouldPass: true },
  { enumType: 'CitizenshipResidencyType', value: 'Foreign_National', expectedMismo: 'NonPermanentResidentAlien', shouldPass: true },
  
  // MaritalStatusType
  { enumType: 'MaritalStatusType', value: 'Married', expectedMismo: 'Married', shouldPass: true },
  { enumType: 'MaritalStatusType', value: 'Unmarried', expectedMismo: 'Unmarried', shouldPass: true },
  { enumType: 'MaritalStatusType', value: 'Separated', expectedMismo: 'Separated', shouldPass: true },
  
  // BorrowerResidencyBasisType
  { enumType: 'BorrowerResidencyBasisType', value: 'Own', expectedMismo: 'Own', shouldPass: true },
  { enumType: 'BorrowerResidencyBasisType', value: 'Rent', expectedMismo: 'Rent', shouldPass: true },
  { enumType: 'BorrowerResidencyBasisType', value: 'Rent Free', expectedMismo: 'LivingRentFree', shouldPass: true },
  
  // PartyRoleType_Entity
  { enumType: 'PartyRoleType_Entity', value: 'LLC', expectedMismo: 'LimitedLiabilityCompany', shouldPass: true },
  { enumType: 'PartyRoleType_Entity', value: 'Corporation', expectedMismo: 'Corporation', shouldPass: true },
  { enumType: 'PartyRoleType_Entity', value: 'Trust', expectedMismo: 'Trust', shouldPass: true },
  
  // AssetType
  { enumType: 'AssetType', value: 'Checking', expectedMismo: 'CheckingAccount', shouldPass: true },
  { enumType: 'AssetType', value: 'Savings', expectedMismo: 'SavingsAccount', shouldPass: true },
  { enumType: 'AssetType', value: 'Retirement', expectedMismo: 'RetirementFund', shouldPass: true },
  
  // StateType (direct values)
  { enumType: 'StateType', value: 'AZ', expectedMismo: 'AZ', shouldPass: true },
  { enumType: 'StateType', value: 'CA', expectedMismo: 'CA', shouldPass: true },
  { enumType: 'StateType', value: 'XX', expectedMismo: null, shouldPass: false },
];

// Test cases for datatype formatting
const DATATYPE_TEST_CASES = [
  // Amount
  { datatype: 'Amount', value: 500000, expected: '500000.00', shouldPass: true },
  { datatype: 'Amount', value: '499999.99', expected: '499999.99', shouldPass: true },
  { datatype: 'Amount', value: 'invalid', expected: null, shouldPass: false },
  
  // Percent
  { datatype: 'Percent', value: 75, expected: '75.0000', shouldPass: true },
  { datatype: 'Percent', value: 7.5, expected: '7.5000', shouldPass: true },
  { datatype: 'Percent', value: 150, expected: null, shouldPass: false }, // Over 100
  
  // RatePercent
  { datatype: 'RatePercent', value: 7.5, expected: '7.5000', shouldPass: true },
  { datatype: 'RatePercent', value: 7.125, expected: '7.1250', shouldPass: true },
  
  // Date
  { datatype: 'Date', value: '2024-01-15', expected: '2024-01-15', shouldPass: true },
  { datatype: 'Date', value: new Date('2024-01-15'), expected: '2024-01-15', shouldPass: true },
  
  // Integer
  { datatype: 'Integer', value: 360, expected: '360', shouldPass: true },
  { datatype: 'Integer', value: '360', expected: '360', shouldPass: true },
  
  // Count
  { datatype: 'Count', value: 5, expected: '5', shouldPass: true },
  { datatype: 'Count', value: -1, expected: null, shouldPass: false },
  
  // Phone
  { datatype: 'Phone', value: '602-555-1234', expected: '6025551234', shouldPass: true },
  { datatype: 'Phone', value: '(602) 555-1234', expected: '6025551234', shouldPass: true },
  { datatype: 'Phone', value: '+1-602-555-1234', expected: '6025551234', shouldPass: true },
  { datatype: 'Phone', value: '555-1234', expected: null, shouldPass: false },
  
  // SSN
  { datatype: 'SSN', value: '123-45-6789', expected: '123456789', shouldPass: true },
  { datatype: 'SSN', value: '123456789', expected: '123456789', shouldPass: true },
  { datatype: 'SSN', value: '12345', expected: null, shouldPass: false },
  
  // EIN
  { datatype: 'EIN', value: '12-3456789', expected: '123456789', shouldPass: true },
  { datatype: 'EIN', value: '123456789', expected: '123456789', shouldPass: true },
  
  // PostalCode
  { datatype: 'PostalCode', value: '85001', expected: '85001', shouldPass: true },
  { datatype: 'PostalCode', value: '85001-1234', expected: '850011234', shouldPass: true },
  { datatype: 'PostalCode', value: '8500', expected: null, shouldPass: false },
  
  // StateCode
  { datatype: 'StateCode', value: 'AZ', expected: 'AZ', shouldPass: true },
  { datatype: 'StateCode', value: 'az', expected: 'AZ', shouldPass: true },
  { datatype: 'StateCode', value: 'Arizona', expected: null, shouldPass: false },
  
  // CreditScore
  { datatype: 'CreditScore', value: 720, expected: '720', shouldPass: true },
  { datatype: 'CreditScore', value: 850, expected: '850', shouldPass: true },
  { datatype: 'CreditScore', value: 299, expected: null, shouldPass: false },
  { datatype: 'CreditScore', value: 851, expected: null, shouldPass: false },
  
  // Ratio
  { datatype: 'Ratio', value: 1.25, expected: '1.2500', shouldPass: true },
  { datatype: 'Ratio', value: 0.85, expected: '0.8500', shouldPass: true },
  
  // YesNo
  { datatype: 'YesNo', value: true, expected: 'Y', shouldPass: true },
  { datatype: 'YesNo', value: false, expected: 'N', shouldPass: true },
  { datatype: 'YesNo', value: 'yes', expected: 'Y', shouldPass: true },
];

// Required_if test cases
const REQUIRED_IF_TEST_CASES = [
  {
    name: 'IO period required when is_interest_only is true',
    data: { is_interest_only: true },
    field: 'interest_only_period_months',
    shouldBeRequired: true,
  },
  {
    name: 'IO period not required when is_interest_only is false',
    data: { is_interest_only: false },
    field: 'interest_only_period_months',
    shouldBeRequired: false,
  },
  {
    name: 'Purchase price required for Purchase loans',
    data: { loan_purpose: 'Purchase' },
    field: 'purchase_price',
    shouldBeRequired: true,
  },
  {
    name: 'Purchase price not required for Refinance',
    data: { loan_purpose: 'Cash-Out' },
    field: 'purchase_price',
    shouldBeRequired: false,
  },
  {
    name: 'Entity name required when vesting is Entity',
    data: { vesting_type: 'Entity' },
    field: 'entity_name',
    shouldBeRequired: true,
  },
  {
    name: 'Entity name not required when vesting is Individual',
    data: { vesting_type: 'Individual' },
    field: 'entity_name',
    shouldBeRequired: false,
  },
  {
    name: 'Prepay term required when prepay type is not None',
    data: { prepay_penalty_type: '3 Year' },
    field: 'prepay_penalty_term_months',
    shouldBeRequired: true,
  },
  {
    name: 'Prepay term not required when prepay type is None',
    data: { prepay_penalty_type: 'None' },
    field: 'prepay_penalty_term_months',
    shouldBeRequired: false,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { test_type = 'all' } = await req.json().catch(() => ({}));

    const results = {
      timestamp: new Date().toISOString(),
      test_type,
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        coverage_percent: 0,
      },
      enum_tests: { passed: [], failed: [] },
      datatype_tests: { passed: [], failed: [] },
      required_if_tests: { passed: [], failed: [] },
      bpa_coverage: null,
    };

    // Run enum validation tests
    if (test_type === 'all' || test_type === 'enums') {
      for (const tc of ENUM_TEST_CASES) {
        const validation = await base44.functions.invoke('mismoLDDRulesEngine', {
          action: 'validate_enum',
          value: tc.value,
          enum_type: tc.enumType,
        });
        
        const result = validation.data;
        const testPassed = tc.shouldPass 
          ? (result.valid && result.value === tc.expectedMismo)
          : !result.valid;
        
        const testResult = {
          ...tc,
          actual: result.value,
          actualValid: result.valid,
          passed: testPassed,
        };
        
        if (testPassed) {
          results.enum_tests.passed.push(testResult);
        } else {
          results.enum_tests.failed.push(testResult);
        }
        results.summary.total_tests++;
      }
    }

    // Run datatype formatting tests
    if (test_type === 'all' || test_type === 'datatypes') {
      for (const tc of DATATYPE_TEST_CASES) {
        const validation = await base44.functions.invoke('mismoLDDRulesEngine', {
          action: 'format_value',
          value: tc.value,
          datatype: tc.datatype,
        });
        
        const result = validation.data;
        const testPassed = tc.shouldPass
          ? (result.valid && result.formatted === tc.expected)
          : (!result.valid || result.formatted === null);
        
        const testResult = {
          ...tc,
          actual: result.formatted,
          actualValid: result.valid,
          passed: testPassed,
        };
        
        if (testPassed) {
          results.datatype_tests.passed.push(testResult);
        } else {
          results.datatype_tests.failed.push(testResult);
        }
        results.summary.total_tests++;
      }
    }

    // Run required_if tests
    if (test_type === 'all' || test_type === 'required_if') {
      for (const tc of REQUIRED_IF_TEST_CASES) {
        // Create test data with the field missing
        const testData = { ...tc.data };
        
        const validation = await base44.functions.invoke('mismoLDDRulesEngine', {
          action: 'validate',
          data: testData,
        });
        
        const result = validation.data;
        const fieldError = result.errors?.find(e => e.field === tc.field);
        const isFieldRequired = !!fieldError;
        const testPassed = tc.shouldBeRequired === isFieldRequired;
        
        const testResult = {
          name: tc.name,
          field: tc.field,
          expectedRequired: tc.shouldBeRequired,
          actualRequired: isFieldRequired,
          passed: testPassed,
        };
        
        if (testPassed) {
          results.required_if_tests.passed.push(testResult);
        } else {
          results.required_if_tests.failed.push(testResult);
        }
        results.summary.total_tests++;
      }
    }

    // Run BPA coverage test
    if (test_type === 'all' || test_type === 'coverage') {
      const coverageResult = await base44.functions.invoke('mismoLDDRulesEngine', {
        action: 'test_mapping_coverage',
        data: BPA_TEST_DATA,
      });
      
      results.bpa_coverage = coverageResult.data;
      results.summary.coverage_percent = parseFloat(coverageResult.data.coverage_percent);
    }

    // Calculate summary
    results.summary.passed = 
      results.enum_tests.passed.length + 
      results.datatype_tests.passed.length + 
      results.required_if_tests.passed.length;
    
    results.summary.failed = 
      results.enum_tests.failed.length + 
      results.datatype_tests.failed.length + 
      results.required_if_tests.failed.length;

    results.summary.pass_rate = results.summary.total_tests > 0
      ? ((results.summary.passed / results.summary.total_tests) * 100).toFixed(1)
      : 0;

    return Response.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Test suite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});