import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update deal stage and create activity log entry
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, stage, notes } = await req.json();

    if (!deal_id || !stage) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validStages = ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing', 'funded', 'denied', 'withdrawn'];
    if (!validStages.includes(stage)) {
      return Response.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Get existing deal
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];
    const oldStage = deal.stage;

    // Update deal stage
    const updatedDeal = await base44.entities.Deal.update(deal_id, {
      stage,
      updated_date: new Date().toISOString(),
    });

    // Log activity
    if (deal.org_id) {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: deal.org_id,
        deal_id,
        activity_type: 'stage_change',
        user_id: user.email,
        old_value: oldStage,
        new_value: stage,
        notes,
        timestamp: new Date().toISOString(),
      }).catch(() => {
        // Activity log is optional, don't fail if it doesn't exist
      });
    }

    return Response.json({
      success: true,
      deal: updatedDeal,
    });
  } catch (error) {
    console.error('Error updating deal stage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});