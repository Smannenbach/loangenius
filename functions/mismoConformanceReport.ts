import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MISMO Conformance Report Generator
// Generates comprehensive reports for import/export with PII redaction

// Sensitive field patterns
const PII_PATTERNS = [
  { pattern: /ssn/i, type: 'SSN' },
  { pattern: /socialsecurity/i, type: 'SSN' },
  { pattern: /taxpayer/i, type: 'TaxID' },
  { pattern: /dateofbirth|dob|birthdate/i, type: 'DOB' },
  { pattern: /ein|employeridentification/i, type: 'EIN' },
  { pattern: /accountnumber/i, type: 'Account' },
  { pattern: /routingnumber/i, type: 'Routing' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      action, 
      context, // 'export' or 'import'
      validation_result,
      mapping_result,
      canonical_data,
      pack_id,
      run_id
    } = await req.json();

    // ACTION: Generate full conformance report
    if (action === 'generate') {
      const report = generateConformanceReport({
        context,
        validation_result,
        mapping_result,
        canonical_data,
        pack_id,
        run_id,
        generated_by: user.email
      });
      
      return Response.json({
        success: true,
        report
      });
    }

    // ACTION: Redact PII from a report
    if (action === 'redact_pii') {
      const { report } = await req.json();
      const redacted = redactPiiFromReport(report);
      return Response.json({
        success: true,
        redacted_report: redacted
      });
    }

    // ACTION: Get report template
    if (action === 'get_template') {
      return Response.json({
        success: true,
        template: getReportTemplate()
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Conformance Report error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

// Generate comprehensive conformance report
function generateConformanceReport(params) {
  const {
    context,
    validation_result,
    mapping_result,
    canonical_data,
    pack_id,
    run_id,
    generated_by
  } = params;

  const errors = [];
  const warnings = [];

  // Category 1: Well-formedness
  if (validation_result?.well_formedness === false) {
    errors.push({
      category: 'well-formedness',
      code: 'WF001',
      line: validation_result.parse_error_line || 0,
      column: validation_result.parse_error_col || 0,
      xpath: '/',
      message: validation_result.parse_error_message || 'XML is not well-formed',
      expected: 'Valid XML document',
      actual: 'Parse error',
      severity: 'error'
    });
  }

  // Category 2: XSD Schema violations
  if (validation_result?.xsd_errors) {
    for (const xsdError of validation_result.xsd_errors) {
      errors.push({
        category: 'xsd',
        code: `XSD${String(errors.length + 1).padStart(3, '0')}`,
        line: xsdError.line || 0,
        column: xsdError.col || 0,
        xpath: xsdError.xpath || 'unknown',
        message: redactPiiFromMessage(xsdError.message),
        expected: xsdError.expected,
        actual: redactPiiFromValue(xsdError.actual, xsdError.xpath),
        severity: 'error'
      });
    }
  }

  // Category 3: Enum violations
  if (validation_result?.enum_violations) {
    for (const enumError of validation_result.enum_violations) {
      errors.push({
        category: 'enum',
        code: `ENUM${String(errors.length + 1).padStart(3, '0')}`,
        line: 0,
        column: 0,
        xpath: enumError.xpath || enumError.field,
        message: `Invalid enum value for ${enumError.field}`,
        expected: `One of: ${(enumError.allowed_values || []).join(', ')}`,
        actual: redactPiiFromValue(enumError.value, enumError.field),
        severity: 'error'
      });
    }
  }

  // Category 4: Missing required fields
  if (validation_result?.missing_required) {
    for (const missing of validation_result.missing_required) {
      errors.push({
        category: 'missing_required',
        code: `REQ${String(errors.length + 1).padStart(3, '0')}`,
        line: 0,
        column: 0,
        xpath: missing.xpath || missing.field,
        message: `Required field '${missing.label || missing.field}' is missing`,
        expected: 'Value present',
        actual: 'Empty or missing',
        severity: 'error'
      });
    }
  }

  // Category 5: Conditionality violations
  if (validation_result?.conditional_violations) {
    for (const cond of validation_result.conditional_violations) {
      errors.push({
        category: 'conditionality',
        code: `COND${String(errors.length + 1).padStart(3, '0')}`,
        line: 0,
        column: 0,
        xpath: cond.field,
        message: cond.message,
        expected: 'Condition satisfied',
        actual: 'Condition not met',
        severity: cond.severity || 'error'
      });
    }
  }

  // Category 6: Mapping gaps
  if (mapping_result?.unmapped_nodes) {
    const unmappedCount = mapping_result.unmapped_nodes.length;
    if (unmappedCount > 0) {
      warnings.push({
        category: 'mapping_gaps',
        code: 'MAP001',
        line: 0,
        column: 0,
        xpath: 'various',
        message: `${unmappedCount} fields not mapped to canonical model`,
        expected: 'All fields mapped',
        actual: `${unmappedCount} unmapped`,
        severity: 'warning',
        details: mapping_result.unmapped_nodes.slice(0, 10).map(n => ({
          xpath: n.xpath,
          element: n.element_name,
          value_preview: n.value_preview
        }))
      });
    }
  }

  // Add any validation warnings
  if (validation_result?.warnings) {
    for (const warn of validation_result.warnings) {
      warnings.push({
        category: warn.category || 'validation',
        code: `WARN${String(warnings.length + 1).padStart(3, '0')}`,
        line: warn.line || 0,
        column: warn.col || 0,
        xpath: warn.xpath || 'unknown',
        message: redactPiiFromMessage(warn.message),
        severity: 'warning'
      });
    }
  }

  // Determine overall status
  let status = 'PASS';
  if (errors.length > 0) {
    status = 'FAIL';
  } else if (warnings.length > 0) {
    status = 'PASS_WITH_WARNINGS';
  }

  // Build report
  const report = {
    report_id: `CR-${Date.now()}`,
    run_id: run_id || `RUN-${Date.now()}`,
    context, // 'export' or 'import'
    status,
    
    pack_info: {
      pack_id: pack_id || 'PACK_A_GENERIC_MISMO_34_B324',
      mismo_version: '3.4.0',
      build: 'B324'
    },
    
    summary: {
      total_errors: errors.length,
      total_warnings: warnings.length,
      by_category: {
        well_formedness: errors.filter(e => e.category === 'well-formedness').length,
        xsd: errors.filter(e => e.category === 'xsd').length,
        enum: errors.filter(e => e.category === 'enum').length,
        missing_required: errors.filter(e => e.category === 'missing_required').length,
        conditionality: errors.filter(e => e.category === 'conditionality').length,
        mapping_gaps: warnings.filter(w => w.category === 'mapping_gaps').length
      }
    },
    
    errors: errors.map(e => redactErrorPii(e)),
    warnings: warnings.map(w => redactErrorPii(w)),
    
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: generated_by,
      pii_redacted: true
    }
  };

  return report;
}

// Redact PII from error object
function redactErrorPii(error) {
  return {
    ...error,
    message: redactPiiFromMessage(error.message),
    actual: error.actual ? redactPiiFromValue(error.actual, error.xpath) : undefined,
    details: error.details?.map(d => ({
      ...d,
      value_preview: d.value_preview ? redactPiiFromValue(d.value_preview, d.xpath) : undefined
    }))
  };
}

// Redact PII from message string
function redactPiiFromMessage(message) {
  if (!message) return message;
  
  // Redact SSN patterns (XXX-XX-XXXX or XXXXXXXXX)
  message = message.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
  
  // Redact date patterns that might be DOB
  message = message.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '****-**-**');
  message = message.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '**/**/****');
  
  // Redact EIN patterns (XX-XXXXXXX)
  message = message.replace(/\b\d{2}-\d{7}\b/g, '**-*******');
  
  // Redact account numbers (sequences of 8+ digits)
  message = message.replace(/\b\d{8,}\b/g, (match) => '****' + match.slice(-4));
  
  return message;
}

// Redact PII from value based on field context
function redactPiiFromValue(value, xpath) {
  if (!value) return value;
  
  const valueStr = String(value);
  
  // Check if xpath suggests sensitive data
  for (const { pattern, type } of PII_PATTERNS) {
    if (pattern.test(xpath || '')) {
      switch (type) {
        case 'SSN':
          return '***-**-' + valueStr.slice(-4);
        case 'DOB':
          return '****-**-**';
        case 'EIN':
        case 'TaxID':
          return '**-***' + valueStr.slice(-4);
        case 'Account':
        case 'Routing':
          return '****' + valueStr.slice(-4);
        default:
          return '****';
      }
    }
  }
  
  return valueStr;
}

// Redact entire report
function redactPiiFromReport(report) {
  return {
    ...report,
    errors: report.errors?.map(e => redactErrorPii(e)),
    warnings: report.warnings?.map(w => redactErrorPii(w)),
    metadata: {
      ...report.metadata,
      pii_redacted: true,
      redacted_at: new Date().toISOString()
    }
  };
}

// Get report template structure
function getReportTemplate() {
  return {
    report_id: 'string',
    run_id: 'string',
    context: 'export | import',
    status: 'PASS | PASS_WITH_WARNINGS | FAIL',
    pack_info: {
      pack_id: 'string',
      mismo_version: 'string',
      build: 'string'
    },
    summary: {
      total_errors: 'number',
      total_warnings: 'number',
      by_category: {
        well_formedness: 'number',
        xsd: 'number',
        enum: 'number',
        missing_required: 'number',
        conditionality: 'number',
        mapping_gaps: 'number'
      }
    },
    errors: [{
      category: 'string',
      code: 'string',
      line: 'number',
      column: 'number',
      xpath: 'string',
      message: 'string (PII redacted)',
      expected: 'string',
      actual: 'string (PII redacted)',
      severity: 'error | warning'
    }],
    warnings: ['same structure as errors'],
    metadata: {
      generated_at: 'ISO timestamp',
      generated_by: 'string',
      pii_redacted: 'boolean'
    }
  };
}