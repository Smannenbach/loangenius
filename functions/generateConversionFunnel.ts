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

    const { start_date, end_date, org_id, metric = 'count' } = await req.json();

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
      report_type: 'funnel',
      start_date,
      end_date,
      filters_applied: { metric },
      generated_by: user.email,
      row_count: funnel.length,
      execution_ms: Math.round(execTime),
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