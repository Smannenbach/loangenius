/**
 * MISMO Extension Registry per MEG-0025
 * 
 * This module manages MISMO extensions following MEG-0025 guidelines:
 * - Separates MISMO-standard data from extended data
 * - Supports multiple org namespaces coexisting
 * - Enables simultaneous schema validation of MISMO + OTHER content
 * 
 * LoanGenius Extension Namespace:
 * - URI: urn:loangenius:mismo:extension:1.0
 * - Prefix: LG
 * - Version: 1.0.0
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// LoanGenius Extension Registry Configuration
const LG_EXTENSION_CONFIG = {
  namespace_uri: 'urn:loangenius:mismo:extension:1.0',
  namespace_prefix: 'LG',
  version: '1.0.0',
  schema_location: 'urn:loangenius:mismo:extension:1.0 LoanGeniusExtension_1.0.xsd',
  description: 'LoanGenius DSCR and Business Purpose Loan Extensions',
};

// Registry of all LoanGenius extension elements
const LG_EXTENSION_ELEMENTS = {
  // DSCR-specific fields (not in MISMO 3.4 standard)
  DSCR: {
    element: 'DSCRData',
    description: 'DSCR loan-specific data container',
    children: [
      { name: 'DebtServiceCoverageRatio', type: 'decimal', description: 'Calculated DSCR value' },
      { name: 'DSCRCalculationMethod', type: 'string', enum: ['ActualRent', 'MarketRent', 'LesserOf'], description: 'Method used to calculate DSCR' },
      { name: 'GrossMonthlyRent', type: 'decimal', description: 'Gross monthly rental income' },
      { name: 'MonthlyPITIA', type: 'decimal', description: 'Monthly Principal, Interest, Taxes, Insurance, HOA' },
      { name: 'VacancyFactorPercent', type: 'decimal', description: 'Vacancy factor applied to rental income' },
      { name: 'ManagementFeePercent', type: 'decimal', description: 'Property management fee percentage' },
      { name: 'MaintenanceReservePercent', type: 'decimal', description: 'Maintenance reserve percentage' },
      { name: 'NetOperatingIncome', type: 'decimal', description: 'NOI after expenses' },
      { name: 'AnnualDebtService', type: 'decimal', description: 'Annual debt service amount' },
    ]
  },
  
  // Business Purpose indicators
  BusinessPurpose: {
    element: 'BusinessPurposeData',
    description: 'Business purpose loan indicators',
    children: [
      { name: 'BusinessPurposeIndicator', type: 'boolean', description: 'Is this a business purpose loan' },
      { name: 'BusinessPurposeType', type: 'string', enum: ['Investment', 'Commercial', 'Construction', 'Rehabilitation'], description: 'Type of business purpose' },
      { name: 'BorrowerEntityIndicator', type: 'boolean', description: 'Is borrower an entity (LLC, Corp, Trust)' },
      { name: 'BorrowerEntityType', type: 'string', enum: ['LLC', 'Corporation', 'SCorp', 'Partnership', 'Trust', 'Individual'], description: 'Type of borrowing entity' },
      { name: 'BorrowerEntityName', type: 'string', description: 'Legal name of borrowing entity' },
      { name: 'BorrowerEntityEIN', type: 'string', description: 'Entity EIN (masked)' },
      { name: 'BorrowerEntityStateOfFormation', type: 'string', description: 'State where entity was formed' },
    ]
  },
  
  // Short-term rental / STR fields
  ShortTermRental: {
    element: 'ShortTermRentalData',
    description: 'Short-term rental property data',
    children: [
      { name: 'ShortTermRentalIndicator', type: 'boolean', description: 'Is property used for STR' },
      { name: 'STRPlatform', type: 'string', enum: ['Airbnb', 'VRBO', 'BookingCom', 'Other'], description: 'Primary STR platform' },
      { name: 'ProjectedAnnualSTRIncome', type: 'decimal', description: 'Projected annual STR income' },
      { name: 'AverageOccupancyRatePercent', type: 'decimal', description: 'Average occupancy rate' },
      { name: 'AverageDailyRate', type: 'decimal', description: 'Average daily rate (ADR)' },
    ]
  },
  
  // Prepayment penalty details
  PrepaymentDetails: {
    element: 'PrepaymentPenaltyDetails',
    description: 'Extended prepayment penalty information',
    children: [
      { name: 'PrepaymentPenaltySchedule', type: 'string', description: 'Stepdown schedule (e.g., 5-4-3-2-1)' },
      { name: 'PrepaymentCalculationBasis', type: 'string', enum: ['OriginalBalance', 'CurrentBalance', 'Fixed'], description: 'Basis for penalty calculation' },
      { name: 'PrepaymentPenaltyMaxAmount', type: 'decimal', description: 'Maximum penalty amount' },
    ]
  },
  
  // LoanGenius-specific metadata
  LoanGeniusMetadata: {
    element: 'LoanGeniusMetadata',
    description: 'LoanGenius platform metadata',
    children: [
      { name: 'LGDealNumber', type: 'string', description: 'LoanGenius deal number' },
      { name: 'LGOrganizationId', type: 'string', description: 'LoanGenius organization ID' },
      { name: 'LGExportTimestamp', type: 'datetime', description: 'Export timestamp' },
      { name: 'LGExportVersion', type: 'string', description: 'Export function version' },
      { name: 'LGProductType', type: 'string', description: 'LoanGenius product type' },
    ]
  },
  
  // Investor experience fields
  InvestorExperience: {
    element: 'InvestorExperienceData',
    description: 'Real estate investor experience data',
    children: [
      { name: 'YearsOfREExperience', type: 'integer', description: 'Years of real estate investing experience' },
      { name: 'TotalPropertiesOwned', type: 'integer', description: 'Total properties currently owned' },
      { name: 'PropertiesPurchasedLast24Months', type: 'integer', description: 'Properties purchased in last 24 months' },
      { name: 'PropertiesSoldLast24Months', type: 'integer', description: 'Properties sold in last 24 months' },
      { name: 'FirstTimeInvestorIndicator', type: 'boolean', description: 'Is borrower a first-time investor' },
    ]
  },
};

// Supported third-party extension namespaces (for multi-namespace support)
const THIRD_PARTY_NAMESPACES = {
  ULAD: {
    namespace_uri: 'http://www.datamodelextension.org/Schema/ULAD',
    prefix: 'ULAD',
    description: 'Uniform Loan Application Dataset',
  },
  DU: {
    namespace_uri: 'http://www.datamodelextension.org/Schema/DU',
    prefix: 'DU',
    description: 'Desktop Underwriter',
  },
  LP: {
    namespace_uri: 'http://www.datamodelextension.org/Schema/LP',
    prefix: 'LP',
    description: 'Loan Prospector',
  },
};

// Extension placement rules per MEG-0025
const EXTENSION_PLACEMENT_RULES = {
  LOAN: ['DSCR', 'BusinessPurpose', 'PrepaymentDetails', 'LoanGeniusMetadata'],
  PROPERTY: ['ShortTermRental'],
  BORROWER: ['InvestorExperience'],
  DEAL: ['LoanGeniusMetadata'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'get_registry':
        return Response.json({
          success: true,
          registry: {
            lg_config: LG_EXTENSION_CONFIG,
            lg_elements: LG_EXTENSION_ELEMENTS,
            third_party_namespaces: THIRD_PARTY_NAMESPACES,
            placement_rules: EXTENSION_PLACEMENT_RULES,
          }
        });

      case 'get_extension_schema':
        return Response.json({
          success: true,
          xsd: generateExtensionXSD(),
        });

      case 'build_extension_xml':
        return Response.json({
          success: true,
          extension_xml: buildExtensionXML(params.data, params.container_type),
        });

      case 'validate_extension':
        return Response.json({
          success: true,
          validation: validateExtensionData(params.extension_data, params.element_type),
        });

      case 'list_elements':
        return Response.json({
          success: true,
          elements: Object.entries(LG_EXTENSION_ELEMENTS).map(([key, value]) => ({
            key,
            element: value.element,
            description: value.description,
            child_count: value.children.length,
          })),
        });

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Extension registry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Generate XSD schema for LoanGenius extensions
 */
function generateExtensionXSD() {
  let xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema 
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:LG="${LG_EXTENSION_CONFIG.namespace_uri}"
  targetNamespace="${LG_EXTENSION_CONFIG.namespace_uri}"
  elementFormDefault="qualified">
  
  <xs:annotation>
    <xs:documentation>
      ${LG_EXTENSION_CONFIG.description}
      Version: ${LG_EXTENSION_CONFIG.version}
    </xs:documentation>
  </xs:annotation>
  
  <!-- LoanGenius Extension Root Container -->
  <xs:complexType name="LoanGeniusExtensionType">
    <xs:sequence>
`;

  // Add each extension element type
  for (const [key, config] of Object.entries(LG_EXTENSION_ELEMENTS)) {
    xsd += `      <xs:element name="${config.element}" type="LG:${config.element}Type" minOccurs="0"/>\n`;
  }

  xsd += `    </xs:sequence>
  </xs:complexType>
  
`;

  // Define each element type
  for (const [key, config] of Object.entries(LG_EXTENSION_ELEMENTS)) {
    xsd += `  <!-- ${config.description} -->
  <xs:complexType name="${config.element}Type">
    <xs:sequence>
`;
    for (const child of config.children) {
      const xsType = mapToXSDType(child.type);
      xsd += `      <xs:element name="${child.name}" type="${xsType}" minOccurs="0">
        <xs:annotation>
          <xs:documentation>${child.description}</xs:documentation>
        </xs:annotation>
      </xs:element>
`;
    }
    xsd += `    </xs:sequence>
  </xs:complexType>
  
`;
  }

  // Add enum types
  for (const [key, config] of Object.entries(LG_EXTENSION_ELEMENTS)) {
    for (const child of config.children) {
      if (child.enum) {
        xsd += `  <!-- ${child.name} enumeration -->
  <xs:simpleType name="${child.name}Type">
    <xs:restriction base="xs:string">
`;
        for (const enumVal of child.enum) {
          xsd += `      <xs:enumeration value="${enumVal}"/>\n`;
        }
        xsd += `    </xs:restriction>
  </xs:simpleType>
  
`;
      }
    }
  }

  xsd += `</xs:schema>`;
  return xsd;
}

function mapToXSDType(type) {
  const typeMap = {
    'string': 'xs:string',
    'decimal': 'xs:decimal',
    'integer': 'xs:integer',
    'boolean': 'xs:boolean',
    'datetime': 'xs:dateTime',
    'date': 'xs:date',
  };
  return typeMap[type] || 'xs:string';
}

/**
 * Build EXTENSION XML container per MEG-0025
 * Extensions must be placed inside EXTENSION/OTHER containers
 */
function buildExtensionXML(data, containerType = 'LOAN') {
  const escapeXml = (str) => (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const allowedElements = EXTENSION_PLACEMENT_RULES[containerType] || [];
  let extensionContent = '';

  for (const elementKey of allowedElements) {
    const elementConfig = LG_EXTENSION_ELEMENTS[elementKey];
    if (!elementConfig) continue;

    const elementData = data[elementKey];
    if (!elementData || Object.keys(elementData).length === 0) continue;

    extensionContent += `      <${LG_EXTENSION_CONFIG.namespace_prefix}:${elementConfig.element}>\n`;
    
    for (const child of elementConfig.children) {
      const value = elementData[child.name];
      if (value !== undefined && value !== null && value !== '') {
        extensionContent += `        <${LG_EXTENSION_CONFIG.namespace_prefix}:${child.name}>${escapeXml(value)}</${LG_EXTENSION_CONFIG.namespace_prefix}:${child.name}>\n`;
      }
    }
    
    extensionContent += `      </${LG_EXTENSION_CONFIG.namespace_prefix}:${elementConfig.element}>\n`;
  }

  if (!extensionContent) {
    return '';
  }

  // Per MEG-0025: Extensions must be wrapped in EXTENSION/OTHER
  return `  <EXTENSION>
    <OTHER xmlns:${LG_EXTENSION_CONFIG.namespace_prefix}="${LG_EXTENSION_CONFIG.namespace_uri}">
${extensionContent}    </OTHER>
  </EXTENSION>`;
}

/**
 * Validate extension data against registry
 */
function validateExtensionData(extensionData, elementType) {
  const elementConfig = LG_EXTENSION_ELEMENTS[elementType];
  if (!elementConfig) {
    return {
      valid: false,
      errors: [`Unknown extension element type: ${elementType}`],
    };
  }

  const errors = [];
  const warnings = [];

  for (const child of elementConfig.children) {
    const value = extensionData[child.name];
    
    // Check enum values
    if (child.enum && value !== undefined && value !== null && value !== '') {
      if (!child.enum.includes(value)) {
        errors.push(`Invalid value for ${child.name}: ${value}. Must be one of: ${child.enum.join(', ')}`);
      }
    }
    
    // Type validation
    if (value !== undefined && value !== null) {
      if (child.type === 'decimal' && isNaN(parseFloat(value))) {
        errors.push(`${child.name} must be a decimal number`);
      }
      if (child.type === 'integer' && !Number.isInteger(Number(value))) {
        errors.push(`${child.name} must be an integer`);
      }
      if (child.type === 'boolean' && typeof value !== 'boolean') {
        warnings.push(`${child.name} should be a boolean (true/false)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    element_type: elementType,
    element_name: elementConfig.element,
  };
}