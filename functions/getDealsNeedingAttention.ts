/**
 * Get Deals Needing Attention - Deals that need action
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

    const deals = await base44.asServiceRole.entities.Deal.filter({ org_id: orgId });
    const activeDeals = deals.filter(d => !['funded', 'denied', 'withdrawn'].includes(d.stage));

    const needsAttention = [];

    for (const deal of activeDeals.slice(0, 20)) {
      const issues = [];

      // Check for missing documents
      const docReqs = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
        deal_id: deal.id,
        is_required: true,
        status: 'pending',
      });
      if (docReqs.length > 0) {
        issues.push(`${docReqs.length} documents pending`);
      }

      // Check for pending conditions
      const conditions = await base44.asServiceRole.entities.Condition.filter({
        deal_id: deal.id,
        status: 'pending',
      });
      if (conditions.length > 0) {
        issues.push(`${conditions.length} conditions pending`);
      }

      // Check for overdue tasks
      const tasks = await base44.asServiceRole.entities.Task.filter({
        deal_id: deal.id,
        status: 'pending',
      });
      const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
      if (overdue.length > 0) {
        issues.push(`${overdue.length} tasks overdue`);
      }

      if (issues.length > 0) {
        needsAttention.push({
          deal_id: deal.id,
          deal_number: deal.deal_number,
          loan_amount: deal.loan_amount,
          stage: deal.stage,
          issues,
        });
      }
    }

    return Response.json({
      ok: true,
      deals: needsAttention.slice(0, 10),
      count: needsAttention.length,
    });
  } catch (error) {
    console.error('getDealsNeedingAttention error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});