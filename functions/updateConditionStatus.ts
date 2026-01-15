/**
 * Update condition status in lifecycle
 * Handles transitions: pending → requested → received → under_review → approved/rejected
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { logAudit, logActivity } from './auditLogHelper.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { condition_id, status } = await req.json();

    if (!condition_id || !status) {
      return Response.json({ error: 'Missing condition_id or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'requested', 'received', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch condition
    const conditions = await base44.asServiceRole.entities.Condition.filter({ id: condition_id });
    if (!conditions.length) {
      return Response.json({ error: 'Condition not found' }, { status: 404 });
    }

    const condition = conditions[0];

    // Validate transition
    const validTransitions = {
      pending: ['requested'],
      requested: ['received', 'pending'],
      received: ['under_review', 'pending'],
      under_review: ['approved', 'rejected', 'received'],
      approved: [],
      rejected: ['under_review', 'pending']
    };

    if (!validTransitions[condition.status]?.includes(status)) {
      return Response.json({
        error: `Invalid transition from ${condition.status} to ${status}`
      }, { status: 400 });
    }

    // Update condition
    const updatedCondition = await base44.asServiceRole.entities.Condition.update(condition_id, {
      status,
      resolved_at: (status === 'approved' || status === 'rejected') 
        ? new Date().toISOString()
        : null
    });

    // Audit log
    await logAudit(base44, {
      action_type: 'Update',
      entity_type: 'Condition',
      entity_id: condition_id,
      entity_name: condition.title,
      description: `Condition status changed from ${condition.status} to ${status}`,
      old_values: { status: condition.status },
      new_values: { status },
      severity: status === 'rejected' ? 'Warning' : 'Info',
      metadata: {
        org_id: condition.org_id,
        user_id: user.id,
        deal_id: condition.deal_id
      }
    });

    // Activity log
    const icons = {
      pending: '⏳',
      requested: '📤',
      received: '📥',
      under_review: '🔍',
      approved: '✅',
      rejected: '❌'
    };

    await logActivity(base44, {
      deal_id: condition.deal_id,
      activity_type: 'Condition_Cleared',
      title: `Condition updated: ${condition.title}`,
      description: `Status changed to ${status}`,
      icon: icons[status] || '•',
      color: status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'blue'
    });

    return Response.json({
      success: true,
      condition: updatedCondition
    });
  } catch (error) {
    console.error('Error updating condition:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});