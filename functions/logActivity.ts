/**
 * User-friendly activity feed logging
 * Creates timeline entries for borrower/LO portals
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const {
      org_id,
      deal_id,
      borrower_id,
      activity_type,
      title,
      description,
      metadata,
      is_internal
    } = await req.json();

    if (!activity_type || !title) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Default icons and colors by activity type
    const defaults = {
      'Note': { icon: '📝', color: 'gray' },
      'Status_Change': { icon: '🔄', color: 'blue' },
      'Document_Upload': { icon: '📄', color: 'green' },
      'Document_Approved': { icon: '✅', color: 'green' },
      'Document_Rejected': { icon: '❌', color: 'red' },
      'Email_Sent': { icon: '📧', color: 'blue' },
      'SMS_Sent': { icon: '📱', color: 'blue' },
      'Task_Created': { icon: '☑️', color: 'yellow' },
      'Task_Completed': { icon: '✅', color: 'green' },
      'Condition_Cleared': { icon: '✓', color: 'green' },
      'Signature_Completed': { icon: '✍️', color: 'green' },
      'System_Event': { icon: '⚙️', color: 'gray' }
    };

    const defaults_for_type = defaults[activity_type] || { icon: '📌', color: 'gray' };

    // Create activity feed entry
    const activity = await base44.asServiceRole.entities.ActivityFeed.create({
      org_id: org_id || 'default',
      deal_id,
      borrower_id,
      user_id: user?.id,
      activity_type,
      title,
      description,
      icon: defaults_for_type.icon,
      color: defaults_for_type.color,
      metadata,
      is_internal: is_internal || false
    });

    return Response.json({
      success: true,
      activity_id: activity.id
    });
  } catch (error) {
    console.error('Error in logActivity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});