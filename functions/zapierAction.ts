/**
 * Zapier Action Handler
 * Allows Zapier to create/update deals, documents, tasks via authenticated webhook
 * Writes canonical data + prevents duplicates via idempotency key
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, org_id, idempotency_key, data } = await req.json();

    if (!action || !org_id || !idempotency_key || !data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check idempotency
    const existingKey = await base44.asServiceRole.entities.IdempotencyKey.filter({
      org_id,
      idempotency_key
    });

    if (existingKey.length > 0) {
      // Return cached response
      return Response.json(existingKey[0].response_body, { status: existingKey[0].response_status });
    }

    let result;

    switch (action) {
      case 'create_deal':
        result = await createDeal(base44, org_id, data);
        break;
      case 'update_deal':
        result = await updateDeal(base44, org_id, data);
        break;
      case 'add_document':
        result = await addDocument(base44, org_id, data);
        break;
      case 'create_task':
        result = await createTask(base44, org_id, data);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Store idempotency key
    await base44.asServiceRole.entities.IdempotencyKey.create({
      org_id,
      idempotency_key,
      request_hash: await hashObject(data),
      response_status: 200,
      response_body: result,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in zapierAction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createDeal(base44, org_id, data) {
  const deal = await base44.asServiceRole.entities.Deal.create({
    org_id,
    deal_number: data.deal_number,
    loan_product: data.loan_product || 'DSCR',
    loan_purpose: data.loan_purpose || 'Purchase',
    loan_amount: data.loan_amount,
    interest_rate: data.interest_rate,
    loan_term_months: data.loan_term_months,
    amortization_type: data.amortization_type || 'fixed',
    status: 'draft',
    stage: 'inquiry'
  });

  return { success: true, deal_id: deal.id, message: 'Deal created from Zapier' };
}

async function updateDeal(base44, org_id, data) {
  if (!data.deal_id) throw new Error('Missing deal_id for update');

  await base44.asServiceRole.entities.Deal.update(data.deal_id, {
    loan_amount: data.loan_amount,
    interest_rate: data.interest_rate,
    stage: data.stage,
    status: data.status
  });

  return { success: true, deal_id: data.deal_id, message: 'Deal updated from Zapier' };
}

async function addDocument(base44, org_id, data) {
  if (!data.deal_id || !data.document_type) {
    throw new Error('Missing deal_id or document_type');
  }

  const doc = await base44.asServiceRole.entities.Document.create({
    org_id,
    deal_id: data.deal_id,
    document_type: data.document_type,
    source: 'imported',
    file_key: `zapier/${data.deal_id}/${data.file_name}`,
    file_name: data.file_name,
    mime_type: data.mime_type || 'application/pdf',
    status: 'uploaded'
  });

  return { success: true, document_id: doc.id, message: 'Document added from Zapier' };
}

async function createTask(base44, org_id, data) {
  const task = await base44.asServiceRole.entities.Task.create({
    org_id,
    deal_id: data.deal_id,
    title: data.title,
    description: data.description,
    status: data.status || 'pending',
    assigned_to: data.assigned_to,
    due_date: data.due_date
  });

  return { success: true, task_id: task.id, message: 'Task created from Zapier' };
}

async function hashObject(obj) {
  const str = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}