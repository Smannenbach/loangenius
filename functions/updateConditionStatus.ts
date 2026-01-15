import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      condition_id,
      status, // 'pending', 'received', 'approved', 'rejected', 'waived'
      reviewer_notes,
      evidence_document_id
    } = await req.json();

    if (!condition_id || !status) {
      return Response.json({
        error: 'Missing condition_id or status'
      }, { status: 400 });
    }

    const condition = await base44.entities.Condition.get(condition_id);
    if (!condition) {
      return Response.json({ error: 'Condition not found' }, { status: 404 });
    }

    // Update condition
    const updatedCondition = await base44.entities.Condition.update(condition_id, {
      status,
      reviewer_notes: reviewer_notes || condition.reviewer_notes,
      evidence_document_id: evidence_document_id || condition.evidence_document_id,
      reviewed_at: ['approved', 'rejected', 'waived'].includes(status) ? new Date().toISOString() : null,
      reviewed_by: ['approved', 'rejected', 'waived'].includes(status) ? user.email : null,
      updated_by: user.email
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: condition.org_id,
      deal_id: condition.deal_id,
      action_type: 'condition_updated',
      description: `Condition updated to ${status}: ${condition.title}`,
      metadata_json: { condition_id, old_status: condition.status, new_status: status }
    });

    // Check if all conditions met
    const allConditions = await base44.entities.Condition.filter({
      deal_id: condition.deal_id
    });

    const allMet = allConditions.every(c => 
      ['approved', 'waived'].includes(c.status === condition_id ? status : c.status)
    );

    // Create notification for borrower
    if (status === 'approved') {
      await base44.asServiceRole.entities.Notification.create({
        org_id: condition.org_id,
        deal_id: condition.deal_id,
        type: 'condition_satisfied',
        title: 'Condition Approved',
        message: `Your condition "${condition.title}" has been approved`,
        is_read: false
      });
    } else if (status === 'rejected') {
      await base44.asServiceRole.entities.Notification.create({
        org_id: condition.org_id,
        deal_id: condition.deal_id,
        type: 'condition_rejected',
        title: 'Condition Needs Attention',
        message: `Your condition "${condition.title}" was not approved. ${reviewer_notes || ''}`,
        is_read: false
      });
    }

    return Response.json({
      condition_id: updatedCondition.id,
      status: updatedCondition.status,
      all_conditions_met: allMet
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});