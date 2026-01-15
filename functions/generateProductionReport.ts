import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate production report - funded volume, count, avg loan size by period
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_date, end_date, group_by = 'month', org_id } = await req.json();

    const startTime = performance.now();

    // Get all funded deals in date range
    const deals = await base44.asServiceRole.entities.Deal.filter({
      org_id,
      stage: 'funded',
    });

    // Filter by date
    const fundedDeals = deals.filter(d => {
      const dealDate = new Date(d.updated_date);
      return dealDate >= new Date(start_date) && dealDate <= new Date(end_date);
    });

    let grouped = {};

    if (group_by === 'month') {
      fundedDeals.forEach(d => {
        const month = new Date(d.updated_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' });
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(d);
      });
    } else if (group_by === 'product') {
      fundedDeals.forEach(d => {
        const product = d.loan_product || 'Unknown';
        if (!grouped[product]) grouped[product] = [];
        grouped[product].push(d);
      });
    } else if (group_by === 'state') {
      // Would need to join with property table; simplified here
      fundedDeals.forEach(d => {
        const state = d.state || 'Unknown';
        if (!grouped[state]) grouped[state] = [];
        grouped[state].push(d);
      });
    }

    const byGroup = Object.entries(grouped).map(([groupName, groupDeals]) => {
      const volume = groupDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
      const avgSize = groupDeals.length > 0 ? volume / groupDeals.length : 0;

      return {
        group: groupName,
        count: groupDeals.length,
        volume,
        avg_size: Math.round(avgSize),
      };
    });

    const totalVolume = fundedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
    const execTime = performance.now() - startTime;

    // Log report run
    await base44.asServiceRole.entities.ReportRun.create({
      org_id,
      report_type: 'production',
      start_date,
      end_date,
      filters_applied: { group_by },
      generated_by: user.email,
      row_count: fundedDeals.length,
      execution_ms: Math.round(execTime),
    });

    return Response.json({
      success: true,
      report: {
        period: { start: start_date, end: end_date },
        total_funded: fundedDeals.length,
        total_volume: totalVolume,
        avg_loan_size: fundedDeals.length > 0 ? Math.round(totalVolume / fundedDeals.length) : 0,
        by_group: byGroup,
        generated_at: new Date().toISOString(),
        execution_ms: Math.round(execTime),
      },
    });
  } catch (error) {
    console.error('Error generating production report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});