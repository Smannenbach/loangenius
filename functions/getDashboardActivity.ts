/**
 * Get Dashboard Activity - Recent activity feed
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

    // Get recent activity logs
    const logs = await base44.asServiceRole.entities.ActivityLog.filter({ org_id: orgId });
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 20);

    // Get recent leads
    const leads = await base44.asServiceRole.entities.Lead.filter({ org_id: orgId });
    const recentLeads = leads
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5)
      .map(l => ({
        type: 'lead_created',
        title: `New lead: ${l.first_name} ${l.last_name || ''}`,
        timestamp: l.created_date,
        entity_id: l.id,
      }));

    // Get recent deals
    const deals = await base44.asServiceRole.entities.Deal.filter({ org_id: orgId });
    const recentDeals = deals
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5)
      .map(d => ({
        type: 'deal_created',
        title: `New deal: ${d.deal_number || d.id}`,
        timestamp: d.created_date,
        entity_id: d.id,
      }));

    // Combine and sort
    const activities = [...recentLeads, ...recentDeals]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return Response.json({
      ok: true,
      activities,
      activity_logs: recentLogs,
    });
  } catch (error) {
    console.error('getDashboardActivity error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});