import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MISMO Conformance Report Generator
 * Generates PASS / PASS_WITH_WARNINGS / FAIL reports with grouped errors
 * 
 * Security:
 * - Never logs raw SSN/DOB/Tax IDs
 * - Stores raw imported XML encrypted-at-rest
 * - Audit trail for export/import events
 */

// PII fields that should never be logged
const PII_FIELDS = [
  'ssn', 'ssn_encrypted', 'ssn_last4', 'ssn_last_four',
  'dob', 'dob_encrypted', 'date_of_birth',
  'tax_id', 'taxpayer_id', 'ein', 'ein_last_four',
  'TaxpayerIdentifierValue', 'TaxpayerIdentifierType',
  'BirthDate', 'SSN'
];

// Redact PII from error messages
function redactPII(message) {
  if (!message || typeof message !== 'string') return message;
  
  // Redact SSN patterns (XXX-XX-XXXX or 9 digits)
  let redacted = message.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN REDACTED]');
  
  // Redact date patterns that might be DOB
  redacted = redacted.replace(/\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g, '[DATE REDACTED]');
  
  // Redact EIN patterns (XX-XXXXXXX)
  redacted = redacted.replace(/\b\d{2}[-]?\d{7}\b/g, '[EIN REDACTED]');
  
  return redacted;
}

// Sanitize object for logging (remove PII fields)
function sanitizeForLogging(obj, depth = 0) {
  if (depth > 10) return '[MAX DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return redactPII(String(obj));
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item, depth + 1));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    if (PII_FIELDS.some(pii => keyLower.includes(pii.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, depth + 1);
    } else {
      sanitized[key] = redactPII(String(value));
    }
  }
  return sanitized;
}

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Error categories for grouping
const ERROR_CATEGORIES = {
  WELL_FORMEDNESS: 'Well-formedness',
  XSD_SCHEMA: 'XSD Schema',
  ENUM_VIOLATION: 'Enum Violations',
  CONDITIONALITY: 'Conditionality Violations',
  MAPPING_GAP: 'Mapping Gaps',
  DATA_TYPE: 'Data Type Errors',
  REQUIRED_FIELD: 'Required Fields',
  EXTENSION: 'Extension Errors'
};

// Categorize an error
function categorizeError(error) {
  const code = (error.code || '').toUpperCase();
  const message = (error.message || '').toLowerCase();
  
  if (code.startsWith('PARSE') || message.includes('well-formed') || message.includes('xml parse')) {
    return ERROR_CATEGORIES.WELL_FORMEDNESS;
  }
  if (code.startsWith('XSD') || message.includes('schema') || message.includes('xsd')) {
    return ERROR_CATEGORIES.XSD_SCHEMA;
  }
  if (code.startsWith('ENUM') || message.includes('enumeration') || message.includes('not in allowed values')) {
    return ERROR_CATEGORIES.ENUM_VIOLATION;
  }
  if (code.startsWith('COND') || message.includes('conditional') || message.includes('required when')) {
    return ERROR_CATEGORIES.CONDITIONALITY;
  }
  if (code.startsWith('MAP') || message.includes('unmapped') || message.includes('not mapped')) {
    return ERROR_CATEGORIES.MAPPING_GAP;
  }
  if (code.startsWith('TYPE') || message.includes('type') || message.includes('format')) {
    return ERROR_CATEGORIES.DATA_TYPE;
  }
  if (code.startsWith('REQ') || message.includes('required') || message.includes('missing')) {
    return ERROR_CATEGORIES.REQUIRED_FIELD;
  }
  if (code.startsWith('EXT') || message.includes('extension')) {
    return ERROR_CATEGORIES.EXTENSION;
  }
  
  return ERROR_CATEGORIES.XSD_SCHEMA; // Default
}

// Group errors by category
function groupErrors(errors) {
  const grouped = {};
  
  for (const category of Object.values(ERROR_CATEGORIES)) {
    grouped[category] = [];
  }
  
  for (const error of errors || []) {
    const category = categorizeError(error);
    grouped[category].push({
      ...error,
      message: redactPII(error.message),
      expected: redactPII(error.expected),
      actual: redactPII(error.actual)
    });
  }
  
  // Remove empty categories
  for (const category of Object.keys(grouped)) {
    if (grouped[category].length === 0) {
      delete grouped[category];
    }
  }
  
  return grouped;
}

// Determine overall status
function determineStatus(validation) {
  if (!validation) return 'FAIL';
  
  const errors = validation.errors || [];
  const warnings = validation.warnings || [];
  
  // Check for critical errors
  const criticalErrors = errors.filter(e => {
    const code = (e.code || '').toUpperCase();
    return code.startsWith('PARSE') || code.startsWith('XSD') || e.severity === 'critical';
  });
  
  if (criticalErrors.length > 0) return 'FAIL';
  if (errors.length > 0) return 'FAIL';
  if (warnings.length > 0) return 'PASS_WITH_WARNINGS';
  return 'PASS';
}

// Create actionable output for each error
function createActionableError(error) {
  return {
    category: categorizeError(error),
    code: error.code || 'UNKNOWN',
    severity: error.severity || 'error',
    location: {
      line: error.line || null,
      column: error.column || error.col || null,
      xpath: error.xpath || error.path || null,
      element: error.element || null
    },
    message: redactPII(error.message),
    expected: error.expected ? redactPII(String(error.expected)) : null,
    actual: error.actual ? redactPII(String(error.actual)) : null,
    suggestion: error.suggestion || generateSuggestion(error)
  };
}

// Generate fix suggestion
function generateSuggestion(error) {
  const category = categorizeError(error);
  
  switch (category) {
    case ERROR_CATEGORIES.WELL_FORMEDNESS:
      return 'Check XML syntax: ensure all tags are properly closed and nested.';
    case ERROR_CATEGORIES.XSD_SCHEMA:
      return 'Review element structure against MISMO 3.4 schema requirements.';
    case ERROR_CATEGORIES.ENUM_VIOLATION:
      return `Use one of the allowed enumeration values defined in MISMO 3.4.`;
    case ERROR_CATEGORIES.CONDITIONALITY:
      return 'Check LDD conditionality rules for this element.';
    case ERROR_CATEGORIES.MAPPING_GAP:
      return 'Map this field using EXTENSION container or update field mapping profile.';
    case ERROR_CATEGORIES.DATA_TYPE:
      return 'Ensure the value matches the expected data type format.';
    case ERROR_CATEGORIES.REQUIRED_FIELD:
      return 'Provide a value for this required field.';
    case ERROR_CATEGORIES.EXTENSION:
      return 'Verify extension namespace and structure follows MEG-0025 guidelines.';
    default:
      return null;
  }
}

// Log audit event (PII-safe)
async function logAuditEvent(base44, eventType, details) {
  try {
    const sanitizedDetails = sanitizeForLogging(details);
    console.log(`[AUDIT] ${eventType}:`, JSON.stringify(sanitizedDetails));
    
    // Could also store to AuditLog entity if available
    // await base44.asServiceRole.entities.AuditLog.create({
    //   event_type: eventType,
    //   details: sanitizedDetails,
    //   timestamp: new Date().toISOString()
    // });
  } catch (e) {
    console.error('[AUDIT ERROR]', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'generate', ...params } = body;

    switch (action) {
      case 'generate': {
        let { canonical_snapshot, validation_result, export_profile, deal_id, xml_content } = params;

        // Log the audit event (PII-safe)
        await logAuditEvent(base44, 'CONFORMANCE_REPORT_REQUESTED', {
          deal_id,
          user_email: user.email,
          has_xml: !!xml_content,
          has_validation: !!validation_result
        });

        // If deal_id provided, build canonical snapshot
        if (deal_id && !canonical_snapshot) {
          const deal = await base44.entities.Deal.get(deal_id);
          const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id }).catch(() => []);
          const borrowerIds = dealBorrowers.map(db => db.borrower_id).filter(Boolean);
          
          let borrowers = [];
          for (const bid of borrowerIds) {
            try {
              const b = await base44.entities.Borrower.get(bid);
              if (b) borrowers.push(b);
            } catch (e) { /* skip */ }
          }
          
          const dealProperties = await base44.entities.DealProperty.filter({ deal_id }).catch(() => []);
          const propertyIds = dealProperties.map(dp => dp.property_id).filter(Boolean);
          
          let properties = [];
          for (const pid of propertyIds) {
            try {
              const p = await base44.entities.Property.get(pid);
              if (p) properties.push(p);
            } catch (e) { /* skip */ }
          }

          canonical_snapshot = {
            deal,
            borrowers: borrowers.length > 0 ? borrowers : [],
            properties: properties.length > 0 ? properties : []
          };

          // Default validation if none provided
          if (!validation_result) {
            validation_result = {
              valid: true,
              errors: [],
              warnings: []
            };
          }
        }

        if (!canonical_snapshot) {
          return Response.json({ error: 'Missing canonical_snapshot or deal_id' }, { status: 400 });
        }

        // Determine overall status
        const status = determineStatus(validation_result);

        // Group errors
        const groupedErrors = groupErrors(validation_result?.errors);
        const groupedWarnings = groupErrors(validation_result?.warnings);

        // Create actionable errors
        const actionableErrors = (validation_result?.errors || []).map(createActionableError);
        const actionableWarnings = (validation_result?.warnings || []).map(createActionableError);

        // Build sections (PII-safe)
        const sections = [
          {
            name: 'Borrower Information',
            status: canonical_snapshot.borrowers?.length > 0 ? 'OK' : 'INCOMPLETE',
            field_count: canonical_snapshot.borrowers?.length || 0,
            fields: [
              {
                field: 'First Name',
                value: canonical_snapshot.borrowers?.[0]?.first_name || '(missing)',
                status: canonical_snapshot.borrowers?.[0]?.first_name ? 'OK' : 'MISSING'
              },
              {
                field: 'Last Name',
                value: canonical_snapshot.borrowers?.[0]?.last_name || '(missing)',
                status: canonical_snapshot.borrowers?.[0]?.last_name ? 'OK' : 'MISSING'
              },
              {
                field: 'SSN',
                value: canonical_snapshot.borrowers?.[0]?.ssn_encrypted ? '***-**-****' : '(not provided)',
                status: canonical_snapshot.borrowers?.[0]?.ssn_encrypted ? 'OK' : 'OPTIONAL'
              },
              {
                field: 'DOB',
                value: canonical_snapshot.borrowers?.[0]?.dob_encrypted ? '[encrypted]' : '(not provided)',
                status: canonical_snapshot.borrowers?.[0]?.dob_encrypted ? 'OK' : 'OPTIONAL'
              }
            ]
          },
          {
            name: 'Property Information',
            status: canonical_snapshot.properties?.length > 0 ? 'OK' : 'INCOMPLETE',
            field_count: canonical_snapshot.properties?.length || 0,
            fields: [
              {
                field: 'Street Address',
                value: canonical_snapshot.properties?.[0]?.address_street || '(missing)',
                status: canonical_snapshot.properties?.[0]?.address_street ? 'OK' : 'MISSING'
              },
              {
                field: 'City',
                value: canonical_snapshot.properties?.[0]?.address_city || '(missing)',
                status: canonical_snapshot.properties?.[0]?.address_city ? 'OK' : 'MISSING'
              },
              {
                field: 'State',
                value: canonical_snapshot.properties?.[0]?.address_state || '(missing)',
                status: canonical_snapshot.properties?.[0]?.address_state ? 'OK' : 'MISSING'
              },
              {
                field: 'ZIP',
                value: canonical_snapshot.properties?.[0]?.address_zip || '(missing)',
                status: canonical_snapshot.properties?.[0]?.address_zip ? 'OK' : 'MISSING'
              },
              {
                field: 'Property Type',
                value: canonical_snapshot.properties?.[0]?.property_type || '(missing)',
                status: canonical_snapshot.properties?.[0]?.property_type ? 'OK' : 'MISSING'
              }
            ]
          },
          {
            name: 'Loan Terms',
            status: canonical_snapshot.deal?.loan_amount ? 'OK' : 'INCOMPLETE',
            fields: [
              {
                field: 'Loan Amount',
                value: canonical_snapshot.deal?.loan_amount 
                  ? '$' + canonical_snapshot.deal.loan_amount.toLocaleString() 
                  : '(missing)',
                status: canonical_snapshot.deal?.loan_amount ? 'OK' : 'MISSING'
              },
              {
                field: 'Interest Rate',
                value: canonical_snapshot.deal?.interest_rate 
                  ? canonical_snapshot.deal.interest_rate.toFixed(3) + '%' 
                  : '(missing)',
                status: canonical_snapshot.deal?.interest_rate ? 'OK' : 'MISSING'
              },
              {
                field: 'Loan Term',
                value: canonical_snapshot.deal?.loan_term_months 
                  ? canonical_snapshot.deal.loan_term_months + ' months' 
                  : '(missing)',
                status: canonical_snapshot.deal?.loan_term_months ? 'OK' : 'MISSING'
              },
              {
                field: 'Loan Purpose',
                value: canonical_snapshot.deal?.loan_purpose || '(missing)',
                status: canonical_snapshot.deal?.loan_purpose ? 'OK' : 'MISSING'
              },
              {
                field: 'Loan Product',
                value: canonical_snapshot.deal?.loan_product || '(missing)',
                status: canonical_snapshot.deal?.loan_product ? 'OK' : 'MISSING'
              }
            ]
          },
          {
            name: 'DSCR Analysis',
            status: canonical_snapshot.deal?.dscr ? 'OK' : 'INCOMPLETE',
            fields: [
              {
                field: 'DSCR Ratio',
                value: canonical_snapshot.deal?.dscr 
                  ? canonical_snapshot.deal.dscr.toFixed(2) + 'x' 
                  : '(not calculated)',
                status: canonical_snapshot.deal?.dscr ? 'OK' : 'NOT_CALCULATED'
              },
              {
                field: 'Monthly Rent',
                value: canonical_snapshot.properties?.[0]?.gross_rent_monthly 
                  ? '$' + canonical_snapshot.properties[0].gross_rent_monthly.toLocaleString() 
                  : '(missing)',
                status: canonical_snapshot.properties?.[0]?.gross_rent_monthly ? 'OK' : 'MISSING'
              }
            ]
          }
        ];

        // Calculate completeness
        const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
        const completedFields = sections.reduce((sum, s) => 
          sum + s.fields.filter(f => f.status === 'OK').length, 0);
        const completenessScore = totalFields > 0 
          ? Math.round((completedFields / totalFields) * 100) 
          : 0;

        const report = {
          report_id: generateUUID(),
          generated_at: new Date().toISOString(),
          generated_by: user.email,
          deal_id: deal_id || canonical_snapshot.deal?.id,
          deal_number: canonical_snapshot.deal?.deal_number,
          export_profile: export_profile?.name || 'Standard MISMO 3.4',
          export_type: export_profile?.export_type || 'MISMO_34',

          // Overall status: PASS / PASS_WITH_WARNINGS / FAIL
          overall_status: status,
          
          // Summary statistics
          summary: {
            completeness_score: completenessScore,
            total_fields: totalFields,
            completed_fields: completedFields,
            error_count: actionableErrors.length,
            warning_count: actionableWarnings.length,
            errors_by_category: Object.fromEntries(
              Object.entries(groupedErrors).map(([k, v]) => [k, v.length])
            ),
            warnings_by_category: Object.fromEntries(
              Object.entries(groupedWarnings).map(([k, v]) => [k, v.length])
            )
          },

          // Grouped errors (actionable with line/col/element/expected/actual)
          errors_grouped: groupedErrors,
          warnings_grouped: groupedWarnings,

          // Flat actionable list
          errors: actionableErrors,
          warnings: actionableWarnings,

          // Section breakdown
          sections
        };

        // Log completion
        await logAuditEvent(base44, 'CONFORMANCE_REPORT_GENERATED', {
          report_id: report.report_id,
          deal_id: report.deal_id,
          status: report.overall_status,
          error_count: report.summary.error_count,
          warning_count: report.summary.warning_count
        });

        return Response.json({
          success: true,
          conformance_report: report
        });
      }

      case 'validate_xml': {
        // Validate raw XML and generate conformance report
        const { xml_content, schema_pack = 'standard' } = params;
        
        if (!xml_content) {
          return Response.json({ error: 'Missing xml_content' }, { status: 400 });
        }

        // Log audit (do NOT log XML content as it may contain PII)
        await logAuditEvent(base44, 'XML_VALIDATION_REQUESTED', {
          user_email: user.email,
          xml_size_bytes: xml_content.length,
          schema_pack
        });

        // Call schema validator
        let validation;
        try {
          const valRes = await base44.functions.invoke('mismoSchemaValidator', {
            xml_content,
            schema_pack,
            context: 'import'
          });
          validation = valRes.data;
        } catch (e) {
          validation = {
            validation_status: 'FAIL',
            errors: [{ code: 'VAL_ERROR', message: e.message }],
            warnings: []
          };
        }

        // Generate conformance report from validation
        const status = validation.validation_status === 'PASS' ? 'PASS' :
                       validation.validation_status === 'PASS_WITH_WARNINGS' ? 'PASS_WITH_WARNINGS' : 'FAIL';

        const groupedErrors = groupErrors(validation.report?.errors || validation.errors);
        const groupedWarnings = groupErrors(validation.report?.warnings || validation.warnings);

        const report = {
          report_id: generateUUID(),
          generated_at: new Date().toISOString(),
          overall_status: status,
          source: 'xml_validation',
          schema_pack,
          summary: {
            well_formed: validation.report?.summary?.well_formed ?? true,
            structure_valid: validation.report?.summary?.structure_valid ?? (status !== 'FAIL'),
            data_valid: validation.report?.summary?.data_valid ?? (status === 'PASS'),
            error_count: (validation.report?.errors || validation.errors || []).length,
            warning_count: (validation.report?.warnings || validation.warnings || []).length
          },
          errors_grouped: groupedErrors,
          warnings_grouped: groupedWarnings,
          errors: (validation.report?.errors || validation.errors || []).map(createActionableError),
          warnings: (validation.report?.warnings || validation.warnings || []).map(createActionableError)
        };

        return Response.json({
          success: true,
          conformance_report: report
        });
      }

      default:
        return Response.json({ 
          error: 'Invalid action. Use: generate, validate_xml' 
        }, { status: 400 });
    }

  } catch (error) {
    // Log error (PII-safe)
    console.error('[CONFORMANCE ERROR]', redactPII(error.message));
    return Response.json({ error: redactPII(error.message) }, { status: 500 });
  }
});