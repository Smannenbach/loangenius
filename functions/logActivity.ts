/**
 * Log Activity - Generic activity logging
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    const body = await req.json();
    const { org_id, entity_type, entity_id, action, details } = body;

    if (!org_id || !entity_type || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.ActivityLog.create({
      org_id: org_id,
      entity_type: entity_type,
      entity_id: entity_id,
      action: action,
      user_email: user?.email || 'system',
      details_json: details || {},
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    });

    return Response.json({ success: true, log_id: log.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});