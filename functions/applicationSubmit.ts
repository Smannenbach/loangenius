import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').slice(-3)[0];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
      resume_token_hash: tokenHash
    });

    if (drafts.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const draft = drafts[0];
    const data = draft.application_data_json || {};

    // Validate required fields
    const validation = validateApplicationData(data, draft.loan_purpose);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        missing_fields: validation.missing_fields,
        error_code: 'VALIDATION_ERROR'
      }, { status: 422 });
    }

    // Create Deal from application
    const deal = await base44.asServiceRole.entities.Deal.create({
      org_id: draft.org_id,
      loan_product: draft.loan_product,
      loan_purpose: draft.loan_purpose,
      status: 'application_completed',
      loan_amount: parseFloat(data.loan_amount || 0),
      property_type: data.property_type,
      occupancy_type: 'investment',
      estimated_property_value: parseFloat(data.estimated_property_value || 0),
      purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
      current_loan_balance: data.current_loan_balance ? parseFloat(data.current_loan_balance) : null,
      cash_out_amount: data.cash_out_amount ? parseFloat(data.cash_out_amount) : null,
      monthly_rent: parseFloat(data.gross_monthly_rent || 0),
      property_address: data.property_address,
      canonical_snapshot: data
    });

    // Create primary borrower
    const borrower = await base44.asServiceRole.entities.Borrower.create({
      org_id: draft.org_id,
      deal_id: deal.id,
      first_name: data.borrower_first_name || 'Unknown',
      last_name: data.borrower_last_name || 'Unknown',
      email: draft.primary_contact_email,
      phone: draft.primary_contact_phone,
      ssn_last_4: data.borrower_ssn ? data.borrower_ssn.slice(-4) : '',
      dob: data.borrower_dob,
      citizenship: data.borrower_citizenship || 'US_Citizen'
    });

    // Generate document requirements
    await generateDocumentRequirements(draft.org_id, deal.id, draft.loan_purpose);

    // Update draft status
    await base44.asServiceRole.entities.ApplicationDraft.update(draft.id, {
      status: 'converted',
      deal_id: deal.id
    });

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: draft.org_id,
      action_type: 'Create',
      entity_type: 'Deal',
      entity_id: deal.id,
      description: `Deal created from application ${draft.id}`,
      severity: 'Info'
    });

    return Response.json({
      deal_id: deal.id,
      next_url: '/portal/deals/' + deal.id + '/requirements'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function validateApplicationData(data, purpose) {
  const baseRequired = ['loan_amount', 'property_type', 'property_address', 'gross_monthly_rent', 'property_taxes', 'insurance', 'borrower_name', 'borrower_dob'];

  let required = [...baseRequired];
  if (purpose === 'purchase') {
    required = [...required, 'purchase_price', 'contract_date'];
  } else if (purpose === 'rate_term_refinance' || purpose === 'cash_out_refinance') {
    required = [...required, 'current_loan_balance', 'date_acquired'];
  }

  const missing = required.filter(field => !data[field]);

  return {
    valid: missing.length === 0,
    missing_fields: missing
  };
}

async function generateDocumentRequirements(orgId, dealId, loanPurpose) {
  // Fetch templates matching product + purpose
  const templates = await base44.asServiceRole.entities.DocumentRequirementTemplate.filter({
    org_id: orgId,
    loan_product: 'DSCR'
  });

  for (const template of templates) {
    const applicablePurposes = template.loan_purpose === null || template.loan_purpose === loanPurpose;

    if (applicablePurposes) {
      await base44.asServiceRole.entities.DealDocumentRequirement.create({
        org_id: orgId,
        deal_id: dealId,
        template_id: template.id,
        name: template.name,
        category: template.category,
        responsibility: template.responsibility,
        visible_to_borrower: template.default_visible_to_borrower,
        status: 'pending'
      });
    }
  }
}