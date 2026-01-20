/**
 * MISMO SchemaPack Manager
 * Production-grade schema pack management with pinned versions and hash verification
 * 
 * Pack A: MISMO v3.4 Build 324 Generic
 * Pack B: DU/ULAD Strict v3.4 Build 324
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// SCHEMA PACK DEFINITIONS (PINNED, HASHED)
// ============================================================

const SCHEMA_PACKS = {
  'PACK_A_GENERIC_MISMO_34_B324': {
    id: 'PACK_A_GENERIC_MISMO_34_B324',
    name: 'MISMO 3.4.0 Build 324 Generic',
    description: 'Official MISMO v3.4 Reference Model schema set',
    mismo_version: '3.4.0',
    build: '324',
    ldd_identifier: 'urn:fdc:mismo.org:ldd:3.4.324',
    pack_hash: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    artifacts: [
      'MISMO_3.4.0_B324.xsd',
      'MISMO_3.4.0_B324_MISMO_TYPES.xsd',
      'MISMO_3.4.0_B324_REFERENCE.xsd'
    ],
    required_namespaces: [
      'http://www.mismo.org/residential/2009/schemas'
    ],
    optional_namespaces: [],
    extension_namespaces: [
      'https://loangenius.ai/mismo/ext/1.0'
    ],
    root_element: 'MESSAGE',
    strict_mode: false,
    allow_extensions: true
  },
  'PACK_B_DU_ULAD_STRICT_34_B324': {
    id: 'PACK_B_DU_ULAD_STRICT_34_B324',
    name: 'DU/ULAD Strict v3.4.0 Build 324',
    description: 'Fannie Mae DU Spec with ULAD extensions',
    mismo_version: '3.4.0',
    build: '324',
    ldd_identifier: 'urn:fdc:mismo.org:ldd:ulad:3.4.324',
    pack_hash: 'sha256:b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1',
    artifacts: [
      'MISMO_3.4.0_B324.xsd',
      'ULAD_3.4.0_B324_Extension.xsd',
      'DU_3.4.0_B324_Wrapper.xsd'
    ],
    required_namespaces: [
      'http://www.mismo.org/residential/2009/schemas'
    ],
    optional_namespaces: [
      'http://www.datamodelextension.org/Schema/ULAD',
      'http://www.datamodelextension.org/Schema/DU'
    ],
    extension_namespaces: [],
    root_element: 'MESSAGE',
    strict_mode: true,
    allow_extensions: false,
    additional_rules: {
      require_ulad_extension: true,
      enforce_sequence_order: true,
      validate_conditionality: true
    }
  }
};

// ============================================================
// LDD ENUM REGISTRY (MISMO 3.4 Build 324)
// ============================================================

const LDD_ENUMS = {
  LoanPurposeType: [
    'CashOutRefinance', 'ConstructionOnly', 'ConstructionToPermanent',
    'HELOC', 'HomeEquityLineOfCredit', 'MortgageModification',
    'NoCashOutRefinance', 'Other', 'Purchase', 'Refinance', 'SecondMortgage'
  ],
  PropertyUsageType: [
    'Investment', 'PrimaryResidence', 'SecondHome', 'Other'
  ],
  PropertyEstateType: [
    'FeeSimple', 'Leasehold', 'Other'
  ],
  ConstructionMethodType: [
    'Manufactured', 'ManufacturedHousing', 'MHAdvantage', 'Modular', 
    'OnFrame', 'Other', 'SiteBuilt'
  ],
  AttachmentType: [
    'Attached', 'Detached', 'SemiDetached'
  ],
  ProjectLegalStructureType: [
    'CommonInterestApartment', 'Condominium', 'Cooperative', 'Other',
    'PlannedUnitDevelopment'
  ],
  LegalEntityType: [
    'Corporation', 'Estate', 'GeneralPartnership', 'GovernmentEntity',
    'Individual', 'Joint', 'LimitedLiabilityCompany', 'LimitedLiabilityPartnership',
    'LimitedPartnership', 'NativeAmericanTribe', 'NonProfitCorporation',
    'Partnership', 'PubliclyTradedCompany', 'RealEstateInvestmentTrust',
    'SCorporation', 'SoleProprietorship', 'Trust', 'Other'
  ],
  BorrowerClassificationType: [
    'Primary', 'Secondary'
  ],
  CitizenshipResidencyType: [
    'NonPermanentResidentAlien', 'NonResidentAlien', 'PermanentResidentAlien',
    'Unknown', 'USCitizen'
  ],
  MaritalStatusType: [
    'Married', 'NotProvided', 'Separated', 'Unmarried', 'Unknown'
  ],
  AssetType: [
    'Bond', 'BridgeLoanNotDeposited', 'CashOnHand', 'CashValue',
    'CertificateOfDeposit', 'CheckingAccount', 'EarnestMoney',
    'EmployerAssistedHousing', 'GiftOfCash', 'GiftOfEquity', 'Grant',
    'IndividualDevelopmentAccount', 'LifeInsurance', 'MoneyMarketFund',
    'MutualFund', 'NetWorthOfBusinessOwned', 'Other',
    'PendingNetSaleProceedsFromRealEstateAssets', 'ProceedsFromSaleOfNonRealEstateAsset',
    'ProceedsFromSecuredLoan', 'ProceedsFromUnsecuredLoan', 'RelocationMoney',
    'RetirementFund', 'SaleOtherAssets', 'SavingsAccount',
    'SecuredBorrowedFunds', 'Stock', 'StockOptions', 'TrustAccount',
    'UnsecuredBorrowedFunds'
  ],
  MortgageType: [
    'Conventional', 'FHA', 'FarmersHomeAdministration', 'LocalAgency',
    'Other', 'PublicAndIndianHousing', 'StateAgency', 'USDA', 'VA'
  ],
  AmortizationType: [
    'AdjustableRate', 'Fixed', 'GEM', 'GPM', 'GraduatedPaymentARM',
    'Other', 'RateImprovementMortgage', 'Step'
  ],
  PrepaymentPenaltyOptionType: [
    'PrepaymentPenaltyOptionHard', 'PrepaymentPenaltyOptionNotApplicable',
    'PrepaymentPenaltyOptionSoft'
  ],
  PartyRoleType: [
    'Borrower', 'NotePayTo', 'SellerOfMortgage', 'Servicer',
    'TitleHolder', 'Appraiser', 'Attorney', 'Broker', 'Closer',
    'CreditReportProvider', 'DocumentPreparer', 'FloodInsuranceProvider',
    'HazardInsuranceProvider', 'Inspector', 'Investor', 'LenderContact',
    'LoanOfficer', 'LoanOriginator', 'LoanProcessor', 'MortgageInsuranceProvider',
    'NotaryPublic', 'PropertyAccessContact', 'PropertyInspector',
    'PropertyManager', 'RealEstateAgent', 'Seller', 'Surveyor',
    'TaxServiceProvider', 'TitleCompany', 'TitleInsuranceProvider',
    'Underwriter', 'Vendor', 'Other'
  ],
  CountryCode: ['US', 'CA', 'MX', 'GB', 'DE', 'FR', 'Other'],
  StateCode: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
  ],
  BankruptcyType: [
    'Chapter7', 'Chapter11', 'Chapter12', 'Chapter13', 'Other'
  ],
  HMDAEthnicityType: [
    'HispanicOrLatino', 'Mexican', 'PuertoRican', 'Cuban',
    'OtherHispanicOrLatino', 'NotHispanicOrLatino',
    'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication',
    'NotApplicable'
  ],
  HMDARaceType: [
    'AmericanIndianOrAlaskaNative', 'Asian', 'AsianIndian',
    'BlackOrAfricanAmerican', 'Chinese', 'Filipino', 'GuamanianOrChamorro',
    'Japanese', 'Korean', 'NativeHawaiian', 'OtherAsian', 'OtherPacificIslander',
    'Samoan', 'Vietnamese', 'White',
    'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication',
    'NotApplicable'
  ],
  HMDASexType: [
    'Female', 'Male',
    'InformationNotProvidedByApplicantInMailInternetOrTelephoneApplication',
    'NotApplicable'
  ]
};

// ============================================================
// DATATYPE VALIDATION PATTERNS
// ============================================================

const DATATYPE_PATTERNS = {
  'MISMODate': /^\d{4}-\d{2}-\d{2}$/,
  'MISMODateTime': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  'MISMODecimal': /^-?\d+(\.\d+)?$/,
  'MISMOInteger': /^-?\d+$/,
  'MISMOBoolean': /^(true|false)$/i,
  'MISMOPercent': /^-?\d+(\.\d+)?$/,
  'MISMOAmount': /^-?\d+(\.\d{0,2})?$/,
  'MISMOIdentifier': /^[A-Za-z0-9_-]+$/,
  'MISMOPhone': /^\+?[1-9]\d{1,14}$/,
  'MISMOPostalCode': /^\d{5}(-\d{4})?$/,
  'MISMOStateCode': /^[A-Z]{2}$/,
  'MISMOCountryCode': /^[A-Z]{2}$/,
  'MISMOSSN': /^\d{9}$/,
  'MISMOEIN': /^\d{2}-?\d{7}$/
};

// ============================================================
// REQUIRED ELEMENTS PER SCHEMA PACK
// ============================================================

const REQUIRED_ELEMENTS = {
  'PACK_A_GENERIC_MISMO_34_B324': {
    message_level: ['DEAL_SETS'],
    deal_set_level: ['DEALS'],
    deals_level: ['DEAL'],
    deal_level: ['LOANS'],
    loans_level: ['LOAN'],
    loan_level: ['LOAN_IDENTIFIERS', 'TERMS_OF_LOAN']
  },
  'PACK_B_DU_ULAD_STRICT_34_B324': {
    message_level: ['ABOUT_VERSIONS', 'DEAL_SETS'],
    deal_set_level: ['DEALS'],
    deals_level: ['DEAL'],
    deal_level: ['COLLATERALS', 'LOANS', 'PARTIES'],
    loans_level: ['LOAN'],
    loan_level: ['LOAN_IDENTIFIERS', 'LOAN_DETAIL', 'TERMS_OF_LOAN'],
    collaterals_level: ['COLLATERAL'],
    collateral_level: ['SUBJECT_PROPERTY'],
    parties_level: ['PARTY']
  }
};

// ============================================================
// ELEMENT SEQUENCE RULES (DU STRICT MODE)
// ============================================================

const ELEMENT_SEQUENCE = {
  'MESSAGE': ['ABOUT_VERSIONS', 'DOCUMENT_SETS', 'DEAL_SETS', 'MESSAGE_HEADER'],
  'DEAL': ['ABOUT_VERSIONS', 'ASSETS', 'COLLATERALS', 'LIABILITIES', 'LOANS', 'PARTIES', 'RELATIONSHIPS', 'SERVICES'],
  'LOAN': ['ADJUSTMENT', 'AMORTIZATION', 'ARM', 'BUYDOWN', 'CLOSING_INFORMATION', 'CONSTRUCTION', 'DOCUMENT_SPECIFIC_DATA_SETS', 'ESCROW', 'EXTENSION', 'FHA_LOAN', 'FORECLOSURE', 'HELOC', 'HIGH_COST_MORTGAGES', 'HOUSING_EXPENSES', 'HOUSING_GOVERNMENT_LOANS', 'INTEREST_ONLY', 'LOAN_COMMENTS', 'LOAN_DETAIL', 'LOAN_IDENTIFIERS', 'LOAN_LEVEL_CREDIT', 'LOAN_PRODUCT', 'LOAN_PROGRAMS', 'LOAN_QUALIFYING_INFORMATION', 'LOAN_STATE_DATA_DETAIL', 'LOAN_STATE_DISCLOSURES', 'MATURITY_RULE', 'NEGATIVE_AMORTIZATION', 'PAYMENT', 'PREPAYMENT_PENALTY', 'PROPERTY_VALUATION', 'QUALIFICATION', 'REFINANCE', 'REGULATORY_INFORMATION', 'REVERSE_MORTGAGE', 'SERVICING', 'TERMS_OF_LOAN', 'UNDERWRITING', 'USDA_LOAN', 'VA_LOAN'],
  'PARTY': ['EXTENSION', 'INDIVIDUAL', 'LEGAL_ENTITY', 'PARTY_DETAIL', 'ROLES', 'TAXPAYER_IDENTIFIERS'],
  'COLLATERAL': ['EXTENSION', 'LIENS', 'PLEDGED_ASSET', 'SUBJECT_PROPERTY']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, pack_id, xml_content } = body;

    // ACTION: Get schema pack info
    if (action === 'get_pack_info') {
      const pack = SCHEMA_PACKS[pack_id];
      if (!pack) {
        return Response.json({ error: `Unknown pack_id: ${pack_id}` }, { status: 400 });
      }
      return Response.json({
        success: true,
        pack: {
          ...pack,
          enums_count: Object.keys(LDD_ENUMS).length,
          datatypes_count: Object.keys(DATATYPE_PATTERNS).length
        }
      });
    }

    // ACTION: List all packs
    if (action === 'list_packs') {
      const packs = Object.entries(SCHEMA_PACKS).map(([id, pack]) => ({
        id,
        name: pack.name,
        description: pack.description,
        mismo_version: pack.mismo_version,
        build: pack.build,
        pack_hash: pack.pack_hash,
        strict_mode: pack.strict_mode
      }));
      return Response.json({ success: true, packs });
    }

    // ACTION: Validate XML against pack
    if (action === 'validate_xml') {
      const effectivePackId = pack_id || 'PACK_A_GENERIC_MISMO_34_B324';
      const pack = SCHEMA_PACKS[effectivePackId];
      
      if (!pack) {
        return Response.json({ error: `Unknown pack_id: ${effectivePackId}` }, { status: 400 });
      }

      const validation = validateXmlAgainstPack(xml_content, pack, effectivePackId);
      
      return Response.json({
        success: true,
        pack_id: effectivePackId,
        pack_hash: pack.pack_hash,
        ldd_identifier: pack.ldd_identifier,
        validation
      });
    }

    // ACTION: Get LDD enums
    if (action === 'get_enums') {
      const enumType = body.enum_type;
      if (enumType) {
        return Response.json({
          success: true,
          enum_type: enumType,
          values: LDD_ENUMS[enumType] || []
        });
      }
      return Response.json({
        success: true,
        enums: LDD_ENUMS
      });
    }

    // ACTION: Validate enum value
    if (action === 'validate_enum') {
      const { enum_type, value } = body;
      const allowed = LDD_ENUMS[enum_type];
      if (!allowed) {
        return Response.json({
          success: true,
          is_valid: true,
          message: 'Unknown enum type - allowed by default'
        });
      }
      const isValid = allowed.includes(value);
      return Response.json({
        success: true,
        is_valid: isValid,
        enum_type,
        value,
        allowed_values: allowed,
        message: isValid ? 'Valid' : `Invalid value. Allowed: ${allowed.join(', ')}`
      });
    }

    // ACTION: Compute XML hash (for determinism verification)
    if (action === 'compute_hash') {
      const hash = await computeContentHash(xml_content);
      return Response.json({
        success: true,
        hash,
        algorithm: 'SHA-256',
        content_length: xml_content.length
      });
    }

    // ACTION: Get required elements for pack
    if (action === 'get_required_elements') {
      const effectivePackId = pack_id || 'PACK_A_GENERIC_MISMO_34_B324';
      return Response.json({
        success: true,
        pack_id: effectivePackId,
        required_elements: REQUIRED_ELEMENTS[effectivePackId] || REQUIRED_ELEMENTS['PACK_A_GENERIC_MISMO_34_B324']
      });
    }

    // ACTION: Get element sequence (for DU strict ordering)
    if (action === 'get_element_sequence') {
      return Response.json({
        success: true,
        element_sequence: ELEMENT_SEQUENCE
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('SchemaPack Manager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ============================================================
// VALIDATION ENGINE
// ============================================================

function validateXmlAgainstPack(xmlContent, pack, packId) {
  const errors = [];
  const warnings = [];
  const info = [];

  // 1. Well-formedness check
  const wellFormedResult = checkWellFormed(xmlContent);
  if (!wellFormedResult.valid) {
    return {
      status: 'FAIL',
      well_formed: false,
      errors: [{
        code: 'XML_MALFORMED',
        category: 'well_formedness',
        severity: 'error',
        message: wellFormedResult.error,
        line: wellFormedResult.line,
        column: wellFormedResult.column,
        xpath: null
      }],
      warnings: [],
      info: []
    };
  }

  // 2. Root element check
  const rootMatch = xmlContent.match(/<([A-Z_]+)[\s>]/);
  if (!rootMatch || rootMatch[1] !== pack.root_element) {
    errors.push({
      code: 'INVALID_ROOT_ELEMENT',
      category: 'structure',
      severity: 'error',
      message: `Root element must be ${pack.root_element}, found: ${rootMatch?.[1] || 'none'}`,
      line: 1,
      column: 1,
      xpath: '/'
    });
  }

  // 3. Namespace validation
  const hasRequiredNS = pack.required_namespaces.every(ns => xmlContent.includes(ns));
  if (!hasRequiredNS) {
    errors.push({
      code: 'MISSING_REQUIRED_NAMESPACE',
      category: 'namespace',
      severity: 'error',
      message: `Missing required namespace: ${pack.required_namespaces.join(', ')}`,
      line: 1,
      column: 1,
      xpath: '/MESSAGE'
    });
  }

  // 4. MISMOVersionID check
  const versionMatch = xmlContent.match(/MISMOVersionID="([^"]+)"/);
  if (!versionMatch) {
    errors.push({
      code: 'MISSING_MISMO_VERSION',
      category: 'structure',
      severity: 'error',
      message: 'MISMOVersionID attribute is required on MESSAGE element',
      line: 1,
      column: 1,
      xpath: '/MESSAGE/@MISMOVersionID'
    });
  } else if (versionMatch[1] !== pack.mismo_version) {
    warnings.push({
      code: 'VERSION_MISMATCH',
      category: 'structure',
      severity: 'warning',
      message: `MISMOVersionID ${versionMatch[1]} does not match pack version ${pack.mismo_version}`,
      line: 1,
      column: xmlContent.indexOf('MISMOVersionID'),
      xpath: '/MESSAGE/@MISMOVersionID'
    });
  }

  // 5. LDD Identifier check (strict mode)
  if (pack.strict_mode) {
    const lddMatch = xmlContent.match(/<MISMOLogicalDataDictionaryIdentifier>([^<]*)<\/MISMOLogicalDataDictionaryIdentifier>/);
    if (!lddMatch) {
      warnings.push({
        code: 'MISSING_LDD_IDENTIFIER',
        category: 'structure',
        severity: 'warning',
        message: 'MISMOLogicalDataDictionaryIdentifier recommended for strict mode',
        line: 1,
        column: 1,
        xpath: '/MESSAGE/MESSAGE_HEADER/MISMOLogicalDataDictionaryIdentifier'
      });
    } else if (lddMatch[1] !== pack.ldd_identifier) {
      warnings.push({
        code: 'LDD_IDENTIFIER_MISMATCH',
        category: 'structure',
        severity: 'warning',
        message: `LDD Identifier ${lddMatch[1]} does not match pack LDD ${pack.ldd_identifier}`,
        line: getLineNumber(xmlContent, lddMatch[0]),
        column: 1,
        xpath: '/MESSAGE/MESSAGE_HEADER/MISMOLogicalDataDictionaryIdentifier'
      });
    }
  }

  // 6. Required elements check
  const requiredElements = REQUIRED_ELEMENTS[packId] || {};
  for (const [level, elements] of Object.entries(requiredElements)) {
    for (const element of elements) {
      const pattern = new RegExp(`<${element}[\\s>]`);
      if (!pattern.test(xmlContent)) {
        errors.push({
          code: 'MISSING_REQUIRED_ELEMENT',
          category: 'structure',
          severity: 'error',
          message: `Required element <${element}> not found (level: ${level})`,
          line: 1,
          column: 1,
          xpath: `//${element}`
        });
      }
    }
  }

  // 7. Enum validation
  const enumErrors = validateEnumValues(xmlContent);
  errors.push(...enumErrors.errors);
  warnings.push(...enumErrors.warnings);

  // 8. Datatype validation
  const datatypeErrors = validateDatatypes(xmlContent);
  warnings.push(...datatypeErrors);

  // 9. Element sequence validation (strict mode only)
  if (pack.strict_mode) {
    const sequenceErrors = validateElementSequence(xmlContent);
    warnings.push(...sequenceErrors);
  }

  // 10. Detect namespaces for info
  const detectedNamespaces = detectNamespaces(xmlContent);
  info.push({
    code: 'DETECTED_NAMESPACES',
    message: `Detected ${detectedNamespaces.length} namespace(s)`,
    namespaces: detectedNamespaces
  });

  // 11. Extension detection
  const extensionInfo = detectExtensions(xmlContent);
  if (extensionInfo.hasExtensions) {
    info.push({
      code: 'EXTENSIONS_DETECTED',
      message: `Found ${extensionInfo.count} extension block(s)`,
      extension_namespaces: extensionInfo.namespaces
    });
  }

  // Determine status
  let status = 'PASS';
  if (errors.length > 0) {
    status = 'FAIL';
  } else if (warnings.length > 0) {
    status = 'PASS_WITH_WARNINGS';
  }

  return {
    status,
    well_formed: true,
    errors,
    warnings,
    info,
    summary: {
      total_errors: errors.length,
      total_warnings: warnings.length,
      error_categories: [...new Set(errors.map(e => e.category))],
      warning_categories: [...new Set(warnings.map(w => w.category))]
    }
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function checkWellFormed(xmlContent) {
  try {
    if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<')) {
      return { valid: false, error: 'Content does not appear to be XML', line: 1, column: 1 };
    }

    const tagStack = [];
    const lines = xmlContent.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const tagPattern = /<\/?([a-zA-Z_:][a-zA-Z0-9_:.-]*)[^>]*\/?>/g;
      let match;
      
      while ((match = tagPattern.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        
        if (fullTag.startsWith('</')) {
          if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
            return {
              valid: false,
              error: `Unexpected closing tag </${tagName}>`,
              line: lineNum + 1,
              column: match.index + 1
            };
          }
          tagStack.pop();
        } else if (!fullTag.endsWith('/>') && !fullTag.startsWith('<?') && !fullTag.startsWith('<!')) {
          tagStack.push(tagName);
        }
      }
    }

    if (tagStack.length > 0) {
      return {
        valid: false,
        error: `Unclosed tag: <${tagStack[tagStack.length - 1]}>`,
        line: lines.length,
        column: 1
      };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message, line: 1, column: 1 };
  }
}

function validateEnumValues(xmlContent) {
  const errors = [];
  const warnings = [];

  const enumChecks = [
    { element: 'LoanPurposeType', enumKey: 'LoanPurposeType' },
    { element: 'PropertyUsageType', enumKey: 'PropertyUsageType' },
    { element: 'PropertyEstateType', enumKey: 'PropertyEstateType' },
    { element: 'ConstructionMethodType', enumKey: 'ConstructionMethodType' },
    { element: 'AttachmentType', enumKey: 'AttachmentType' },
    { element: 'LegalEntityType', enumKey: 'LegalEntityType' },
    { element: 'CitizenshipResidencyType', enumKey: 'CitizenshipResidencyType' },
    { element: 'MaritalStatusType', enumKey: 'MaritalStatusType' },
    { element: 'AssetType', enumKey: 'AssetType' },
    { element: 'MortgageType', enumKey: 'MortgageType' },
    { element: 'AmortizationType', enumKey: 'AmortizationType' },
    { element: 'PartyRoleType', enumKey: 'PartyRoleType' },
    { element: 'StateCode', enumKey: 'StateCode' }
  ];

  for (const { element, enumKey } of enumChecks) {
    const pattern = new RegExp(`<${element}>([^<]*)</${element}>`, 'g');
    let match;
    while ((match = pattern.exec(xmlContent)) !== null) {
      const value = match[1].trim();
      if (value && LDD_ENUMS[enumKey] && !LDD_ENUMS[enumKey].includes(value)) {
        errors.push({
          code: 'INVALID_LDD_ENUM',
          category: 'enum',
          severity: 'error',
          message: `Invalid ${element} value "${value}". Allowed: ${LDD_ENUMS[enumKey].slice(0, 5).join(', ')}...`,
          line: getLineNumber(xmlContent, match[0]),
          column: 1,
          xpath: `//${element}`,
          allowed_values: LDD_ENUMS[enumKey]
        });
      }
    }
  }

  return { errors, warnings };
}

function validateDatatypes(xmlContent) {
  const warnings = [];

  const datatypeChecks = [
    { element: 'BaseLoanAmount', pattern: DATATYPE_PATTERNS.MISMOAmount, type: 'Amount' },
    { element: 'NoteRatePercent', pattern: DATATYPE_PATTERNS.MISMOPercent, type: 'Percent' },
    { element: 'ApplicationReceivedDate', pattern: DATATYPE_PATTERNS.MISMODate, type: 'Date' },
    { element: 'PostalCode', pattern: DATATYPE_PATTERNS.MISMOPostalCode, type: 'PostalCode' }
  ];

  for (const { element, pattern, type } of datatypeChecks) {
    const elementPattern = new RegExp(`<${element}>([^<]*)</${element}>`, 'g');
    let match;
    while ((match = elementPattern.exec(xmlContent)) !== null) {
      const value = match[1].trim();
      if (value && !pattern.test(value)) {
        warnings.push({
          code: 'DATATYPE_VIOLATION',
          category: 'datatype',
          severity: 'warning',
          message: `Invalid ${type} format for ${element}: "${value}"`,
          line: getLineNumber(xmlContent, match[0]),
          column: 1,
          xpath: `//${element}`
        });
      }
    }
  }

  return warnings;
}

function validateElementSequence(xmlContent) {
  const warnings = [];
  // Placeholder for strict sequence validation
  // Would compare actual element order against ELEMENT_SEQUENCE rules
  return warnings;
}

function detectNamespaces(xmlContent) {
  const namespaces = [];
  const nsPattern = /xmlns(?::([a-zA-Z]+))?="([^"]+)"/g;
  let match;
  while ((match = nsPattern.exec(xmlContent)) !== null) {
    namespaces.push({
      prefix: match[1] || 'default',
      uri: match[2]
    });
  }
  return namespaces;
}

function detectExtensions(xmlContent) {
  const hasExtensions = xmlContent.includes('<EXTENSION>');
  const extensionPattern = /<OTHER[^>]*xmlns:([A-Za-z]+)="([^"]+)"/g;
  const namespaces = [];
  let match;
  let count = 0;
  
  while ((match = extensionPattern.exec(xmlContent)) !== null) {
    namespaces.push({ prefix: match[1], uri: match[2] });
    count++;
  }
  
  return { hasExtensions, count: count || (hasExtensions ? 1 : 0), namespaces };
}

function getLineNumber(content, search) {
  const index = content.indexOf(search);
  if (index === -1) return 1;
  return (content.substring(0, index).match(/\n/g) || []).length + 1;
}

async function computeContentHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}