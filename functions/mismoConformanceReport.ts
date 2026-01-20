/**
 * MISMO Conformance Report Generator
 * Generates detailed conformance reports for export/import operations
 * 
 * Categories:
 * - XML well-formedness
 * - XSD schema violations
 * - Enum violations
 * - Datatype violations
 * - Missing required fields
 * - Conditionality violations
 * - Mapping gaps
 * 
 * PII Safety: Never includes raw SSN/DOB/Tax ID in reports
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// PII field patterns to redact
const PII_PATTERNS = [
  /SSN|SocialSecurity|TaxpayerIdentifier/i,
  /DateOfBirth|BirthDate|DOB/i,
  /TaxID|EIN|EmployerIdentification/i,
  /AccountNumber|BankAccount/i,
  /DriverLicense|DL/i
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, context, validation_result, mapping_result, canonical_data, pack_id, run_id } = body;

    // ACTION: Generate conformance report
    if (action === 'generate') {
      const report = generateConformanceReport(
        context,
        validation_result,
        mapping_result,
        canonical_data,
        pack_id,
        run_id
      );
      
      return Response.json({
        success: true,
        report
      });
    }

    // ACTION: Summarize report
    if (action === 'summarize') {
      const { report } = body;
      const summary = summarizeReport(report);
      return Response.json({
        success: true,
        summary
      });
    }

    // ACTION: Redact PII from report
    if (action === 'redact_pii') {
      const { report } = body;
      const redacted = redactPII(report);
      return Response.json({
        success: true,
        redacted_report: redacted
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Conformance Report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ============================================================
// REPORT GENERATION
// ============================================================

function generateConformanceReport(context, validationResult, mappingResult, canonicalData, packId, runId) {
  const report = {
    report_id: `CR-${Date.now()}`,
    run_id: runId,
    context, // 'export' or 'import'
    pack_id: packId,
    generated_at: new Date().toISOString(),
    status: 'PASS',
    categories: {
      well_formedness: { status: 'PASS', items: [] },
      xsd_schema: { status: 'PASS', items: [] },
      enum_violations: { status: 'PASS', items: [] },
      datatype_violations: { status: 'PASS', items: [] },
      missing_required: { status: 'PASS', items: [] },
      conditionality: { status: 'PASS', items: [] },
      mapping_gaps: { status: 'PASS', items: [] }
    },
    summary: {
      total_errors: 0,
      total_warnings: 0,
      total_info: 0,
      error_categories: [],
      warning_categories: []
    }
  };

  // Process validation result
  if (validationResult) {
    // Well-formedness
    if (!validationResult.well_formed) {
      report.categories.well_formedness.status = 'FAIL';
      report.categories.well_formedness.items.push({
        severity: 'error',
        code: 'XML_MALFORMED',
        message: 'XML is not well-formed',
        details: redactPIIFromMessage(validationResult.errors?.[0]?.message || 'Parse error')
      });
    }

    // Process errors by category
    if (validationResult.errors) {
      for (const error of validationResult.errors) {
        const category = categorizeError(error);
        const redactedError = {
          severity: 'error',
          code: error.code,
          message: redactPIIFromMessage(error.message),
          xpath: error.xpath,
          line: error.line,
          column: error.column
        };

        if (report.categories[category]) {
          report.categories[category].items.push(redactedError);
          report.categories[category].status = 'FAIL';
        }
      }
    }

    // Process warnings
    if (validationResult.warnings) {
      for (const warning of validationResult.warnings) {
        const category = categorizeError(warning);
        const redactedWarning = {
          severity: 'warning',
          code: warning.code,
          message: redactPIIFromMessage(warning.message),
          xpath: warning.xpath,
          line: warning.line
        };

        if (report.categories[category]) {
          report.categories[category].items.push(redactedWarning);
          if (report.categories[category].status === 'PASS') {
            report.categories[category].status = 'PASS_WITH_WARNINGS';
          }
        }
      }
    }
  }

  // Process mapping result (for imports)
  if (mappingResult) {
    // Check for unmapped fields
    if (mappingResult.unmapped_nodes && mappingResult.unmapped_nodes.length > 0) {
      report.categories.mapping_gaps.status = 'PASS_WITH_WARNINGS';
      for (const unmapped of mappingResult.unmapped_nodes.slice(0, 20)) { // Limit to 20
        report.categories.mapping_gaps.items.push({
          severity: 'warning',
          code: 'UNMAPPED_INBOUND_NODE',
          message: `Unmapped inbound element: ${unmapped.xpath}`,
          xpath: unmapped.xpath,
          reason: unmapped.reason || 'No mapping defined'
        });
      }
      
      if (mappingResult.unmapped_nodes.length > 20) {
        report.categories.mapping_gaps.items.push({
          severity: 'info',
          code: 'UNMAPPED_COUNT',
          message: `... and ${mappingResult.unmapped_nodes.length - 20} more unmapped nodes`
        });
      }
    }
  }

  // Check canonical data for export gaps
  if (context === 'export' && canonicalData) {
    const exportGaps = findExportGaps(canonicalData);
    if (exportGaps.length > 0) {
      for (const gap of exportGaps) {
        report.categories.mapping_gaps.items.push({
          severity: gap.required ? 'error' : 'warning',
          code: 'UNMAPPED_CANONICAL_FIELD',
          message: `Canonical field '${gap.field}' has no MISMO mapping`,
          field: gap.field,
          reason: gap.reason || 'Not in MISMO LDD'
        });
        
        if (gap.required && report.categories.mapping_gaps.status !== 'FAIL') {
          report.categories.mapping_gaps.status = 'PASS_WITH_WARNINGS';
        }
      }
    }
  }

  // Calculate summary
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;
  const errorCategories = [];
  const warningCategories = [];

  for (const [categoryName, category] of Object.entries(report.categories)) {
    const errors = category.items.filter(i => i.severity === 'error').length;
    const warnings = category.items.filter(i => i.severity === 'warning').length;
    const infos = category.items.filter(i => i.severity === 'info').length;
    
    totalErrors += errors;
    totalWarnings += warnings;
    totalInfo += infos;
    
    if (errors > 0) errorCategories.push(categoryName);
    if (warnings > 0) warningCategories.push(categoryName);
  }

  report.summary = {
    total_errors: totalErrors,
    total_warnings: totalWarnings,
    total_info: totalInfo,
    error_categories: errorCategories,
    warning_categories: warningCategories
  };

  // Determine overall status
  if (totalErrors > 0) {
    report.status = 'FAIL';
  } else if (totalWarnings > 0) {
    report.status = 'PASS_WITH_WARNINGS';
  } else {
    report.status = 'PASS';
  }

  return report;
}

// ============================================================
// ERROR CATEGORIZATION
// ============================================================

function categorizeError(error) {
  const code = error.code || '';
  const category = error.category || '';
  
  // Use explicit category if provided
  if (category === 'well_formedness' || code.includes('MALFORMED')) return 'well_formedness';
  if (category === 'structure' || code.includes('INVALID_ROOT') || code.includes('MISSING_REQUIRED_ELEMENT') || code.includes('MISSING_MISMO_VERSION')) return 'xsd_schema';
  if (category === 'enum' || code.includes('ENUM') || code.includes('INVALID_LDD_ENUM')) return 'enum_violations';
  if (category === 'datatype' || code.includes('DATATYPE') || code.includes('TYPE_MISMATCH')) return 'datatype_violations';
  if (code.includes('MISSING_REQUIRED') || code.includes('CONDITIONAL')) return 'missing_required';
  if (category === 'conditionality') return 'conditionality';
  if (category === 'mapping' || code.includes('UNMAPPED')) return 'mapping_gaps';
  
  // Default to XSD schema
  return 'xsd_schema';
}

// ============================================================
// EXPORT GAP DETECTION
// ============================================================

function findExportGaps(canonicalData) {
  const gaps = [];
  
  // Fields that have no MISMO mapping (extension-only)
  const extensionOnlyFields = [
    'dscr', 'dscr_ratio', 'dscr_calculation_method',
    'gross_rental_income', 'net_operating_income',
    'is_business_purpose_loan', 'investment_strategy', 'exit_strategy',
    'entity_ein', 'entity_formation_date', 'entity_formation_state',
    'prepay_penalty_structure', 'interest_only_period_months',
    'property_monthly_rent', 'property_annual_taxes', 'property_annual_insurance',
    'property_monthly_hoa', 'broker_compensation', 'broker_compensation_type'
  ];
  
  for (const field of extensionOnlyFields) {
    if (canonicalData[field] !== undefined && canonicalData[field] !== null) {
      gaps.push({
        field,
        reason: 'Mapped to LG Extension namespace (not core MISMO)',
        required: false
      });
    }
  }
  
  return gaps;
}

// ============================================================
// PII REDACTION
// ============================================================

function redactPII(report) {
  const redacted = JSON.parse(JSON.stringify(report));
  
  // Recursively redact PII from all string values
  const redactObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        obj[key] = redactPIIFromMessage(value);
      } else if (Array.isArray(value)) {
        value.forEach(item => redactObject(item));
      } else if (typeof value === 'object') {
        redactObject(value);
      }
    }
  };
  
  redactObject(redacted);
  return redacted;
}

function redactPIIFromMessage(message) {
  if (!message || typeof message !== 'string') return message;
  
  // Redact SSN patterns (XXX-XX-XXXX or 9 digits)
  message = message.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
  
  // Redact dates that look like DOB (before 2005)
  message = message.replace(/\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g, '****-**-**');
  
  // Redact account numbers (8+ digits)
  message = message.replace(/\b\d{8,}\b/g, '********');
  
  // Redact EIN patterns (XX-XXXXXXX)
  message = message.replace(/\b\d{2}-?\d{7}\b/g, '**-*******');
  
  return message;
}

// ============================================================
// REPORT SUMMARIZATION
// ============================================================

function summarizeReport(report) {
  const summary = {
    status: report.status,
    generated_at: report.generated_at,
    pack_id: report.pack_id,
    context: report.context,
    quick_stats: {
      errors: report.summary?.total_errors || 0,
      warnings: report.summary?.total_warnings || 0,
      info: report.summary?.total_info || 0
    },
    category_summary: {},
    actionable_items: []
  };
  
  // Summarize by category
  for (const [categoryName, category] of Object.entries(report.categories || {})) {
    const errors = category.items?.filter(i => i.severity === 'error').length || 0;
    const warnings = category.items?.filter(i => i.severity === 'warning').length || 0;
    
    summary.category_summary[categoryName] = {
      status: category.status,
      errors,
      warnings
    };
    
    // Add actionable items (top 3 errors per category)
    const topErrors = (category.items || [])
      .filter(i => i.severity === 'error')
      .slice(0, 3)
      .map(e => ({
        category: categoryName,
        code: e.code,
        message: e.message,
        xpath: e.xpath
      }));
    
    summary.actionable_items.push(...topErrors);
  }
  
  // Limit actionable items to 10
  summary.actionable_items = summary.actionable_items.slice(0, 10);
  
  // Generate human-readable verdict
  if (report.status === 'PASS') {
    summary.verdict = 'All conformance checks passed. XML is valid and ready for use.';
  } else if (report.status === 'PASS_WITH_WARNINGS') {
    summary.verdict = `Conformance checks passed with ${summary.quick_stats.warnings} warning(s). Review recommended before proceeding.`;
  } else {
    summary.verdict = `Conformance checks FAILED with ${summary.quick_stats.errors} error(s). Fix errors before proceeding.`;
  }
  
  return summary;
}