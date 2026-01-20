/**
 * Dashboard Activity Feed
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

    // Get recent activity from various sources
    const [recentLeads, recentDeals, recentDocs] = await Promise.all([
      base44.entities.Lead.filter({ org_id: orgId }),
      base44.entities.Deal.filter({ org_id: orgId }),
      base44.entities.Document.filter({ org_id: orgId }),
    ]);

    const activities = [];

    // Add lead activities
    recentLeads.slice(0, 10).forEach(lead => {
      activities.push({
        type: 'lead_created',
        title: `New lead: ${lead.first_name} ${lead.last_name}`,
        timestamp: lead.created_date,
        entity_id: lead.id,
        entity_type: 'Lead',
      });
    });

    // Add deal activities
    recentDeals.slice(0, 10).forEach(deal => {
      activities.push({
        type: 'deal_created',
        title: `Deal ${deal.deal_number || deal.id} - ${deal.stage}`,
        timestamp: deal.created_date,
        entity_id: deal.id,
        entity_type: 'Deal',
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return Response.json({
      activities: activities.slice(0, 20),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});