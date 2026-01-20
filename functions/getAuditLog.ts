/**
 * Get Audit Log - Retrieve audit events for compliance
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json().catch(() => ({}));
    const { entity_type, entity_id, user_email, limit = 50, offset = 0 } = body;

    // Build filter
    const filter = { org_id: orgId };
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (user_email) filter.user_email = user_email;

    const auditLogs = await base44.entities.AuditLog.filter(filter);
    
    // Sort by date descending and paginate
    const sorted = auditLogs.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );

    return Response.json({
      logs: sorted.slice(offset, offset + limit),
      total: sorted.length,
      limit,
      offset,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});