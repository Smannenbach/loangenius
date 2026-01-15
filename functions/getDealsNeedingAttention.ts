import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get deals needing attention (stale, missing docs, expiring conditions)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 5 } = await req.json();
    const orgId = user.org_id || '';
    const today = new Date();

    const attentionDeals = [];

    // Get all active deals
    const deals = await base44.asServiceRole.entities.Deal.filter({
      org_id: orgId,
      status_not_in: ['funded', 'denied', 'withdrawn'],
    });

    // 1. Stale deals (no activity in 7+ days)
    deals.forEach(deal => {
      const lastUpdate = new Date(deal.updated_date);
      const daysSinceUpdate = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));

      if (daysSinceUpdate >= 7) {
        attentionDeals.push({
          deal_id: deal.id,
          deal_number: deal.deal_number,
          borrower_name: deal.primary_borrower_id ? 'Borrower' : 'Unknown',
          reason: 'stale',
          severity: daysSinceUpdate > 14 ? 'high' : 'medium',
          message: `Stale ${daysSinceUpdate} days - no activity`,
          days_stale: daysSinceUpdate,
        });
      }
    });

    // 2. Missing documents (check if conditions exist)
    const conditions = await base44.asServiceRole.entities.Condition.filter({
      org_id: orgId,
      status_not_in: ['approved', 'rejected'],
    });

    const dealsMissingDocs = {};
    conditions.forEach(cond => {
      if (!dealsMissingDocs[cond.deal_id]) {
        dealsMissingDocs[cond.deal_id] = 0;
      }
      dealsMissingDocs[cond.deal_id]++;
    });

    Object.entries(dealsMissingDocs).forEach(([dealId, count]) => {
      const deal = deals.find(d => d.id === dealId);
      if (deal && count > 0) {
        attentionDeals.push({
          deal_id: dealId,
          deal_number: deal.deal_number,
          borrower_name: 'Borrower',
          reason: 'missing_conditions',
          severity: count > 3 ? 'high' : 'medium',
          message: `${count} pending conditions`,
          condition_count: count,
        });
      }
    });

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = attentionDeals.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return Response.json({
      success: true,
      deals: sorted.slice(0, limit),
    });
  } catch (error) {
    console.error('Error getting attention deals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});