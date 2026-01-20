/**
 * Generate Report - Generate various reports
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

    const body = await req.json();
    const { report_type = 'pipeline' } = body;

    if (report_type === 'pipeline') {
      const deals = await base44.asServiceRole.entities.Deal.filter({ org_id: orgId });
      
      const byStage = {};
      deals.forEach(d => {
        const stage = d.stage || 'unknown';
        if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
        byStage[stage].count++;
        byStage[stage].value += d.loan_amount || 0;
      });

      return Response.json({
        ok: true,
        report: {
          type: 'pipeline',
          total_deals: deals.length,
          total_value: deals.reduce((s, d) => s + (d.loan_amount || 0), 0),
          by_stage: byStage,
        },
      });
    }

    if (report_type === 'leads') {
      const leads = await base44.asServiceRole.entities.Lead.filter({ org_id: orgId });
      
      const byStatus = {};
      leads.forEach(l => {
        const status = l.status || 'unknown';
        if (!byStatus[status]) byStatus[status] = 0;
        byStatus[status]++;
      });

      return Response.json({
        ok: true,
        report: {
          type: 'leads',
          total_leads: leads.length,
          by_status: byStatus,
        },
      });
    }

    return Response.json({ ok: false, error: 'Unknown report type' }, { status: 400 });
  } catch (error) {
    console.error('generateReport error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});