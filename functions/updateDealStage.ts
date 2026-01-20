/**
 * Update Deal Stage with Validation
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Valid stage transitions
const ALLOWED_TRANSITIONS = {
  inquiry: ['application', 'withdrawn', 'denied'],
  application: ['processing', 'withdrawn', 'denied'],
  processing: ['underwriting', 'withdrawn', 'denied'],
  underwriting: ['approved', 'denied', 'withdrawn'],
  approved: ['closing', 'withdrawn', 'denied'],
  closing: ['funded', 'withdrawn', 'denied'],
  funded: ['post_closing'],
  post_closing: [],
  denied: [],
  withdrawn: [],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id, new_stage, notes } = body;

    if (!deal_id || !new_stage) {
      return Response.json({ error: 'Missing deal_id or new_stage' }, { status: 400 });
    }

    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];
    const currentStage = deal.stage;

    // Validate transition
    const allowedNext = ALLOWED_TRANSITIONS[currentStage] || [];
    if (!allowedNext.includes(new_stage)) {
      return Response.json({
        error: `Invalid transition: ${currentStage} → ${new_stage}`,
        current_stage: currentStage,
        allowed_stages: allowedNext,
      }, { status: 400 });
    }

    // Update deal
    await base44.entities.Deal.update(deal_id, {
      stage: new_stage,
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: deal.org_id,
      entity_type: 'Deal',
      entity_id: deal_id,
      action: 'stage_changed',
      user_email: user.email,
      details_json: {
        from: currentStage,
        to: new_stage,
        notes: notes,
      },
    });

    return Response.json({
      success: true,
      deal_id: deal_id,
      new_stage: new_stage,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});