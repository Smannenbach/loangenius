/**
 * Export Preflight Validation
 * Validates deal data against selected export profile before generation
 * Runs conformance checks and returns detailed report
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id, export_profile_id, export_type } = await req.json();

    if (!deal_id || !org_id) {
      return Response.json({ error: 'Missing deal_id or org_id' }, { status: 400 });
    }

    // Fetch deal + supporting entities
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];
    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    const properties = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
    const documents = await base44.asServiceRole.entities.Document.filter({ deal_id });

    const errors = [];
    const warnings = [];
    const info = [];

    // Core required fields
    if (!deal.deal_number) errors.push({ type: 'Missing', field: 'deal_number', severity: 'error' });
    if (!deal.loan_amount) errors.push({ type: 'Missing', field: 'loan_amount', severity: 'error' });
    if (!deal.interest_rate) errors.push({ type: 'Missing', field: 'interest_rate', severity: 'error' });
    if (!deal.loan_term_months) errors.push({ type: 'Missing', field: 'loan_term_months', severity: 'error' });

    // Borrower validation
    if (!borrowers.length) {
      errors.push({ type: 'Missing', field: 'borrower', message: 'At least one borrower required', severity: 'error' });
    } else {
      borrowers.forEach((b, idx) => {
        if (!b.first_name || !b.last_name) {
          errors.push({ type: 'Incomplete', field: `borrower[${idx}].name`, severity: 'error' });
        }
        if (!b.email) {
          warnings.push({ type: 'Missing', field: `borrower[${idx}].email`, severity: 'warning' });
        }
      });
    }

    // Property validation
    if (!properties.length) {
      errors.push({ type: 'Missing', field: 'property', message: 'At least one property required', severity: 'error' });
    } else {
      properties.forEach((p, idx) => {
        if (!p.address_street || !p.address_city) {
          errors.push({ type: 'Incomplete', field: `property[${idx}].address`, severity: 'error' });
        }
        if (!p.property_type) {
          errors.push({ type: 'Missing', field: `property[${idx}].property_type`, severity: 'error' });
        }
      });
    }

    // Metric-based rules (export-type specific)
    if (export_type === 'mismo_34') {
      // MISMO 3.4 specific validations
      if (deal.dscr < 0.75) {
        errors.push({ type: 'Metric', field: 'dscr', value: deal.dscr, message: 'DSCR critically low', severity: 'error' });
      }
      if (deal.ltv > 95) {
        errors.push({ type: 'Metric', field: 'ltv', value: deal.ltv, message: 'LTV exceeds maximum', severity: 'error' });
      }
    } else if (export_type === 'fnm_32') {
      // FNM 3.2 specific validations
      if (deal.dscr < 1.1) {
        errors.push({ type: 'Metric', field: 'dscr', value: deal.dscr, message: 'FNM requires DSCR >= 1.10', severity: 'error' });
      }
      if (deal.ltv > 90) {
        warnings.push({ type: 'Metric', field: 'ltv', value: deal.ltv, message: 'FNM LTV high; may require approval', severity: 'warning' });
      }
    }

    // Document checklist
    const requiredDocTypes = ['Appraisal', 'Title_Report', 'Bank_Statements', 'Tax_Returns'];
    const uploadedDocTypes = new Set(documents.map(d => d.document_type));
    const missingDocs = requiredDocTypes.filter(doc => !uploadedDocTypes.has(doc));
    if (missingDocs.length > 0) {
      warnings.push({ type: 'Documents', message: `Missing documents: ${missingDocs.join(', ')}`, severity: 'warning' });
    }

    // Conformance summary
    const isConformant = errors.length === 0;
    const readyToExport = isConformant && warnings.length <= 2;

    info.push({ message: `Deal ${deal.deal_number} ready for ${export_type} export: ${readyToExport ? 'YES' : 'REVIEW REQUIRED'}` });

    return Response.json({
      success: true,
      conformant: isConformant,
      ready_to_export: readyToExport,
      errors,
      warnings,
      info,
      deal_summary: {
        deal_id,
        deal_number: deal.deal_number,
        loan_product: deal.loan_product,
        loan_amount: deal.loan_amount,
        borrower_count: borrowers.length,
        property_count: properties.length,
        document_count: documents.length
      }
    });
  } catch (error) {
    console.error('Error in export preflight:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});