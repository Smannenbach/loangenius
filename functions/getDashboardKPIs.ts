/**
 * Dashboard KPIs - Returns key metrics for the dashboard
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

    // Fetch data
    const [leads, deals] = await Promise.all([
      base44.entities.Lead.filter({ org_id: orgId, is_deleted: false }),
      base44.entities.Deal.filter({ org_id: orgId, is_deleted: false }),
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Lead metrics
    const newLeads = leads.filter(l => new Date(l.created_date) > thirtyDaysAgo).length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;

    // Deal metrics
    const activeDeals = deals.filter(d => !['funded', 'denied', 'withdrawn'].includes(d.stage));
    const fundedDeals = deals.filter(d => d.stage === 'funded');
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
    const fundedValue = fundedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    // Stage distribution
    const stageDistribution = {};
    deals.forEach(d => {
      stageDistribution[d.stage] = (stageDistribution[d.stage] || 0) + 1;
    });

    return Response.json({
      leads: {
        total: leads.length,
        new_30d: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversion_rate: leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0,
      },
      deals: {
        total: deals.length,
        active: activeDeals.length,
        funded: fundedDeals.length,
        pipeline_value: pipelineValue,
        funded_value: fundedValue,
        stage_distribution: stageDistribution,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});