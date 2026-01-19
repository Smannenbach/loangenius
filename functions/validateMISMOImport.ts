/**
 * Validate MISMO XML Import
 * Checks incoming XML for MISMO 3.4 Build 324 conformance
 * 
 * Acceptance Criteria:
 * - Root element MUST be MESSAGE
 * - MISMOVersionID attribute must be present
 * - MISMOLogicalDataDictionaryIdentifier should be urn:fdc:mismo.org:ldd:3.4.324
 * - Non-conforming imports are flagged but can still be processed
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO Version Lock Configuration - Build 324
const MISMO_CONFIG = {
  VERSION: '3.4',
  BUILD: '324',
  VERSION_ID: '3.4.0',
  ROOT_ELEMENT: 'MESSAGE',
  NAMESPACE: 'http://www.mismo.org/residential/2009/schemas',
  XSI_NAMESPACE: 'http://www.w3.org/2001/XMLSchema-instance',
  SCHEMA_LOCATION: 'http://www.mismo.org/residential/2009/schemas MISMO_3.4.0_B324.xsd',
  LDD_IDENTIFIER: 'urn:fdc:mismo.org:ldd:3.4.324',
};

/**
 * Validate that an imported XML declares the correct MISMO version/build
 */
function validateMISMOVersion(xmlContent) {
  const result = {
    isConforming: true,
    version: null,
    build: null,
    lddIdentifier: null,
    issues: [],
    rootElement: null,
  };

  const rootMatch = xmlContent.match(/<([A-Z_]+)\s+[^>]*xmlns=/);
  if (rootMatch) {
    result.rootElement = rootMatch[1];
    if (result.rootElement !== MISMO_CONFIG.ROOT_ELEMENT) {
      result.issues.push({ type: 'error', field: 'root_element', message: `Root element is '${result.rootElement}', expected '${MISMO_CONFIG.ROOT_ELEMENT}'` });
      result.isConforming = false;
    }
  } else {
    result.issues.push({ type: 'error', field: 'root_element', message: 'Could not determine root element' });
    result.isConforming = false;
  }

  const versionMatch = xmlContent.match(/MISMOVersionID="([^"]+)"/);
  if (versionMatch) {
    result.version = versionMatch[1];
    if (!result.version.startsWith(MISMO_CONFIG.VERSION)) {
      result.issues.push({ type: 'warning', field: 'version', message: `MISMO version is '${result.version}', expected '${MISMO_CONFIG.VERSION}.x'` });
    }
  } else {
    result.issues.push({ type: 'error', field: 'version', message: 'MISMOVersionID attribute not found' });
    result.isConforming = false;
  }

  const lddMatch = xmlContent.match(/<MISMOLogicalDataDictionaryIdentifier>([^<]+)<\/MISMOLogicalDataDictionaryIdentifier>/);
  if (lddMatch) {
    result.lddIdentifier = lddMatch[1];
    if (result.lddIdentifier !== MISMO_CONFIG.LDD_IDENTIFIER) {
      result.issues.push({ type: 'warning', field: 'ldd_identifier', message: `LDD Identifier is '${result.lddIdentifier}', expected '${MISMO_CONFIG.LDD_IDENTIFIER}'` });
    }
  } else {
    result.issues.push({ type: 'warning', field: 'ldd_identifier', message: 'MISMOLogicalDataDictionaryIdentifier not found' });
  }

  const schemaMatch = xmlContent.match(/MISMO_3\.4\.0_B(\d+)\.xsd/);
  if (schemaMatch) {
    result.build = schemaMatch[1];
    if (result.build !== MISMO_CONFIG.BUILD) {
      result.issues.push({ type: 'warning', field: 'build', message: `Schema references Build ${result.build}, expected Build ${MISMO_CONFIG.BUILD}` });
    }
  }

  return result;
}

function assessImportConformance(validationResult) {
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
    expected: { version: MISMO_CONFIG.VERSION, build: MISMO_CONFIG.BUILD, ldd_identifier: MISMO_CONFIG.LDD_IDENTIFIER, root_element: MISMO_CONFIG.ROOT_ELEMENT },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { xml_content, file_url, reject_non_conforming = false } = await req.json();

    let xmlToValidate = xml_content;

    // If file_url provided, fetch the content
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

    // Validate MISMO version/build
    const validationResult = validateMISMOVersion(xmlToValidate);
    const assessment = assessImportConformance(validationResult);

    // If reject_non_conforming is true and the import is non-conforming, reject it
    if (reject_non_conforming && assessment.conformance_status === 'non-conforming') {
      return Response.json({
        success: false,
        rejected: true,
        reason: 'Import rejected due to non-conformance with MISMO 3.4 Build 324',
        ...assessment,
      }, { status: 400 });
    }

    // Extract basic loan data for preview (even if non-conforming)
    const extractedData = extractBasicLoanData(xmlToValidate);

    return Response.json({
      success: true,
      rejected: false,
      ...assessment,
      extracted_preview: extractedData,
      message: assessment.conformance_status === 'non-conforming' 
        ? 'WARNING: This file does not fully conform to MISMO 3.4 Build 324. Data may be imported but some fields might not map correctly.'
        : assessment.conformance_status === 'conforming-with-warnings'
        ? 'File conforms to MISMO 3.4 with minor version/build differences.'
        : 'File conforms to MISMO 3.4 Build 324.',
    });
  } catch (error) {
    console.error('MISMO validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Extract basic loan data from MISMO XML for preview purposes
 */
function extractBasicLoanData(xmlContent) {
  const data = {
    loan_identifier: null,
    loan_amount: null,
    interest_rate: null,
    loan_purpose: null,
    property_address: null,
    borrower_name: null,
  };

  try {
    // Extract loan identifier
    const loanIdMatch = xmlContent.match(/<LoanIdentifier>([^<]+)<\/LoanIdentifier>/);
    if (loanIdMatch) data.loan_identifier = loanIdMatch[1];

    // Extract loan amount (try multiple possible element names)
    const loanAmountMatch = xmlContent.match(/<(?:BaseLoanAmount|NoteAmount)>([^<]+)<\/(?:BaseLoanAmount|NoteAmount)>/);
    if (loanAmountMatch) data.loan_amount = parseFloat(loanAmountMatch[1]);

    // Extract interest rate
    const rateMatch = xmlContent.match(/<NoteRatePercent>([^<]+)<\/NoteRatePercent>/);
    if (rateMatch) data.interest_rate = parseFloat(rateMatch[1]);

    // Extract loan purpose
    const purposeMatch = xmlContent.match(/<LoanPurposeType>([^<]+)<\/LoanPurposeType>/);
    if (purposeMatch) data.loan_purpose = purposeMatch[1];

    // Extract property address
    const streetMatch = xmlContent.match(/<SUBJECT_PROPERTY>[\s\S]*?<AddressLineText>([^<]+)<\/AddressLineText>/);
    const cityMatch = xmlContent.match(/<SUBJECT_PROPERTY>[\s\S]*?<CityName>([^<]+)<\/CityName>/);
    const stateMatch = xmlContent.match(/<SUBJECT_PROPERTY>[\s\S]*?<StateCode>([^<]+)<\/StateCode>/);
    if (streetMatch || cityMatch || stateMatch) {
      data.property_address = [
        streetMatch?.[1],
        cityMatch?.[1],
        stateMatch?.[1],
      ].filter(Boolean).join(', ');
    }

    // Extract borrower name
    const firstNameMatch = xmlContent.match(/<PARTY[\s\S]*?<FirstName>([^<]+)<\/FirstName>/);
    const lastNameMatch = xmlContent.match(/<PARTY[\s\S]*?<LastName>([^<]+)<\/LastName>/);
    if (firstNameMatch || lastNameMatch) {
      data.borrower_name = [firstNameMatch?.[1], lastNameMatch?.[1]].filter(Boolean).join(' ');
    }
  } catch (e) {
    console.error('Error extracting loan data:', e);
  }

  return data;
}