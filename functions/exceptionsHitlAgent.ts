import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, run_id, deal_id, reason, evidence, exception_id, approver_id, rationale } = body;

    if (action === 'create_exception') {
      if (!deal_id || !reason) return Response.json({ error: 'deal_id and reason required' }, { status: 400 });

      return Response.json({
        exception_id: crypto.randomUUID(),
        deal_id,
        reason,
        status: 'pending_review',
        required_role: body.required_role || 'loan_officer',
        created_at: new Date().toISOString()
      });
    }

    if (action === 'approve_exception') {
      if (!exception_id || !approver_id || !rationale) {
        return Response.json({ error: 'exception_id, approver_id, and rationale required' }, { status: 400 });
      }

      return Response.json({
        exception_id,
        status: 'approved',
        approver_id,
        rationale,
        approved_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});