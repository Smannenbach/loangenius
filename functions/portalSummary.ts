/**
 * Borrower Portal Summary
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id, borrower_email } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Get conditions
    const conditions = await base44.asServiceRole.entities.Condition.filter({ deal_id: deal_id });
    const pendingConditions = conditions.filter(c => c.status === 'pending');
    const completedConditions = conditions.filter(c => c.status === 'fulfilled');

    // Get documents
    const docReqs = await base44.asServiceRole.entities.DealDocumentRequirement.filter({ deal_id: deal_id });
    const pendingDocs = docReqs.filter(d => d.status === 'pending');
    const uploadedDocs = docReqs.filter(d => ['uploaded', 'accepted'].includes(d.status));

    // Get tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({ deal_id: deal_id, is_visible_to_borrower: true });
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    return Response.json({
      deal: {
        id: deal.id,
        deal_number: deal.deal_number,
        stage: deal.stage,
        status: deal.status,
        loan_amount: deal.loan_amount,
        loan_product: deal.loan_product,
        loan_purpose: deal.loan_purpose,
      },
      conditions: {
        total: conditions.length,
        pending: pendingConditions.length,
        completed: completedConditions.length,
      },
      documents: {
        total: docReqs.length,
        pending: pendingDocs.length,
        uploaded: uploadedDocs.length,
      },
      tasks: {
        total: tasks.length,
        pending: pendingTasks.length,
      },
      progress_percent: Math.round(
        ((completedConditions.length + uploadedDocs.length) / 
         Math.max(conditions.length + docReqs.length, 1)) * 100
      ),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});