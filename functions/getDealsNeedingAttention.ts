/**
 * Get Deals Needing Attention
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

    const deals = await base44.entities.Deal.filter({ org_id: orgId, is_deleted: false });
    const conditions = await base44.entities.Condition.filter({ org_id: orgId });
    const tasks = await base44.entities.Task.filter({ org_id: orgId });

    const needsAttention = [];
    const now = new Date();

    for (const deal of deals) {
      const reasons = [];
      
      // Check for pending conditions
      const dealConditions = conditions.filter(c => c.deal_id === deal.id && c.status === 'pending');
      if (dealConditions.length > 0) {
        reasons.push(`${dealConditions.length} pending condition(s)`);
      }

      // Check for overdue tasks
      const dealTasks = tasks.filter(t => t.deal_id === deal.id && t.status === 'pending');
      const overdueTasks = dealTasks.filter(t => t.due_date && new Date(t.due_date) < now);
      if (overdueTasks.length > 0) {
        reasons.push(`${overdueTasks.length} overdue task(s)`);
      }

      // Check if deal is stale (no updates in 7 days)
      const lastUpdate = new Date(deal.updated_date || deal.created_date);
      const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 7 && !['funded', 'denied', 'withdrawn'].includes(deal.stage)) {
        reasons.push(`No activity for ${daysSinceUpdate} days`);
      }

      if (reasons.length > 0) {
        needsAttention.push({
          deal_id: deal.id,
          deal_number: deal.deal_number,
          stage: deal.stage,
          loan_amount: deal.loan_amount,
          reasons,
          priority: reasons.length >= 2 ? 'high' : 'medium',
        });
      }
    }

    // Sort by priority
    needsAttention.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return 0;
    });

    return Response.json({
      deals: needsAttention.slice(0, 10),
      total_count: needsAttention.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});