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

    const { deal_id, stage, new_stage, notes } = await req.json();

    const finalStage = stage || new_stage;

    if (!deal_id || !finalStage) {
      return Response.json({ error: 'Missing deal_id or stage' }, { status: 400 });
    }

    const validStages = ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing', 'funded', 'post_closing', 'denied', 'withdrawn'];
    if (!validStages.includes(finalStage)) {
      return Response.json({ error: `Invalid stage: ${finalStage}. Valid stages: ${validStages.join(', ')}` }, { status: 400 });
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
      stage: finalStage,
      updated_date: new Date().toISOString(),
    });

    // Log activity
    if (deal.org_id) {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: deal.org_id,
        deal_id,
        activity_type: 'DEAL_STAGE_CHANGED',
        description: `Stage changed from ${oldStage} to ${finalStage}`,
        source: 'admin',
        user_id: user.email,
        metadata: {
          old_stage: oldStage,
          new_stage: finalStage,
        },
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