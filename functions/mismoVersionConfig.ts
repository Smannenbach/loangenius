/**
 * MISMO Version Configuration - Centralized version lock for all XML exports/imports
 * 
 * MISMO Version: 3.4
 * Build: 324
 * Root Element: MESSAGE
 * LDD Identifier: urn:fdc:mismo.org:ldd:3.4.324
 */

export const MISMO_CONFIG = {
  VERSION: '3.4',
  BUILD: '324',
  VERSION_ID: '3.4.0',
  ROOT_ELEMENT: 'MESSAGE',
  NAMESPACE: 'http://www.mismo.org/residential/2009/schemas',
  XSI_NAMESPACE: 'http://www.w3.org/2001/XMLSchema-instance',
  XLINK_NAMESPACE: 'http://www.w3.org/1999/xlink',
  SCHEMA_LOCATION: 'http://www.mismo.org/residential/2009/schemas MISMO_3.4.0_B324.xsd',
  
  // Logical Data Dictionary Identifier per MISMO spec for Build 324
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
  LDD_IDENTIFIER_TYPE: 'MISMOLogicalDataDictionary',
  
  // Extension namespaces
  ULAD_NAMESPACE: 'http://www.datamodelextension.org/Schema/ULAD',
  DU_NAMESPACE: 'http://www.datamodelextension.org/Schema/DU',
  LG_NAMESPACE: 'urn:loangenius:mismo:extension:1.0',
  LG_PREFIX: 'LG',
};

/**
 * Generate the standard MISMO 3.4 Build 324 XML header with MESSAGE root
 * @param {Object} options - Optional overrides
 * @returns {string} XML declaration and opening MESSAGE tag
 */
export function generateMISMOHeader(options = {}) {
  const {
    includeULAD = true,
    includeDU = false,
    includeLG = true,
    messageId = `MSG-${Date.now()}`,
    timestamp = new Date().toISOString(),
  } = options;

  let namespaces = `xmlns="${MISMO_CONFIG.NAMESPACE}"
         xmlns:xsi="${MISMO_CONFIG.XSI_NAMESPACE}"
         xmlns:xlink="${MISMO_CONFIG.XLINK_NAMESPACE}"`;
  
  if (includeULAD) {
    namespaces += `
         xmlns:ULAD="${MISMO_CONFIG.ULAD_NAMESPACE}"`;
  }
  if (includeDU) {
    namespaces += `
         xmlns:DU="${MISMO_CONFIG.DU_NAMESPACE}"`;
  }
  if (includeLG) {
    namespaces += `
         xmlns:${MISMO_CONFIG.LG_PREFIX}="${MISMO_CONFIG.LG_NAMESPACE}"`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<${MISMO_CONFIG.ROOT_ELEMENT} ${namespaces}
         xsi:schemaLocation="${MISMO_CONFIG.SCHEMA_LOCATION}"
         MISMOVersionID="${MISMO_CONFIG.VERSION_ID}">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${timestamp}</CreatedDatetime>
      <DataVersionIdentifier>1.0</DataVersionIdentifier>
      <DataVersionName>LoanGenius MISMO ${MISMO_CONFIG.VERSION} Build ${MISMO_CONFIG.BUILD} Export</DataVersionName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <MESSAGE_HEADER>
    <MessageIdentifier>${messageId}</MessageIdentifier>
    <MessageDatetime>${timestamp}</MessageDatetime>
    <SenderName>LoanGenius</SenderName>
    <MISMOLogicalDataDictionaryIdentifier>${MISMO_CONFIG.LDD_IDENTIFIER}</MISMOLogicalDataDictionaryIdentifier>
  </MESSAGE_HEADER>`;
}

/**
 * Generate the closing MESSAGE tag
 * @returns {string} Closing MESSAGE tag
 */
export function generateMISMOFooter() {
  return `
</${MISMO_CONFIG.ROOT_ELEMENT}>`;
}

/**
 * Validate that an imported XML declares the correct MISMO version/build
 * @param {string} xmlContent - The XML content to validate
 * @returns {Object} Validation result with isConforming, version, build, and issues
 */
export function validateMISMOVersion(xmlContent) {
  const result = {
    isConforming: true,
    version: null,
    build: null,
    lddIdentifier: null,
    issues: [],
    rootElement: null,
  };

  // Check for MESSAGE root element
  const rootMatch = xmlContent.match(/<([A-Z_]+)\s+[^>]*xmlns=/);
  if (rootMatch) {
    result.rootElement = rootMatch[1];
    if (result.rootElement !== MISMO_CONFIG.ROOT_ELEMENT) {
      result.issues.push({
        type: 'error',
        field: 'root_element',
        message: `Root element is '${result.rootElement}', expected '${MISMO_CONFIG.ROOT_ELEMENT}'`,
      });
      result.isConforming = false;
    }
  } else {
    result.issues.push({
      type: 'error',
      field: 'root_element',
      message: 'Could not determine root element',
    });
    result.isConforming = false;
  }

  // Check MISMOVersionID attribute
  const versionMatch = xmlContent.match(/MISMOVersionID="([^"]+)"/);
  if (versionMatch) {
    result.version = versionMatch[1];
    if (!result.version.startsWith(MISMO_CONFIG.VERSION)) {
      result.issues.push({
        type: 'warning',
        field: 'version',
        message: `MISMO version is '${result.version}', expected '${MISMO_CONFIG.VERSION}.x'`,
      });
    }
  } else {
    result.issues.push({
      type: 'error',
      field: 'version',
      message: 'MISMOVersionID attribute not found',
    });
    result.isConforming = false;
  }

  // Check for LDD Identifier
  const lddMatch = xmlContent.match(/<MISMOLogicalDataDictionaryIdentifier>([^<]+)<\/MISMOLogicalDataDictionaryIdentifier>/);
  if (lddMatch) {
    result.lddIdentifier = lddMatch[1];
    if (result.lddIdentifier !== MISMO_CONFIG.LDD_IDENTIFIER) {
      result.issues.push({
        type: 'warning',
        field: 'ldd_identifier',
        message: `LDD Identifier is '${result.lddIdentifier}', expected '${MISMO_CONFIG.LDD_IDENTIFIER}'`,
      });
    }
  } else {
    result.issues.push({
      type: 'warning',
      field: 'ldd_identifier',
      message: 'MISMOLogicalDataDictionaryIdentifier not found in MESSAGE_HEADER',
    });
  }

  // Extract build from schema location if present
  const schemaMatch = xmlContent.match(/MISMO_3\.4\.0_B(\d+)\.xsd/);
  if (schemaMatch) {
    result.build = schemaMatch[1];
    if (result.build !== MISMO_CONFIG.BUILD) {
      result.issues.push({
        type: 'warning',
        field: 'build',
        message: `Schema references Build ${result.build}, expected Build ${MISMO_CONFIG.BUILD}`,
      });
    }
  }

  return result;
}

/**
 * Wrap import validation result into a standardized response
 * @param {Object} validationResult - Result from validateMISMOVersion
 * @returns {Object} Import assessment with conformance status
 */
export function assessImportConformance(validationResult) {
  const hasErrors = validationResult.issues.some(i => i.type === 'error');
  const hasWarnings = validationResult.issues.some(i => i.type === 'warning');

  return {
    conformance_status: hasErrors ? 'non-conforming' : hasWarnings ? 'conforming-with-warnings' : 'conforming',
    is_valid: !hasErrors,
    mismo_version: validationResult.version,
    mismo_build: validationResult.build,
    ldd_identifier: validationResult.lddIdentifier,
    root_element: validationResult.rootElement,
    issues: validationResult.issues,
    expected: {
      version: MISMO_CONFIG.VERSION,
      build: MISMO_CONFIG.BUILD,
      ldd_identifier: MISMO_CONFIG.LDD_IDENTIFIER,
      root_element: MISMO_CONFIG.ROOT_ELEMENT,
    },
  };
}