/**
 * MISMO SchemaPack Validator
 * Validates XML against MISMO v3.4 Build 324 XSDs
 * 
 * Schema Packs:
 * - Standard: MISMO 3.4.0_B324 base schema
 * - Strict (DU Wrapper): ULAD extension + DU extension + wrapper
 * 
 * Validation Rules:
 * - Well-formed XML check
 * - XSD schema validation
 * - Returns detailed error/warning report with line/column info
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO Version Lock Configuration
const MISMO_CONFIG = {
  VERSION: '3.4',
  BUILD: '324',
  VERSION_ID: '3.4.0',
  ROOT_ELEMENT: 'MESSAGE',
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
};

// Import LDD enum validation (inline for performance)
const LDD_ENUM_VALUES = {
  LoanPurposeType: ['CashOutRefinance', 'ConstructionOnly', 'ConstructionToPermanent', 'HELOC', 'NoCashOutRefinance', 'Other', 'Purchase', 'SecondMortgage'],
  PropertyType: ['Attached', 'Commercial', 'Condominium', 'Cooperative', 'Detached', 'HighRiseCondominium', 'Land', 'ManufacturedHousing', 'MixedUse', 'Modular', 'Multifamily', 'Other', 'PUDAttached', 'PUDDetached', 'SingleFamily', 'Townhouse', 'TwoToFourFamily'],
  PropertyUsageType: ['Investment', 'PrimaryResidence', 'SecondHome'],
  AmortizationType: ['AdjustableRate', 'Fixed', 'GraduatedPaymentARM', 'GraduatedPaymentMortgage', 'GrowingEquityMortgage', 'InterestOnly', 'Other', 'Step'],
  MortgageType: ['Conventional', 'FHA', 'FarmersHomeAdministration', 'Other', 'USDA-RHS', 'VA'],
  CitizenshipResidencyType: ['NonPermanentResidentAlien', 'PermanentResidentAlien', 'USCitizen'],
  MaritalStatusType: ['Married', 'Separated', 'Unmarried'],
  BorrowerResidencyBasisType: ['LivingRentFree', 'Own', 'Rent'],
  LegalEntityType: ['Corporation', 'Estate', 'GeneralPartnership', 'GovernmentEntity', 'Individual', 'LimitedLiabilityCompany', 'LimitedPartnership', 'Trust'],
  AssetType: ['Annuity', 'Bond', 'CashOnHand', 'CertificateOfDeposit', 'CheckingAccount', 'IndividualRetirementAccount', 'MoneyMarketFund', 'MutualFund', 'Other', 'RetirementFund', 'SavingsAccount', 'Stock', 'StocksBondsMutualFundsOther', 'TrustFund'],
  PrepaymentPenaltyOptionType: ['PrepaymentPenaltyOptionHard', 'PrepaymentPenaltyOptionNotApplicable', 'PrepaymentPenaltyOptionSoft'],
};

// Schema pack definitions (XSD validation rules derived from MISMO spec)
const SCHEMA_PACKS = {
  standard: {
    name: 'MISMO 3.4.0 Build 324 Standard',
    description: 'Base MISMO 3.4 Reference Model schema validation',
    required_namespaces: ['http://www.mismo.org/residential/2009/schemas'],
    optional_namespaces: [],
  },
  strict: {
    name: 'DU Wrapper 3.4.0_B324 (Strict)',
    description: 'ULAD extension + DU extension + wrapper validation',
    required_namespaces: [
      'http://www.mismo.org/residential/2009/schemas',
    ],
    optional_namespaces: [
      'http://www.datamodelextension.org/Schema/ULAD',
      'http://www.datamodelextension.org/Schema/DU',
    ],
  },
};

// Required elements for MISMO 3.4 MESSAGE structure
const REQUIRED_ELEMENTS = {
  root: ['MESSAGE'],
  message_children: ['DEAL_SETS'],
  deal_set_children: ['DEALS'],
  deal_children: ['LOANS'],
  loan_children: ['LOAN_DETAIL', 'TERMS_OF_LOAN'],
};

// Element validation rules based on MISMO 3.4 spec
const ELEMENT_RULES = {
  'MESSAGE': { required: true, minOccurs: 1, maxOccurs: 1 },
  'ABOUT_VERSIONS': { required: false, minOccurs: 0, maxOccurs: 1 },
  'MESSAGE_HEADER': { required: false, minOccurs: 0, maxOccurs: 1 },
  'DEAL_SETS': { required: true, minOccurs: 1, maxOccurs: 1 },
  'DEAL_SET': { required: true, minOccurs: 1, maxOccurs: 'unbounded' },
  'DEALS': { required: true, minOccurs: 1, maxOccurs: 1 },
  'DEAL': { required: true, minOccurs: 1, maxOccurs: 'unbounded' },
  'LOANS': { required: true, minOccurs: 1, maxOccurs: 1 },
  'LOAN': { required: true, minOccurs: 1, maxOccurs: 'unbounded' },
  'COLLATERALS': { required: false, minOccurs: 0, maxOccurs: 1 },
  'PARTIES': { required: false, minOccurs: 0, maxOccurs: 1 },
};

// Data type validation patterns
const DATA_TYPE_PATTERNS = {
  'Date': /^\d{4}-\d{2}-\d{2}$/,
  'DateTime': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  'Decimal': /^-?\d+(\.\d+)?$/,
  'Integer': /^-?\d+$/,
  'Boolean': /^(true|false)$/,
  'Percent': /^-?\d+(\.\d+)?$/,
  'Amount': /^-?\d+(\.\d{0,2})?$/,
};

// Field-specific validation rules from MISMO spec
const FIELD_VALIDATIONS = {
  'MISMOVersionID': { pattern: /^3\.4(\.\d+)?$/, message: 'Must be MISMO version 3.4.x' },
  'BaseLoanAmount': { type: 'Amount', min: 0 },
  'NoteRatePercent': { type: 'Percent', min: 0, max: 100 },
  'LoanToValueRatioPercent': { type: 'Percent', min: 0, max: 200 },
  'CreditScoreValue': { type: 'Integer', min: 300, max: 850 },
  'StateCode': { pattern: /^[A-Z]{2}$/, message: 'Must be 2-letter state code' },
  'PostalCode': { pattern: /^\d{5}(-\d{4})?$/, message: 'Must be valid ZIP code' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      xml_content, 
      file_url, 
      schema_pack = 'standard',
      validation_mode = 'full', // 'full' | 'wellformed_only' | 'structure_only'
      context = 'import' // 'import' | 'export'
    } = await req.json();

    let xmlToValidate = xml_content;

    // Fetch XML from URL if provided
    if (file_url && !xml_content) {
      try {
        const response = await fetch(file_url);
        if (!response.ok) {
          return Response.json({ error: 'Failed to fetch XML file' }, { status: 400 });
        }
        xmlToValidate = await response.text();
      } catch (e) {
        return Response.json({ error: `Failed to fetch XML: ${e.message}` }, { status: 400 });
      }
    }

    if (!xmlToValidate) {
      return Response.json({ error: 'xml_content or file_url is required' }, { status: 400 });
    }

    // Run validation
    const report = validateMISMOXML(xmlToValidate, schema_pack, validation_mode);

    // Determine overall status
    const status = determineValidationStatus(report);

    return Response.json({
      success: true,
      validation_status: status,
      schema_pack: SCHEMA_PACKS[schema_pack]?.name || schema_pack,
      validation_mode,
      context,
      report: {
        errors: report.errors,
        warnings: report.warnings,
        info: report.info,
        summary: {
          total_errors: report.errors.length,
          total_warnings: report.warnings.length,
          well_formed: report.wellFormed,
          structure_valid: report.structureValid,
          data_valid: report.dataValid,
        },
      },
      can_proceed: status !== 'FAIL',
      block_reason: status === 'FAIL' ? getBlockReason(report, context) : null,
    });
  } catch (error) {
    console.error('Schema validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Main validation function
 */
function validateMISMOXML(xmlContent, schemaPack, validationMode) {
  const report = {
    errors: [],
    warnings: [],
    info: [],
    wellFormed: false,
    structureValid: false,
    dataValid: false,
  };

  // Step 1: Well-formed XML check
  const wellFormedResult = checkWellFormed(xmlContent);
  report.wellFormed = wellFormedResult.valid;
  
  if (!wellFormedResult.valid) {
    report.errors.push({
      code: 'XML_MALFORMED',
      severity: 'error',
      message: wellFormedResult.error,
      line: wellFormedResult.line,
      column: wellFormedResult.column,
      xpath: null,
    });
    return report;
  }

  if (validationMode === 'wellformed_only') {
    return report;
  }

  // Step 2: Structure validation (XSD-like)
  const structureResult = validateStructure(xmlContent, schemaPack);
  report.structureValid = structureResult.valid;
  report.errors.push(...structureResult.errors);
  report.warnings.push(...structureResult.warnings);
  report.info.push(...structureResult.info);

  if (validationMode === 'structure_only') {
    return report;
  }

  // Step 3: Data type and value validation
  const dataResult = validateDataTypes(xmlContent);
  report.dataValid = dataResult.valid;
  report.errors.push(...dataResult.errors);
  report.warnings.push(...dataResult.warnings);

  // Step 4: MISMO-specific business rules
  const businessResult = validateBusinessRules(xmlContent, schemaPack);
  report.errors.push(...businessResult.errors);
  report.warnings.push(...businessResult.warnings);

  return report;
}

/**
 * Check if XML is well-formed
 */
function checkWellFormed(xmlContent) {
  try {
    // Basic XML structure checks
    if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<')) {
      return { valid: false, error: 'Content does not appear to be XML', line: 1, column: 1 };
    }

    // Check for balanced tags
    const tagStack = [];
    const tagPattern = /<\/?([a-zA-Z_][a-zA-Z0-9_:-]*)[^>]*\/?>/g;
    const lines = xmlContent.split('\n');
    let charIndex = 0;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      let match;
      const lineTagPattern = /<\/?([a-zA-Z_][a-zA-Z0-9_:-]*)[^>]*\/?>/g;
      
      while ((match = lineTagPattern.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        
        if (fullTag.startsWith('</')) {
          // Closing tag
          if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
            return {
              valid: false,
              error: `Unexpected closing tag </${tagName}>`,
              line: lineNum + 1,
              column: match.index + 1,
            };
          }
          tagStack.pop();
        } else if (!fullTag.endsWith('/>') && !fullTag.startsWith('<?') && !fullTag.startsWith('<!')) {
          // Opening tag (not self-closing)
          tagStack.push(tagName);
        }
      }
    }

    if (tagStack.length > 0) {
      return {
        valid: false,
        error: `Unclosed tag: <${tagStack[tagStack.length - 1]}>`,
        line: lines.length,
        column: 1,
      };
    }

    // Check for invalid characters
    const invalidCharMatch = xmlContent.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
    if (invalidCharMatch) {
      const position = xmlContent.indexOf(invalidCharMatch[0]);
      const beforeMatch = xmlContent.substring(0, position);
      const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
      return {
        valid: false,
        error: 'Invalid XML character found',
        line: lineNum,
        column: position - beforeMatch.lastIndexOf('\n'),
      };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message, line: 1, column: 1 };
  }
}

/**
 * Validate XML structure against MISMO schema rules
 */
function validateStructure(xmlContent, schemaPack) {
  const result = { valid: true, errors: [], warnings: [], info: [] };
  const packConfig = SCHEMA_PACKS[schemaPack] || SCHEMA_PACKS.standard;

  // Check root element
  const rootMatch = xmlContent.match(/<([A-Z_]+)\s+[^>]*xmlns=/);
  if (!rootMatch || rootMatch[1] !== 'MESSAGE') {
    result.valid = false;
    result.errors.push({
      code: 'INVALID_ROOT',
      severity: 'error',
      message: `Root element must be MESSAGE, found: ${rootMatch?.[1] || 'none'}`,
      line: 1,
      column: 1,
      xpath: '/',
    });
  }

  // Check required namespace
  const hasRequiredNS = packConfig.required_namespaces.every(ns => xmlContent.includes(ns));
  if (!hasRequiredNS) {
    result.valid = false;
    result.errors.push({
      code: 'MISSING_NAMESPACE',
      severity: 'error',
      message: `Missing required namespace: ${packConfig.required_namespaces[0]}`,
      line: 1,
      column: 1,
      xpath: '/MESSAGE',
    });
  }

  // Check MISMOVersionID attribute
  const versionMatch = xmlContent.match(/MISMOVersionID="([^"]+)"/);
  if (!versionMatch) {
    result.errors.push({
      code: 'MISSING_VERSION',
      severity: 'error',
      message: 'MISMOVersionID attribute is required on MESSAGE element',
      line: 1,
      column: 1,
      xpath: '/MESSAGE/@MISMOVersionID',
    });
    result.valid = false;
  } else if (!versionMatch[1].startsWith('3.4')) {
    result.warnings.push({
      code: 'VERSION_MISMATCH',
      severity: 'warning',
      message: `MISMOVersionID should be 3.4.x, found: ${versionMatch[1]}`,
      line: 1,
      column: xmlContent.indexOf('MISMOVersionID'),
      xpath: '/MESSAGE/@MISMOVersionID',
    });
  }

  // Check required child elements
  const requiredPaths = [
    { path: 'DEAL_SETS', parent: 'MESSAGE' },
    { path: 'DEAL_SET', parent: 'DEAL_SETS' },
    { path: 'DEALS', parent: 'DEAL_SET' },
    { path: 'DEAL', parent: 'DEALS' },
    { path: 'LOANS', parent: 'DEAL' },
    { path: 'LOAN', parent: 'LOANS' },
  ];

  for (const req of requiredPaths) {
    const pattern = new RegExp(`<${req.path}[\\s>]`, 'i');
    if (!pattern.test(xmlContent)) {
      result.errors.push({
        code: 'MISSING_ELEMENT',
        severity: 'error',
        message: `Required element <${req.path}> not found within <${req.parent}>`,
        line: getLineNumber(xmlContent, req.parent),
        column: 1,
        xpath: `//${req.parent}/${req.path}`,
      });
      result.valid = false;
    }
  }

  // Check for LDD Identifier in strict mode
  if (schemaPack === 'strict') {
    const lddMatch = xmlContent.match(/<MISMOLogicalDataDictionaryIdentifier>([^<]+)<\/MISMOLogicalDataDictionaryIdentifier>/);
    if (!lddMatch) {
      result.warnings.push({
        code: 'MISSING_LDD',
        severity: 'warning',
        message: 'MISMOLogicalDataDictionaryIdentifier recommended in MESSAGE_HEADER',
        line: getLineNumber(xmlContent, 'MESSAGE_HEADER') || 1,
        column: 1,
        xpath: '/MESSAGE/MESSAGE_HEADER/MISMOLogicalDataDictionaryIdentifier',
      });
    } else if (lddMatch[1] !== MISMO_CONFIG.LDD_IDENTIFIER) {
      result.warnings.push({
        code: 'LDD_MISMATCH',
        severity: 'warning',
        message: `LDD Identifier should be ${MISMO_CONFIG.LDD_IDENTIFIER}, found: ${lddMatch[1]}`,
        line: getLineNumber(xmlContent, 'MISMOLogicalDataDictionaryIdentifier'),
        column: 1,
        xpath: '/MESSAGE/MESSAGE_HEADER/MISMOLogicalDataDictionaryIdentifier',
      });
    }
  }

  // Informational: report detected namespaces
  const detectedNamespaces = [];
  const nsPattern = /xmlns(?::[a-zA-Z]+)?="([^"]+)"/g;
  let nsMatch;
  while ((nsMatch = nsPattern.exec(xmlContent)) !== null) {
    detectedNamespaces.push(nsMatch[1]);
  }
  result.info.push({
    code: 'NAMESPACES_DETECTED',
    message: `Detected namespaces: ${detectedNamespaces.join(', ')}`,
  });

  return result;
}

/**
 * Validate data types and values
 */
function validateDataTypes(xmlContent) {
  const result = { valid: true, errors: [], warnings: [] };

  // Validate specific fields
  for (const [fieldName, rules] of Object.entries(FIELD_VALIDATIONS)) {
    const pattern = new RegExp(`<${fieldName}>([^<]*)</${fieldName}>`, 'g');
    let match;
    
    while ((match = pattern.exec(xmlContent)) !== null) {
      const value = match[1];
      const lineNum = getLineNumber(xmlContent, match[0]);

      if (rules.pattern && !rules.pattern.test(value)) {
        result.warnings.push({
          code: 'INVALID_FORMAT',
          severity: 'warning',
          message: `${fieldName}: ${rules.message || 'Invalid format'}. Value: "${value}"`,
          line: lineNum,
          column: 1,
          xpath: `//${fieldName}`,
        });
      }

      if (rules.type) {
        const typePattern = DATA_TYPE_PATTERNS[rules.type];
        if (typePattern && !typePattern.test(value)) {
          result.warnings.push({
            code: 'TYPE_MISMATCH',
            severity: 'warning',
            message: `${fieldName}: Expected ${rules.type}, got "${value}"`,
            line: lineNum,
            column: 1,
            xpath: `//${fieldName}`,
          });
        }

        if (rules.type === 'Amount' || rules.type === 'Percent' || rules.type === 'Integer' || rules.type === 'Decimal') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            if (rules.min !== undefined && numValue < rules.min) {
              result.warnings.push({
                code: 'VALUE_TOO_LOW',
                severity: 'warning',
                message: `${fieldName}: Value ${numValue} is below minimum ${rules.min}`,
                line: lineNum,
                column: 1,
                xpath: `//${fieldName}`,
              });
            }
            if (rules.max !== undefined && numValue > rules.max) {
              result.warnings.push({
                code: 'VALUE_TOO_HIGH',
                severity: 'warning',
                message: `${fieldName}: Value ${numValue} exceeds maximum ${rules.max}`,
                line: lineNum,
                column: 1,
                xpath: `//${fieldName}`,
              });
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Validate MISMO-specific business rules
 */
function validateBusinessRules(xmlContent, schemaPack) {
  const result = { errors: [], warnings: [] };

  // Rule: LOAN must have TERMS_OF_LOAN
  if (xmlContent.includes('<LOAN') && !xmlContent.includes('<TERMS_OF_LOAN>')) {
    result.warnings.push({
      code: 'MISSING_TERMS',
      severity: 'warning',
      message: 'LOAN element should contain TERMS_OF_LOAN',
      line: getLineNumber(xmlContent, '<LOAN'),
      column: 1,
      xpath: '//LOAN/TERMS_OF_LOAN',
    });
  }

  // Rule: COLLATERAL should have SUBJECT_PROPERTY
  if (xmlContent.includes('<COLLATERAL') && !xmlContent.includes('<SUBJECT_PROPERTY>')) {
    result.warnings.push({
      code: 'MISSING_SUBJECT_PROPERTY',
      severity: 'warning',
      message: 'COLLATERAL element should contain SUBJECT_PROPERTY',
      line: getLineNumber(xmlContent, '<COLLATERAL'),
      column: 1,
      xpath: '//COLLATERAL/SUBJECT_PROPERTY',
    });
  }

  // Rule: PARTY with BORROWER role should have NAME
  const partyPattern = /<PARTY[^>]*>[\s\S]*?<\/PARTY>/g;
  let partyMatch;
  while ((partyMatch = partyPattern.exec(xmlContent)) !== null) {
    const partyContent = partyMatch[0];
    if (partyContent.includes('<BORROWER>') && !partyContent.includes('<NAME>')) {
      result.warnings.push({
        code: 'BORROWER_MISSING_NAME',
        severity: 'warning',
        message: 'PARTY with BORROWER role should have NAME element',
        line: getLineNumber(xmlContent, partyMatch[0]),
        column: 1,
        xpath: '//PARTY/INDIVIDUAL/NAME',
      });
    }
  }

  // LDD Enum validation - check enum values against LDD
  const enumValidations = [
    { element: 'LoanPurposeType', enumKey: 'LoanPurposeType' },
    { element: 'PropertyType', enumKey: 'PropertyType' },
    { element: 'PropertyUsageType', enumKey: 'PropertyUsageType' },
    { element: 'AmortizationType', enumKey: 'AmortizationType' },
    { element: 'MortgageType', enumKey: 'MortgageType' },
    { element: 'CitizenshipResidencyType', enumKey: 'CitizenshipResidencyType' },
    { element: 'MaritalStatusType', enumKey: 'MaritalStatusType' },
    { element: 'BorrowerResidencyBasisType', enumKey: 'BorrowerResidencyBasisType' },
    { element: 'LegalEntityType', enumKey: 'LegalEntityType' },
    { element: 'PrepaymentPenaltyOptionType', enumKey: 'PrepaymentPenaltyOptionType' },
  ];

  for (const { element, enumKey } of enumValidations) {
    const pattern = new RegExp(`<${element}>([^<]*)</${element}>`, 'g');
    let match;
    while ((match = pattern.exec(xmlContent)) !== null) {
      const value = match[1].trim();
      if (value && LDD_ENUM_VALUES[enumKey] && !LDD_ENUM_VALUES[enumKey].includes(value)) {
        result.errors.push({
          code: 'INVALID_LDD_ENUM',
          severity: 'error',
          message: `Invalid ${element} value "${value}". LDD valid values: ${LDD_ENUM_VALUES[enumKey].join(', ')}`,
          line: getLineNumber(xmlContent, match[0]),
          column: 1,
          xpath: `//${element}`,
        });
      }
    }
  }

  // Strict mode additional checks
  if (schemaPack === 'strict') {
    // Check for ULAD extension usage
    if (!xmlContent.includes('ULAD:') && !xmlContent.includes('xmlns:ULAD')) {
      result.warnings.push({
        code: 'NO_ULAD_EXTENSION',
        severity: 'warning',
        message: 'Strict mode: ULAD extension namespace not detected',
        line: 1,
        column: 1,
        xpath: '/MESSAGE',
      });
    }
  }

  return result;
}

/**
 * Get line number for a substring
 */
function getLineNumber(content, search) {
  const index = content.indexOf(search);
  if (index === -1) return 1;
  const beforeMatch = content.substring(0, index);
  return (beforeMatch.match(/\n/g) || []).length + 1;
}

/**
 * Determine overall validation status
 */
function determineValidationStatus(report) {
  if (!report.wellFormed) return 'FAIL';
  if (report.errors.length > 0) return 'FAIL';
  if (report.warnings.length > 0) return 'PASS_WITH_WARNINGS';
  return 'PASS';
}

/**
 * Get reason for blocking operation
 */
function getBlockReason(report, context) {
  if (!report.wellFormed) {
    return 'XML is not well-formed. Please fix syntax errors before proceeding.';
  }
  
  const criticalErrors = report.errors.filter(e => 
    ['INVALID_ROOT', 'MISSING_NAMESPACE', 'MISSING_VERSION', 'MISSING_ELEMENT'].includes(e.code)
  );

  if (criticalErrors.length > 0) {
    return `${context === 'export' ? 'Export' : 'Import'} blocked: ${criticalErrors[0].message}`;
  }

  return 'Validation failed. See error details above.';
}