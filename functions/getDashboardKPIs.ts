/**
 * Get Dashboard KPIs - Key performance indicators for dashboard
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

    // Get leads
    const leads = await base44.asServiceRole.entities.Lead.filter({ org_id: orgId });
    const newLeads = leads.filter(l => l.status === 'new');
    
    // Get deals
    const deals = await base44.asServiceRole.entities.Deal.filter({ org_id: orgId });
    const activeDeals = deals.filter(d => !['funded', 'denied', 'withdrawn'].includes(d.stage));
    const fundedDeals = deals.filter(d => d.stage === 'funded');
    
    // Calculate pipeline value
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
    const fundedValue = fundedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    // Get tasks due soon
    const tasks = await base44.asServiceRole.entities.Task.filter({ org_id: orgId, status: 'pending' });
    const today = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < today);

    return Response.json({
      ok: true,
      kpis: {
        total_leads: leads.length,
        new_leads: newLeads.length,
        active_deals: activeDeals.length,
        funded_deals: fundedDeals.length,
        pipeline_value: pipelineValue,
        funded_value: fundedValue,
        pending_tasks: tasks.length,
        overdue_tasks: overdueTasks.length,
      },
    });
  } catch (error) {
    console.error('getDashboardKPIs error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});