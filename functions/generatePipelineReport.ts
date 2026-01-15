import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate pipeline report - deal count/value by stage with days in stage
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { as_of_date, org_id } = await req.json();

    const startTime = performance.now();

    // Get all active deals
    const deals = await base44.asServiceRole.entities.Deal.filter({
      org_id,
    });

    const activeDealStages = ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing'];

    const byStage = activeDealStages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      const daysInStage = stageDeals.map(d => {
        const dealUpdated = new Date(d.updated_date);
        const asOf = new Date(as_of_date);
        return Math.floor((asOf - dealUpdated) / (1000 * 60 * 60 * 24));
      });

      const avgDays = daysInStage.length > 0 ? Math.round(daysInStage.reduce((a, b) => a + b) / daysInStage.length) : 0;
      const volume = stageDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

      return {
        stage,
        count: stageDeals.length,
        volume,
        avg_loan_amount: stageDeals.length > 0 ? Math.round(volume / stageDeals.length) : 0,
        avg_days_in_stage: avgDays,
      };
    });

    const totalCount = byStage.reduce((sum, s) => sum + s.count, 0);
    const totalVolume = byStage.reduce((sum, s) => sum + s.volume, 0);

    const execTime = performance.now() - startTime;

    // Log report run
    await base44.asServiceRole.entities.ReportRun.create({
      org_id,
      report_type: 'pipeline',
      start_date: as_of_date,
      end_date: as_of_date,
      filters_applied: {},
      generated_by: user.email,
      row_count: totalCount,
      execution_ms: Math.round(execTime),
    });

    return Response.json({
      success: true,
      report: {
        as_of_date,
        total_active: totalCount,
        total_volume: totalVolume,
        by_stage: byStage,
        generated_at: new Date().toISOString(),
        execution_ms: Math.round(execTime),
      },
    });
  } catch (error) {
    console.error('Error generating pipeline report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});