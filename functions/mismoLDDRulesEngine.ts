/**
 * MISMO Logical Data Dictionary (LDD) Rules Engine
 * Version: 3.4 Build 324
 * 
 * Source of truth for:
 * - Enumerations (allowed values)
 * - Datatypes/formatting constraints
 * - Conditionality rules
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================================
// MISMO LDD ENUMERATION MAPS
// Internal App Values <-> MISMO Enumeration Values
// ============================================================================

const ENUM_MAPS = {
  // Loan Purpose Type
  LoanPurposeType: {
    internal_to_mismo: {
      'Purchase': 'Purchase',
      'Rate & Term': 'NoCashOutRefinance',
      'Cash-Out': 'CashOutRefinance',
      'Delayed Financing': 'CashOutRefinance',
      'Refinance': 'NoCashOutRefinance',
      'Cash-Out Refinance': 'CashOutRefinance',
      'Second Mortgage': 'SecondMortgage',
      'HELOC': 'HELOC',
      'Construction': 'ConstructionOnly',
      'Construction to Permanent': 'ConstructionToPermanent',
    },
    mismo_values: [
      'CashOutRefinance',
      'ConstructionOnly',
      'ConstructionToPermanent',
      'HELOC',
      'NoCashOutRefinance',
      'Other',
      'Purchase',
      'SecondMortgage',
    ],
  },

  // Property Type
  PropertyType: {
    internal_to_mismo: {
      'SFR': 'SingleFamily',
      'PUD Detached': 'PUDDetached',
      'PUD Attached': 'PUDAttached',
      'Condo': 'Condominium',
      'Condo (Non-Warrantable)': 'Condominium',
      '2-4 Units': 'TwoToFourFamily',
      'Log Home': 'SingleFamily',
      '3D Printed Home': 'SingleFamily',
      'Container Home': 'SingleFamily',
      'Tiny Home': 'SingleFamily',
      '5+ Units': 'Multifamily',
      'Mixed Use (51% Residential)': 'MixedUse',
      'Townhouse': 'Townhouse',
      'Manufactured': 'ManufacturedHousing',
      'Land': 'Land',
      'Commercial': 'Commercial',
      'Other': 'Other',
    },
    mismo_values: [
      'Attached',
      'Commercial',
      'Condominium',
      'Cooperative',
      'Detached',
      'HighRiseCondominium',
      'Land',
      'ManufacturedHousing',
      'ManufacturedHousingDoubleWide',
      'ManufacturedHousingSingleWide',
      'MixedUse',
      'Modular',
      'Multifamily',
      'Other',
      'PUDAttached',
      'PUDDetached',
      'SingleFamily',
      'Townhouse',
      'TwoToFourFamily',
    ],
  },

  // Occupancy Type
  PropertyUsageType: {
    internal_to_mismo: {
      'Investment': 'Investment',
      'Primary': 'PrimaryResidence',
      'Secondary': 'SecondHome',
      'Short Term': 'Investment',
      'Primary Residence': 'PrimaryResidence',
      'Investment Property': 'Investment',
      'Second Home': 'SecondHome',
      'Vacation Home': 'SecondHome',
      '2nd Home': 'SecondHome',
    },
    mismo_values: [
      'Investment',
      'PrimaryResidence',
      'SecondHome',
    ],
  },

  // Amortization Type
  AmortizationType: {
    internal_to_mismo: {
      'fixed': 'Fixed',
      'arm': 'AdjustableRate',
      'io': 'InterestOnly',
      'bridge': 'Fixed',
      'Fixed': 'Fixed',
      'ARM': 'AdjustableRate',
      'Interest Only': 'InterestOnly',
    },
    mismo_values: [
      'AdjustableRate',
      'Fixed',
      'GraduatedPaymentARM',
      'GraduatedPaymentMortgage',
      'GrowingEquityMortgage',
      'InterestOnly',
      'Other',
      'Step',
    ],
  },

  // Mortgage Type
  MortgageType: {
    internal_to_mismo: {
      'DSCR': 'Other',
      'DSCR - No Ratio': 'Other',
      'DSCR Blanket': 'Other',
      'Commercial': 'Other',
      'Hard Money': 'Other',
      'Private Money': 'Other',
      'Bridge': 'Other',
      'Fix & Flip': 'Other',
      'Multifamily': 'Other',
      'Conventional': 'Conventional',
      'FHA': 'FHA',
      'VA': 'VA',
      'USDA': 'USDA-RHS',
    },
    mismo_values: [
      'Conventional',
      'FHA',
      'FarmersHomeAdministration',
      'Other',
      'USDA-RHS',
      'VA',
    ],
  },

  // Citizenship Status
  CitizenshipResidencyType: {
    internal_to_mismo: {
      'US_Citizen': 'USCitizen',
      'Permanent_Resident': 'PermanentResidentAlien',
      'NPRA_Work_Visa': 'NonPermanentResidentAlien',
      'NPRA_ITIN': 'NonPermanentResidentAlien',
      'Foreign_National': 'NonPermanentResidentAlien',
      'us_citizen': 'USCitizen',
      'permanent_resident': 'PermanentResidentAlien',
      'non_permanent_resident': 'NonPermanentResidentAlien',
      'foreign_national': 'NonPermanentResidentAlien',
    },
    mismo_values: [
      'NonPermanentResidentAlien',
      'PermanentResidentAlien',
      'USCitizen',
    ],
  },

  // Marital Status
  MaritalStatusType: {
    internal_to_mismo: {
      'Married': 'Married',
      'Unmarried': 'Unmarried',
      'Separated': 'Separated',
      'Single': 'Unmarried',
      'Divorced': 'Unmarried',
      'Widowed': 'Unmarried',
    },
    mismo_values: [
      'Married',
      'Separated',
      'Unmarried',
    ],
  },

  // Housing Status
  BorrowerResidencyBasisType: {
    internal_to_mismo: {
      'Own': 'Own',
      'Rent': 'Rent',
      'Rent Free': 'LivingRentFree',
    },
    mismo_values: [
      'LivingRentFree',
      'Own',
      'Rent',
    ],
  },

  // Entity Type
  PartyRoleType_Entity: {
    internal_to_mismo: {
      'LLC': 'LimitedLiabilityCompany',
      'llc': 'LimitedLiabilityCompany',
      'Corporation': 'Corporation',
      'corporation': 'Corporation',
      'Corp': 'Corporation',
      's_corp': 'Corporation',
      'Trust': 'Trust',
      'trust': 'Trust',
      'GP': 'GeneralPartnership',
      'partnership': 'GeneralPartnership',
      'LP': 'LimitedPartnership',
      'individual': 'Individual',
      'Individual': 'Individual',
    },
    mismo_values: [
      'Corporation',
      'Estate',
      'GeneralPartnership',
      'GovernmentEntity',
      'Individual',
      'LimitedLiabilityCompany',
      'LimitedPartnership',
      'Trust',
    ],
  },

  // Asset Type
  AssetType: {
    internal_to_mismo: {
      'Checking': 'CheckingAccount',
      'Savings': 'SavingsAccount',
      'Money Market': 'MoneyMarketFund',
      'Brokerage': 'StocksBondsMutualFundsOther',
      'Retirement': 'RetirementFund',
      '401k': 'RetirementFund',
      'IRA': 'IndividualRetirementAccount',
      'Other': 'Other',
    },
    mismo_values: [
      'Annuity',
      'Automobile',
      'Bond',
      'BridgeLoanNotDeposited',
      'CashOnHand',
      'CashValue',
      'CertificateOfDeposit',
      'CheckingAccount',
      'EarnestMoney',
      'GiftCash',
      'GiftOfEquity',
      'Grant',
      'IndividualRetirementAccount',
      'LifeInsurance',
      'MoneyMarketFund',
      'MutualFund',
      'NetWorthOfBusinessOwned',
      'Other',
      'ProceedsFromPropertySale',
      'RelocationMoney',
      'RetirementFund',
      'SavingsAccount',
      'SecuredBorrowedFunds',
      'Stock',
      'StockOptions',
      'StocksBondsMutualFundsOther',
      'TrustFund',
    ],
  },

  // Prepay Penalty Type
  PrepaymentPenaltyOptionType: {
    internal_to_mismo: {
      'None': 'PrepaymentPenaltyOptionNotApplicable',
      '1 Year': 'PrepaymentPenaltyOptionHard',
      '2 Year': 'PrepaymentPenaltyOptionHard',
      '3 Year': 'PrepaymentPenaltyOptionHard',
      '5 Year': 'PrepaymentPenaltyOptionHard',
      'Soft': 'PrepaymentPenaltyOptionSoft',
      'Hard': 'PrepaymentPenaltyOptionHard',
    },
    mismo_values: [
      'PrepaymentPenaltyOptionHard',
      'PrepaymentPenaltyOptionNotApplicable',
      'PrepaymentPenaltyOptionSoft',
    ],
  },

  // State Codes (2-letter)
  StateType: {
    mismo_values: [
      'AA', 'AE', 'AK', 'AL', 'AP', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE',
      'FL', 'FM', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA',
      'MD', 'ME', 'MH', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
      'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'PW', 'RI', 'SC', 'SD',
      'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY',
    ],
  },

  // Yes/No Indicator
  YesNoType: {
    internal_to_mismo: {
      'true': 'Y',
      'false': 'N',
      true: 'Y',
      false: 'N',
      'yes': 'Y',
      'no': 'N',
      'Yes': 'Y',
      'No': 'N',
      1: 'Y',
      0: 'N',
    },
    mismo_values: ['Y', 'N'],
  },
};

// ============================================================================
// DATATYPE DEFINITIONS AND FORMATTERS
// ============================================================================

const DATATYPES = {
  // MISMO Amount: Decimal with 2 decimal places, no currency symbol
  Amount: {
    pattern: /^-?\d+(\.\d{1,2})?$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      if (isNaN(num)) return null;
      return num.toFixed(2);
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseFloat(value);
      return !isNaN(num);
    },
  },

  // MISMO Percent: Decimal, typically 2-4 decimal places
  Percent: {
    pattern: /^-?\d+(\.\d{1,6})?$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      if (isNaN(num)) return null;
      return num.toFixed(4);
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
  },

  // MISMO RatePercent: For interest rates, typically 3-4 decimal places
  RatePercent: {
    pattern: /^-?\d+(\.\d{1,6})?$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      if (isNaN(num)) return null;
      return num.toFixed(4);
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 50; // Reasonable rate range
    },
  },

  // MISMO Date: YYYY-MM-DD format
  Date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    format: (value) => {
      if (!value) return null;
      // Handle various date formats
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    },
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
  },

  // MISMO DateTime: ISO 8601 format
  DateTime: {
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    format: (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    },
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
  },

  // MISMO Integer
  Integer: {
    pattern: /^-?\d+$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseInt(value, 10);
      if (isNaN(num)) return null;
      return num.toString();
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number.isInteger(Number(value));
    },
  },

  // MISMO Count (non-negative integer)
  Count: {
    pattern: /^\d+$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return null;
      return num.toString();
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseInt(value, 10);
      return !isNaN(num) && num >= 0;
    },
  },

  // MISMO Phone: 10 digits, no formatting
  Phone: {
    pattern: /^\d{10}$/,
    format: (value) => {
      if (!value) return null;
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      // Handle country code prefix
      if (digits.length === 11 && digits.startsWith('1')) {
        return digits.substring(1);
      }
      if (digits.length === 10) {
        return digits;
      }
      return null;
    },
    validate: (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
    },
  },

  // MISMO SSN: 9 digits, no dashes
  SSN: {
    pattern: /^\d{9}$/,
    format: (value) => {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      if (digits.length === 9) return digits;
      return null;
    },
    validate: (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 9;
    },
  },

  // MISMO EIN: 9 digits, no dashes
  EIN: {
    pattern: /^\d{9}$/,
    format: (value) => {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      if (digits.length === 9) return digits;
      return null;
    },
    validate: (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 9;
    },
  },

  // MISMO PostalCode: 5 or 9 digits
  PostalCode: {
    pattern: /^\d{5}(-?\d{4})?$/,
    format: (value) => {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      if (digits.length === 5) return digits;
      if (digits.length === 9) return digits;
      return null;
    },
    validate: (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 5 || digits.length === 9;
    },
  },

  // MISMO State: 2-letter code
  StateCode: {
    pattern: /^[A-Z]{2}$/,
    format: (value) => {
      if (!value) return null;
      const upper = value.toUpperCase().trim();
      if (ENUM_MAPS.StateType.mismo_values.includes(upper)) {
        return upper;
      }
      return null;
    },
    validate: (value) => {
      if (!value) return true;
      return ENUM_MAPS.StateType.mismo_values.includes(value.toUpperCase().trim());
    },
  },

  // MISMO String (trimmed, max length)
  String: {
    format: (value, maxLength = 255) => {
      if (!value) return null;
      const str = String(value).trim();
      return str.length > maxLength ? str.substring(0, maxLength) : str;
    },
    validate: (value) => true,
  },

  // MISMO FICO Score
  CreditScore: {
    pattern: /^\d{3}$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 300 || num > 850) return null;
      return num.toString();
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseInt(value, 10);
      return !isNaN(num) && num >= 300 && num <= 850;
    },
  },

  // MISMO Ratio (LTV, DTI, DSCR)
  Ratio: {
    pattern: /^-?\d+(\.\d{1,4})?$/,
    format: (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      if (isNaN(num)) return null;
      return num.toFixed(4);
    },
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return !isNaN(parseFloat(value));
    },
  },

  // Boolean to Y/N
  YesNo: {
    format: (value) => {
      const mapped = ENUM_MAPS.YesNoType.internal_to_mismo[value];
      return mapped || (value ? 'Y' : 'N');
    },
    validate: (value) => true,
  },
};

// ============================================================================
// FIELD MAPPING CONFIGURATION
// Maps internal field names to MISMO elements with datatype and enum info
// ============================================================================

const FIELD_MAPPINGS = {
  // === LOAN FIELDS ===
  'loan_amount': {
    mismoPath: 'LOAN/TERMS_OF_LOAN/BaseLoanAmount',
    datatype: 'Amount',
    required: true,
  },
  'interest_rate': {
    mismoPath: 'LOAN/TERMS_OF_LOAN/NoteRatePercent',
    datatype: 'RatePercent',
    required: true,
  },
  'loan_term_months': {
    mismoPath: 'LOAN/TERMS_OF_LOAN/LoanTermMonthsCount',
    datatype: 'Count',
    required: true,
  },
  'loan_purpose': {
    mismoPath: 'LOAN/TERMS_OF_LOAN/LoanPurposeType',
    datatype: 'Enum',
    enumType: 'LoanPurposeType',
    required: true,
  },
  'loan_product': {
    mismoPath: 'LOAN/LOAN_DETAIL/MortgageType',
    datatype: 'Enum',
    enumType: 'MortgageType',
    required: true,
  },
  'amortization_type': {
    mismoPath: 'LOAN/AMORTIZATION/AmortizationType',
    datatype: 'Enum',
    enumType: 'AmortizationType',
    required: false,
  },
  'is_interest_only': {
    mismoPath: 'LOAN/INTEREST_ONLY/InterestOnlyIndicator',
    datatype: 'YesNo',
    required: false,
  },
  'interest_only_period_months': {
    mismoPath: 'LOAN/INTEREST_ONLY/InterestOnlyTermMonthsCount',
    datatype: 'Count',
    required_if: { field: 'is_interest_only', value: true },
  },
  'prepay_penalty_type': {
    mismoPath: 'LOAN/PREPAYMENT_PENALTY/PrepaymentPenaltyOptionType',
    datatype: 'Enum',
    enumType: 'PrepaymentPenaltyOptionType',
    required: false,
  },
  'prepay_penalty_term_months': {
    mismoPath: 'LOAN/PREPAYMENT_PENALTY/PrepaymentPenaltyTermMonthsCount',
    datatype: 'Count',
    required_if: { field: 'prepay_penalty_type', not_value: 'None' },
  },
  'ltv': {
    mismoPath: 'LOAN/LOAN_DETAIL/LoanToValueRatioPercent',
    datatype: 'Percent',
    required: false,
  },
  'dscr': {
    mismoPath: 'LOAN/LOAN_DETAIL/DebtServiceCoverageRatioPercent',
    datatype: 'Ratio',
    required: false,
  },

  // === PROPERTY FIELDS ===
  'property_type': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyType',
    datatype: 'Enum',
    enumType: 'PropertyType',
    required: true,
  },
  'occupancy_type': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyUsageType',
    datatype: 'Enum',
    enumType: 'PropertyUsageType',
    required: true,
  },
  'address_street': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/AddressLineText',
    datatype: 'String',
    required: true,
  },
  'address_city': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CityName',
    datatype: 'String',
    required: true,
  },
  'address_state': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/StateCode',
    datatype: 'StateCode',
    required: true,
  },
  'address_zip': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/PostalCode',
    datatype: 'PostalCode',
    required: true,
  },
  'county': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/ADDRESS/CountyName',
    datatype: 'String',
    required: false,
  },
  'number_of_units': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/FinancedUnitCount',
    datatype: 'Count',
    required: false,
  },
  'year_built': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyStructureBuiltYear',
    datatype: 'Integer',
    required: false,
  },
  'appraised_value': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_VALUATIONS/PROPERTY_VALUATION/PropertyValuationAmount',
    datatype: 'Amount',
    required: false,
  },
  'purchase_price': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/SALES_CONTRACTS/SALES_CONTRACT/SalesContractAmount',
    datatype: 'Amount',
    required_if: { field: 'loan_purpose', value: 'Purchase' },
  },
  'gross_rent_monthly': {
    mismoPath: 'COLLATERAL/SUBJECT_PROPERTY/PROPERTY_DETAIL/PropertyRentalIncomeGrossAmount',
    datatype: 'Amount',
    required: false,
  },

  // === BORROWER FIELDS ===
  'first_name': {
    mismoPath: 'PARTY/INDIVIDUAL/NAME/FirstName',
    datatype: 'String',
    required: true,
  },
  'middle_name': {
    mismoPath: 'PARTY/INDIVIDUAL/NAME/MiddleName',
    datatype: 'String',
    required: false,
  },
  'last_name': {
    mismoPath: 'PARTY/INDIVIDUAL/NAME/LastName',
    datatype: 'String',
    required: true,
  },
  'suffix': {
    mismoPath: 'PARTY/INDIVIDUAL/NAME/SuffixName',
    datatype: 'String',
    required: false,
  },
  'email': {
    mismoPath: 'PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_EMAIL/ContactPointEmailValue',
    datatype: 'String',
    required: true,
  },
  'cell_phone': {
    mismoPath: 'PARTY/INDIVIDUAL/CONTACT_POINTS/CONTACT_POINT/CONTACT_POINT_TELEPHONE/ContactPointTelephoneValue',
    datatype: 'Phone',
    required: false,
  },
  'ssn_encrypted': {
    mismoPath: 'PARTY/TAXPAYER_IDENTIFIERS/TAXPAYER_IDENTIFIER/TaxpayerIdentifierValue',
    datatype: 'SSN',
    required: false,
    sensitive: true,
  },
  'citizenship_status': {
    mismoPath: 'PARTY/INDIVIDUAL/CitizenshipResidencyType',
    datatype: 'Enum',
    enumType: 'CitizenshipResidencyType',
    required: false,
  },
  'marital_status': {
    mismoPath: 'PARTY/INDIVIDUAL/MaritalStatusType',
    datatype: 'Enum',
    enumType: 'MaritalStatusType',
    required: false,
  },
  'credit_score_est': {
    mismoPath: 'PARTY/ROLES/ROLE/BORROWER/CREDIT/CREDIT_SCORES/CREDIT_SCORE/CreditScoreValue',
    datatype: 'CreditScore',
    required: false,
  },
  'housing_status': {
    mismoPath: 'PARTY/ROLES/ROLE/BORROWER/RESIDENCES/RESIDENCE/BorrowerResidencyBasisType',
    datatype: 'Enum',
    enumType: 'BorrowerResidencyBasisType',
    required: false,
  },

  // === ENTITY FIELDS ===
  'entity_type': {
    mismoPath: 'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/LegalEntityType',
    datatype: 'Enum',
    enumType: 'PartyRoleType_Entity',
    required_if: { field: 'vesting_type', value: 'Entity' },
  },
  'entity_name': {
    mismoPath: 'PARTY/LEGAL_ENTITY/LEGAL_ENTITY_DETAIL/FullName',
    datatype: 'String',
    required_if: { field: 'vesting_type', value: 'Entity' },
  },
  'ein': {
    mismoPath: 'PARTY/TAXPAYER_IDENTIFIERS/TAXPAYER_IDENTIFIER/TaxpayerIdentifierValue',
    datatype: 'EIN',
    required_if: { field: 'vesting_type', value: 'Entity' },
  },

  // === ASSET FIELDS ===
  'account_type': {
    mismoPath: 'PARTY/ROLES/ROLE/BORROWER/CURRENT_INCOME/CURRENT_INCOME_ITEMS/CURRENT_INCOME_ITEM/IncomeType',
    datatype: 'Enum',
    enumType: 'AssetType',
    required: false,
  },
  'account_balance': {
    mismoPath: 'PARTY/ROLES/ROLE/BORROWER/ASSETS/ASSET/AssetCashOrMarketValueAmount',
    datatype: 'Amount',
    required: false,
  },
};

// ============================================================================
// REQUIRED_IF EVALUATION
// ============================================================================

function evaluateRequiredIf(condition, data) {
  if (!condition) return false;
  
  const fieldValue = data[condition.field];
  
  if (condition.value !== undefined) {
    return fieldValue === condition.value;
  }
  
  if (condition.not_value !== undefined) {
    return fieldValue !== condition.not_value && fieldValue !== null && fieldValue !== undefined;
  }
  
  if (condition.in_values !== undefined) {
    return condition.in_values.includes(fieldValue);
  }
  
  if (condition.not_empty !== undefined) {
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
  }
  
  return false;
}

// ============================================================================
// MAIN VALIDATION AND TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Validate a single value against its enum type
 */
function validateEnum(value, enumType) {
  if (!value) return { valid: true, value: null };
  
  const enumMap = ENUM_MAPS[enumType];
  if (!enumMap) {
    return { valid: false, error: `Unknown enum type: ${enumType}` };
  }
  
  // Check if it's an internal value that needs mapping
  if (enumMap.internal_to_mismo && enumMap.internal_to_mismo[value]) {
    const mismoValue = enumMap.internal_to_mismo[value];
    return { valid: true, value: mismoValue, mapped: true };
  }
  
  // Check if it's already a valid MISMO value
  if (enumMap.mismo_values && enumMap.mismo_values.includes(value)) {
    return { valid: true, value: value, mapped: false };
  }
  
  return {
    valid: false,
    error: `Invalid value "${value}" for ${enumType}. Valid MISMO values: ${enumMap.mismo_values?.join(', ')}`,
    value: null,
  };
}

/**
 * Format a value according to its datatype
 */
function formatValue(value, datatype, options = {}) {
  const dt = DATATYPES[datatype];
  if (!dt) {
    return { formatted: value, valid: true };
  }
  
  const formatted = dt.format(value, options.maxLength);
  const valid = dt.validate(value);
  
  return { formatted, valid };
}

/**
 * Validate and transform a complete data object
 */
function validateAndTransform(data, fieldMappings = FIELD_MAPPINGS) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    transformed: {},
    mismoMapped: {},
  };
  
  for (const [fieldName, config] of Object.entries(fieldMappings)) {
    const value = data[fieldName];
    
    // Check required fields
    const isRequired = config.required || 
      (config.required_if && evaluateRequiredIf(config.required_if, data));
    
    if (isRequired && (value === null || value === undefined || value === '')) {
      result.errors.push({
        field: fieldName,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Required field "${fieldName}" is missing`,
        mismoPath: config.mismoPath,
      });
      result.valid = false;
      continue;
    }
    
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // Handle enum types
    if (config.datatype === 'Enum' && config.enumType) {
      const enumResult = validateEnum(value, config.enumType);
      if (!enumResult.valid) {
        result.errors.push({
          field: fieldName,
          code: 'INVALID_ENUM_VALUE',
          message: enumResult.error,
          mismoPath: config.mismoPath,
          value: value,
        });
        result.valid = false;
      } else {
        result.transformed[fieldName] = enumResult.value;
        result.mismoMapped[config.mismoPath] = enumResult.value;
      }
      continue;
    }
    
    // Handle other datatypes
    const formatResult = formatValue(value, config.datatype);
    if (!formatResult.valid) {
      result.errors.push({
        field: fieldName,
        code: 'INVALID_DATATYPE',
        message: `Invalid format for "${fieldName}". Expected ${config.datatype}.`,
        mismoPath: config.mismoPath,
        value: value,
      });
      result.valid = false;
    } else if (formatResult.formatted === null && value !== null) {
      result.warnings.push({
        field: fieldName,
        code: 'FORMAT_CONVERSION_FAILED',
        message: `Could not convert "${fieldName}" value "${value}" to ${config.datatype}`,
        mismoPath: config.mismoPath,
      });
    } else {
      result.transformed[fieldName] = formatResult.formatted;
      result.mismoMapped[config.mismoPath] = formatResult.formatted;
    }
  }
  
  return result;
}

/**
 * Get all enum values for a given type
 */
function getEnumValues(enumType) {
  const enumMap = ENUM_MAPS[enumType];
  if (!enumMap) return null;
  return {
    internalValues: enumMap.internal_to_mismo ? Object.keys(enumMap.internal_to_mismo) : [],
    mismoValues: enumMap.mismo_values || [],
  };
}

/**
 * Map a single internal value to MISMO
 */
function mapToMISMO(value, enumType) {
  const enumMap = ENUM_MAPS[enumType];
  if (!enumMap || !enumMap.internal_to_mismo) return value;
  return enumMap.internal_to_mismo[value] || value;
}

// ============================================================================
// API HANDLER
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, data, field, value, enum_type } = body;

    switch (action) {
      case 'validate':
        // Validate complete data object
        const validationResult = validateAndTransform(data || {});
        return Response.json({
          success: true,
          ...validationResult,
        });

      case 'validate_enum':
        // Validate a single enum value
        const enumResult = validateEnum(value, enum_type);
        return Response.json({
          success: true,
          ...enumResult,
        });

      case 'format_value':
        // Format a single value
        const formatResult = formatValue(value, body.datatype, body.options);
        return Response.json({
          success: true,
          ...formatResult,
        });

      case 'get_enum_values':
        // Get all values for an enum type
        const enumValues = getEnumValues(enum_type);
        return Response.json({
          success: true,
          enum_type,
          values: enumValues,
        });

      case 'get_all_enums':
        // Get all enum definitions
        const allEnums = {};
        for (const [key, val] of Object.entries(ENUM_MAPS)) {
          allEnums[key] = {
            internalValues: val.internal_to_mismo ? Object.keys(val.internal_to_mismo) : [],
            mismoValues: val.mismo_values || [],
          };
        }
        return Response.json({
          success: true,
          enums: allEnums,
        });

      case 'get_field_mappings':
        // Get all field mapping definitions
        return Response.json({
          success: true,
          mappings: FIELD_MAPPINGS,
        });

      case 'map_to_mismo':
        // Map a single value
        const mappedValue = mapToMISMO(value, enum_type);
        return Response.json({
          success: true,
          original: value,
          mismo_value: mappedValue,
        });

      case 'test_mapping_coverage':
        // Test mapping coverage for BPA fields
        const bpaTestResult = runBPAMappingTest(data || {});
        return Response.json({
          success: true,
          ...bpaTestResult,
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('LDD Rules Engine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Run comprehensive BPA field mapping test
 */
function runBPAMappingTest(testData) {
  const bpaFields = [
    // Loan fields
    'loan_amount', 'interest_rate', 'loan_term_months', 'loan_purpose', 'loan_product',
    'amortization_type', 'is_interest_only', 'interest_only_period_months',
    'prepay_penalty_type', 'prepay_penalty_term_months', 'ltv', 'dscr',
    // Property fields
    'property_type', 'occupancy_type', 'address_street', 'address_city',
    'address_state', 'address_zip', 'county', 'number_of_units', 'year_built',
    'appraised_value', 'purchase_price', 'gross_rent_monthly',
    // Borrower fields
    'first_name', 'middle_name', 'last_name', 'suffix', 'email', 'cell_phone',
    'ssn_encrypted', 'citizenship_status', 'marital_status', 'credit_score_est',
    'housing_status',
    // Entity fields
    'entity_type', 'entity_name', 'ein',
    // Asset fields
    'account_type', 'account_balance',
  ];

  const coverage = {
    total_fields: bpaFields.length,
    mapped_fields: 0,
    unmapped_fields: [],
    field_details: [],
  };

  for (const field of bpaFields) {
    const mapping = FIELD_MAPPINGS[field];
    if (mapping) {
      coverage.mapped_fields++;
      coverage.field_details.push({
        field,
        mapped: true,
        mismoPath: mapping.mismoPath,
        datatype: mapping.datatype,
        enumType: mapping.enumType || null,
        required: mapping.required || false,
        required_if: mapping.required_if || null,
      });
    } else {
      coverage.unmapped_fields.push(field);
      coverage.field_details.push({
        field,
        mapped: false,
      });
    }
  }

  coverage.coverage_percent = ((coverage.mapped_fields / coverage.total_fields) * 100).toFixed(1);

  // If test data provided, validate it
  if (testData && Object.keys(testData).length > 0) {
    coverage.validation_result = validateAndTransform(testData);
  }

  return coverage;
}