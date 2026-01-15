import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Log audit events for compliance tracking
 * Called by other functions to record all significant actions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id, user_id, action_type, entity_type, entity_id, description, severity = 'Info', old_values, new_values, changed_fields } = await req.json();

    if (!org_id || !action_type || !entity_type || !description) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user agent and IP from request
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const ipAddress = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'Unknown';

    // Create audit log
    const auditLog = await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      description,
      severity,
      old_values: old_values || null,
      new_values: new_values || null,
      changed_fields: changed_fields || [],
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    return Response.json({
      success: true,
      audit_id: auditLog.id,
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});