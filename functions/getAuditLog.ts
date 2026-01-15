import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Retrieve audit logs for compliance/admin review
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const { deal_id, user_id, days = 30, limit = 100 } = await req.json();

    // Build query
    const query = {};

    if (deal_id) {
      // Get deal to get org_id
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }
      query.org_id = deal.org_id;
      query.parent_entity_id = deal_id;
    } else {
      // Get user's org
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email,
      });
      if (memberships.length === 0) {
        return Response.json({ error: 'User not part of any organization' }, { status: 403 });
      }
      query.org_id = memberships[0].org_id;
    }

    if (user_id) {
      query.user_id = user_id;
    }

    // Get logs
    const allLogs = await base44.asServiceRole.entities.AuditLog.filter(query);

    // Filter by date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = allLogs
      .filter(log => new Date(log.created_date) >= cutoffDate)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, limit);

    return Response.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.created_date,
        user: log.user_id,
        action: log.action_type,
        entity: `${log.entity_type}:${log.entity_id}`,
        description: log.description,
        severity: log.severity,
        ip_address: log.ip_address,
      })),
      total: logs.length,
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});