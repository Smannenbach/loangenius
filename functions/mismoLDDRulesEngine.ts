import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO LDD Rules Engine
// Validates enums, datatypes, and conditional logic BEFORE XML generation

// Complete LDD Enum Definitions per MISMO 3.4 B324
const LDD_ENUMS = {
  // Loan Purpose
  'LoanPurposeType': [
    'Purchase', 'Refinance', 'CashOutRefinance', 'NoCashOutRefinance', 
    'ConstructionOnly', 'ConstructionToPermanent', 'HomeEquityLineOfCredit',
    'Other', 'SecondLien', 'Unknown'
  ],
  
  // Property Usage
  'PropertyUsageType': [
    'Investment', 'PrimaryResidence', 'SecondHome', 'Other'
  ],
  
  // Property Type
  'PropertyEstateType': [
    'FeeSimple', 'Leasehold', 'Other'
  ],
  
  'ConstructionMethodType': [
    'Manufactured', 'ManufacturedHousing', 'Modular', 'SiteBuilt', 'Other'
  ],
  
  'PropertyType': [
    'Attached', 'Condominium', 'Cooperative', 'Detached', 'HighRiseCondominium',
    'ManufacturedHousing', 'ManufacturedHousingSingleWide', 'ManufacturedHousingDoubleWide',
    'ManufacturedHousingMultiWide', 'Modular', 'PUD', 'Townhouse', 'Other'
  ],
  
  // Legal Entity Types
  'LegalEntityType': [
    'Corporation', 'CorporationSoleProprietorship', 'Estate', 'GeneralPartnership',
    'GovernmentEntity', 'Joint', 'LimitedLiabilityCompany', 'LimitedLiabilityPartnership',
    'LimitedPartnership', 'NativeAmericanTribe', 'NonProfitCorporation', 'Partnership',
    'PubliclyTradedCompany', 'RealEstateInvestmentTrust', 'SCorporation', 'SoleProprietorship',
    'Trust', 'Other'
  ],
  
  // Borrower Classification
  'BorrowerClassificationType': [
    'Primary', 'Secondary', 'CoSigner', 'Guarantor'
  ],
  
  // Citizenship/Residency
  'CitizenshipResidencyType': [
    'NonPermanentResidentAlien', 'NonResidentAlien', 'PermanentResidentAlien',
    'Unknown', 'USCitizen'
  ],
  
  // Marital Status
  'MaritalStatusType': [
    'Married', 'NotProvided', 'Separated', 'Unmarried', 'Unknown'
  ],
  
  // Title Holding
  'TitleHoldingType': [
    'CommunityProperty', 'CommunityPropertyWithRightOfSurvivorship',
    'JointWithRightOfSurvivorship', 'LivingTrust', 'Other', 
    'SoleOwnership', 'TenantInCommon'
  ],
  
  // Asset Types
  'AssetType': [
    'Bond', 'BridgeLoanNotDeposited', 'CashOnHand', 'CertificateOfDeposit',
    'CheckingAccount', 'EarnestMoney', 'GiftOfEquity', 'GrantOfEquity',
    'IndividualDevelopmentAccount', 'LifeInsurance', 'MoneyMarketFund',
    'MutualFund', 'NetWorthOfBusinessOwned', 'Other', 'PendingNetSaleProceedsFromRealEstateAssets',
    'ProceedsFromSaleOfNonRealEstateAsset', 'ProceedsFromSecuredLoan',
    'ProceedsFromUnsecuredLoan', 'RelocationMoney', 'RetirementFund',
    'SavingsAccount', 'SecuredBorrowedFunds', 'StockOptions', 'Stocks',
    'TrustAccount', 'UnsecuredBorrowedFunds'
  ],
  
  // Income Types
  'IncomeType': [
    'AccessoryUnitIncome', 'AlimonyChildSupport', 'AutomobileAllowance',
    'Base', 'BoarderIncome', 'Bonus', 'CapitalGains', 'Commission',
    'ContractBasis', 'DefinedContributionPlan', 'Disability', 'DividendsInterest',
    'EmploymentRelatedAccount', 'ForeignIncome', 'HousingAllowance', 'MilitaryBasePay',
    'MilitaryCombatPay', 'MilitaryClothesAllowance', 'MilitaryFlightPay',
    'MilitaryHazardPay', 'MilitaryOverseasPay', 'MilitaryPropPay',
    'MilitaryQuartersAllowance', 'MilitaryRationsAllowance', 'MilitaryVariableHousingAllowance',
    'MortgageCreditCertificate', 'MortgageDifferential', 'NetRentalIncome',
    'NonBorrowerContribution', 'NonBorrowerHouseholdIncome', 'NotesReceivableInstallment',
    'Other', 'Overtime', 'Pension', 'ProposedGrossRentForSubjectProperty',
    'PublicAssistance', 'RealEstateOwnedGrossRentalIncome', 'Royalties',
    'SelfEmployment', 'SocialSecurity', 'TemporaryLeave', 'TipIncome',
    'Trust', 'Unemployment', 'VABenefitsNonEducational'
  ],
  
  // Loan Types
  'MortgageType': [
    'Conventional', 'FHA', 'LocalAgency', 'Other', 'PublicAndIndianHousing',
    'StateAgency', 'USDA', 'VA'
  ],
  
  // Amortization Types
  'AmortizationType': [
    'AdjustableRate', 'Fixed', 'GEM', 'GPM', 'GraduatedPaymentARM',
    'Other', 'RateImprovementMortgage', 'Step'
  ],
  
  // Document Types
  'DocumentType': [
    'Appraisal', 'BankStatement', 'CreditReport', 'DriversLicense',
    'FloodCertification', 'HazardInsurance', 'LeaseAgreement', 'MortgageNote',
    'Other', 'Passport', 'PayStub', 'PurchaseContract', 'TaxReturn',
    'TitleInsurance', 'W2'
  ]
};

// Datatype Validation Rules
const DATATYPE_RULES = {
  'currency': {
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    },
    format: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? null : num.toFixed(2);
    },
    description: 'Positive decimal number with 2 decimal places'
  },
  'percent': {
    validate: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    format: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? null : (num / 100).toFixed(6); // MISMO uses decimal percent
    },
    description: 'Decimal 0-1 (e.g., 7.5% = 0.075)'
  },
  'date': {
    validate: (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    format: (value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },
    description: 'ISO 8601 date format (YYYY-MM-DD)'
  },
  'phone': {
    validate: (value) => {
      if (!value) return true; // Optional field
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10;
    },
    format: (value) => {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) {
        return `+1${digits}`; // E.164 format
      } else if (digits.length === 11 && digits[0] === '1') {
        return `+${digits}`;
      }
      return value;
    },
    description: 'E.164 format (+1XXXXXXXXXX)'
  },
  'ssn': {
    validate: (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 9;
    },
    format: (value) => {
      if (!value) return null;
      const digits = value.replace(/\D/g, '');
      return digits; // Store as plain digits, encrypt at rest
    },
    description: '9-digit number (no dashes)'
  },
  'zip': {
    validate: (value) => {
      if (!value) return false;
      const cleaned = value.replace(/\D/g, '');
      return cleaned.length === 5 || cleaned.length === 9;
    },
    format: (value) => {
      if (!value) return null;
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length === 9) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
      }
      return cleaned.slice(0, 5);
    },
    description: '5 or 9 digit ZIP code'
  },
  'state': {
    validate: (value) => {
      if (!value) return false;
      const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','AS'];
      return states.includes(value.toUpperCase());
    },
    format: (value) => value?.toUpperCase(),
    description: 'Two-letter US state code'
  }
};

// Conditional Required Field Rules
const CONDITIONAL_RULES = [
  {
    id: 'cashout_amount_for_cashout_refi',
    condition: (data) => data.loan_purpose === 'CashOutRefinance',
    required_field: 'cash_out_amount',
    message: 'Cash-out amount is required for Cash-Out Refinance'
  },
  {
    id: 'entity_name_for_entity_vesting',
    condition: (data) => data.vesting_type === 'Entity',
    required_field: 'entity_name',
    message: 'Entity name is required when vesting as an entity'
  },
  {
    id: 'entity_type_for_entity_vesting',
    condition: (data) => data.vesting_type === 'Entity',
    required_field: 'entity_type',
    message: 'Entity type is required when vesting as an entity'
  },
  {
    id: 'bankruptcy_chapter_for_bankruptcy_yes',
    condition: (data) => data.has_bankruptcy === true || data.has_bankruptcy === 'yes',
    required_field: 'bankruptcy_chapter',
    message: 'Bankruptcy chapter is required when bankruptcy is declared'
  },
  {
    id: 'rental_income_for_investment',
    condition: (data) => data.occupancy_type === 'Investment',
    required_field: 'gross_rent_monthly',
    message: 'Monthly rental income is recommended for investment properties'
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, field_name, field_value, datatype, canonical_data, pack_id } = await req.json();

    // ACTION: Validate enum
    if (action === 'validate_enum') {
      const allowed = LDD_ENUMS[field_name];
      if (!allowed) {
        return Response.json({
          success: true,
          is_valid: true, // Unknown enum type, allow it
          message: 'Field not in LDD enum registry (allowed)'
        });
      }
      
      const isValid = allowed.includes(field_value);
      return Response.json({
        success: true,
        is_valid: isValid,
        field_name,
        field_value,
        allowed_values: allowed,
        message: isValid ? 'Valid enum value' : `Invalid value '${field_value}'. Allowed: ${allowed.join(', ')}`
      });
    }

    // ACTION: Validate and format datatype
    if (action === 'validate_datatype') {
      const rule = DATATYPE_RULES[datatype];
      if (!rule) {
        return Response.json({
          success: true,
          is_valid: true,
          formatted_value: field_value,
          message: 'Unknown datatype, passed through'
        });
      }

      const isValid = rule.validate(field_value);
      const formatted = isValid ? rule.format(field_value) : null;

      return Response.json({
        success: true,
        is_valid: isValid,
        original_value: field_value,
        formatted_value: formatted,
        datatype,
        description: rule.description,
        message: isValid ? 'Valid datatype' : `Invalid ${datatype}: ${rule.description}`
      });
    }

    // ACTION: Get all enums
    if (action === 'list_enums') {
      return Response.json({
        success: true,
        enums: LDD_ENUMS
      });
    }

    // ACTION: Get all datatype rules
    if (action === 'list_datatypes') {
      const datatypes = {};
      for (const [key, rule] of Object.entries(DATATYPE_RULES)) {
        datatypes[key] = { description: rule.description };
      }
      return Response.json({
        success: true,
        datatypes
      });
    }

    // ACTION: Run full preflight validation
    if (action === 'preflight_validation') {
      const report = runPreflightValidation(canonical_data, pack_id);
      return Response.json({
        success: true,
        report
      });
    }

    // ACTION: Validate conditional rules
    if (action === 'validate_conditionals') {
      const violations = [];
      for (const rule of CONDITIONAL_RULES) {
        if (rule.condition(canonical_data)) {
          const fieldValue = canonical_data[rule.required_field];
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            violations.push({
              rule_id: rule.id,
              required_field: rule.required_field,
              message: rule.message,
              severity: rule.required_field.includes('recommended') ? 'warning' : 'error'
            });
          }
        }
      }
      
      return Response.json({
        success: true,
        is_valid: violations.filter(v => v.severity === 'error').length === 0,
        violations
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('LDD Rules Engine error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Full preflight validation
function runPreflightValidation(data, packId) {
  const errors = [];
  const warnings = [];
  
  // 1. Required field checks
  const requiredFields = [
    { field: 'loan_amount', label: 'Loan Amount' },
    { field: 'loan_purpose', label: 'Loan Purpose' },
    { field: 'property_street', label: 'Property Street Address' },
    { field: 'property_city', label: 'Property City' },
    { field: 'property_state', label: 'Property State' },
    { field: 'property_zip', label: 'Property ZIP' },
  ];

  for (const req of requiredFields) {
    if (!data[req.field]) {
      errors.push({
        category: 'missing_required',
        field: req.field,
        label: req.label,
        message: `Required field '${req.label}' is missing`,
        severity: 'error'
      });
    }
  }

  // 2. Enum validation
  const enumFields = [
    { field: 'loan_purpose', enum_type: 'LoanPurposeType' },
    { field: 'occupancy_type', enum_type: 'PropertyUsageType' },
    { field: 'property_type', enum_type: 'PropertyType' },
    { field: 'entity_type', enum_type: 'LegalEntityType' },
    { field: 'citizenship_status', enum_type: 'CitizenshipResidencyType' },
    { field: 'marital_status', enum_type: 'MaritalStatusType' },
  ];

  for (const check of enumFields) {
    const value = data[check.field];
    if (value) {
      const allowed = LDD_ENUMS[check.enum_type];
      if (allowed && !allowed.includes(value)) {
        errors.push({
          category: 'enum_violation',
          field: check.field,
          enum_type: check.enum_type,
          value,
          allowed_values: allowed,
          message: `Invalid value '${value}' for ${check.enum_type}`,
          severity: 'error'
        });
      }
    }
  }

  // 3. Datatype validation
  const datatypeFields = [
    { field: 'loan_amount', datatype: 'currency' },
    { field: 'interest_rate', datatype: 'percent' },
    { field: 'property_zip', datatype: 'zip' },
    { field: 'property_state', datatype: 'state' },
    { field: 'dob', datatype: 'date' },
    { field: 'phone', datatype: 'phone' },
  ];

  for (const check of datatypeFields) {
    const value = data[check.field];
    if (value) {
      const rule = DATATYPE_RULES[check.datatype];
      if (rule && !rule.validate(value)) {
        errors.push({
          category: 'datatype_violation',
          field: check.field,
          datatype: check.datatype,
          value,
          message: `Invalid ${check.datatype}: ${rule.description}`,
          severity: 'error'
        });
      }
    }
  }

  // 4. Conditional logic checks
  for (const rule of CONDITIONAL_RULES) {
    if (rule.condition(data)) {
      const fieldValue = data[rule.required_field];
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        const item = {
          category: 'conditional_required',
          rule_id: rule.id,
          field: rule.required_field,
          message: rule.message,
          severity: rule.message.includes('recommended') ? 'warning' : 'error'
        };
        if (item.severity === 'warning') {
          warnings.push(item);
        } else {
          errors.push(item);
        }
      }
    }
  }

  // Determine overall status
  let status = 'PASS';
  if (errors.length > 0) {
    status = 'FAIL';
  } else if (warnings.length > 0) {
    status = 'PASS_WITH_WARNINGS';
  }

  return {
    status,
    errors,
    warnings,
    summary: {
      total_errors: errors.length,
      total_warnings: warnings.length,
      missing_required: errors.filter(e => e.category === 'missing_required').length,
      enum_violations: errors.filter(e => e.category === 'enum_violation').length,
      datatype_violations: errors.filter(e => e.category === 'datatype_violation').length,
      conditional_violations: errors.filter(e => e.category === 'conditional_required').length
    },
    pack_id: packId || 'PACK_A_GENERIC_MISMO_34_B324',
    validated_at: new Date().toISOString()
  };
}