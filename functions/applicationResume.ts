import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();

    if (!token) {
      return Response.json({ error: 'Invalid or missing token' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find draft by token
    const drafts = await base44.asServiceRole.entities.ApplicationDraft.filter({
      resume_token_hash: tokenHash
    });

    if (drafts.length === 0) {
      return Response.json({ error: 'Token not found' }, { status: 404 });
    }

    const draft = drafts[0];

    // Check expiration
    if (new Date(draft.resume_expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 410 });
    }

    // Fetch participants
    const participants = await base44.asServiceRole.entities.ApplicationParticipant.filter({
      application_id: draft.id
    });

    // Calculate progress (0-100%)
    const requiredFields = getRequiredFieldsByPurpose(draft.loan_purpose);
    const completedFields = Object.keys(draft.application_data_json || {}).length;
    const progress = Math.round((completedFields / requiredFields.length) * 100);

    if (req.method === 'GET') {
      return Response.json({
        application: draft,
        participants,
        progress,
        loan_purpose: draft.loan_purpose,
        loan_product: draft.loan_product
      });
    }

    if (req.method === 'PATCH') {
      const { application_data_json } = await req.json();
      const updated = await base44.asServiceRole.entities.ApplicationDraft.update(draft.id, {
        application_data_json: {
          ...draft.application_data_json,
          ...application_data_json
        }
      });

      return Response.json({
        saved_at: new Date().toISOString(),
        progress: Math.round(((Object.keys(updated.application_data_json || {}).length) / requiredFields.length) * 100)
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getRequiredFieldsByPurpose(purpose) {
  const baseFields = ['loan_amount', 'property_type', 'property_address', 'gross_monthly_rent', 'property_taxes', 'insurance', 'borrower_name', 'borrower_ssn', 'borrower_dob'];

  if (purpose === 'purchase') {
    return [...baseFields, 'purchase_price', 'contract_date', 'earnest_money'];
  } else if (purpose === 'rate_term_refinance') {
    return [...baseFields, 'current_loan_balance', 'date_acquired', 'months_owned'];
  } else if (purpose === 'cash_out_refinance') {
    return [...baseFields, 'current_loan_balance', 'cash_out_amount', 'date_acquired'];
  }

  return baseFields;
}