import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get portal summary for borrower
 */
Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Validate session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get deal info
    const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get requirements
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
      is_visible_to_borrower: true,
    });

    const completed = requirements.filter((r) => r.status === 'approved').length;
    const outstanding = requirements.filter((r) => ['pending', 'requested', 'rejected'].includes(r.status)).length;

    // Get tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
      is_visible_to_borrower: true,
    });

    // Compute next steps
    const nextSteps = [];
    if (outstanding > 0) {
      nextSteps.push(`Upload ${outstanding} missing document${outstanding > 1 ? 's' : ''}`);
    }
    if (deal.stage === 'application') {
      nextSteps.push('Complete application review');
    }
    if (deal.stage === 'underwriting') {
      nextSteps.push('Underwriting in progress');
    }
    if (deal.stage === 'approved') {
      nextSteps.push('Schedule closing');
    }

    return Response.json({
      stage: deal.stage,
      outstanding_docs: outstanding,
      completed_docs: completed,
      total_docs: requirements.length,
      next_steps: nextSteps,
      pending_tasks: tasks.filter((t) => t.status !== 'completed').length,
    });
  } catch (error) {
    console.error('Portal summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});