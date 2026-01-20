/**
 * Get Audit Log - Retrieve audit trail for compliance
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    if (!orgData.ok) return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    const orgId = orgData.org_id;

    // Only admin can view full audit log
    if (!['admin', 'owner'].includes(orgData.membership_role)) {
      return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { entity_type, entity_id, limit = 100 } = body;

    let filters = { org_id: orgId };
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) filters.entity_id = entity_id;

    const logs = await base44.asServiceRole.entities.ActivityLog.filter(filters);
    const sorted = logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit);

    return Response.json({
      ok: true,
      logs: sorted.map(log => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        user_email: log.user_email,
        timestamp: log.created_date,
        details: log.details_json,
      })),
      count: sorted.length,
    });
  } catch (error) {
    console.error('getAuditLog error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});