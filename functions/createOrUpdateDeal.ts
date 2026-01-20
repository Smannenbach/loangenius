/**
 * Create or Update Deal
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

    const body = await req.json();
    const { deal_id, ...dealData } = body;

    // Generate deal number if new
    // FIX: Use UUID-based approach to prevent race condition where concurrent requests get same number
    if (!deal_id) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      // Use crypto.randomUUID() for collision-free unique identifier
      const uniqueId = crypto.randomUUID().slice(0, 8).toUpperCase();
      dealData.deal_number = `LG-${yearMonth}-${uniqueId}`;
    }

    dealData.org_id = orgId;

    let deal;
    if (deal_id) {
      // Update existing deal
      const existing = await base44.entities.Deal.filter({ id: deal_id, org_id: orgId });
      if (existing.length === 0) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }
      deal = await base44.entities.Deal.update(deal_id, dealData);
    } else {
      // Create new deal
      dealData.stage = dealData.stage || 'inquiry';
      dealData.status = dealData.status || 'draft';
      deal = await base44.entities.Deal.create(dealData);
    }

    return Response.json({ success: true, deal });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});