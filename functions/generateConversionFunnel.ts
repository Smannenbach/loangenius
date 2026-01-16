import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate conversion funnel report - lead to funded conversion metrics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { start_date, end_date, metric = 'count' } = body;
    
    // Get org_id from membership
    let org_id = body.org_id || 'default';
    try {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      if (memberships.length > 0) {
        org_id = memberships[0].org_id;
      }
    } catch (e) {
      console.log('Could not get org membership:', e.message);
    }

    const startTime = performance.now();

    // Get all leads
    const leads = await base44.asServiceRole.entities.Lead.filter({
      org_id,
    });

    // Get all deals
    const deals = await base44.asServiceRole.entities.Deal.filter({
      org_id,
    });

    const stages = [
      { name: 'Leads', deals: leads },
      {
        name: 'Applications',
        deals: deals.filter(d => ['application', 'processing', 'underwriting', 'approved', 'closing', 'funded'].includes(d.stage?.toLowerCase())),
      },
      { name: 'Underwriting', deals: deals.filter(d => ['underwriting', 'approved', 'closing', 'funded'].includes(d.stage?.toLowerCase())) },
      { name: 'Approved', deals: deals.filter(d => ['approved', 'closing', 'funded'].includes(d.stage?.toLowerCase())) },
      { name: 'Funded', deals: deals.filter(d => d.stage?.toLowerCase() === 'funded') },
    ];

    let firstValue = 0;
    const funnel = stages.map((stage, idx) => {
      const value = metric === 'count' ? stage.deals.length : stage.deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

      if (idx === 0) firstValue = value;

      return {
        stage: stage.name,
        count: stage.deals.length,
        volume: stage.deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0),
        conversion_rate: firstValue > 0 ? Math.round((value / firstValue) * 100) + '%' : '100%',
      };
    });

    const execTime = performance.now() - startTime;

    // Log report run
    await base44.asServiceRole.entities.ReportRun.create({
      org_id,
      report_id: `funnel_${Date.now()}`,
      run_type: 'MANUAL',
      filters_used: { metric, start_date, end_date },
      row_count: funnel.length,
      status: 'COMPLETED',
      execution_time_ms: Math.round(execTime),
      run_by: user.email
    });

    return Response.json({
      success: true,
      report: {
        period: { start: start_date, end: end_date },
        metric,
        funnel,
        generated_at: new Date().toISOString(),
        execution_ms: Math.round(execTime),
      },
    });
  } catch (error) {
    console.error('Error generating funnel report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});