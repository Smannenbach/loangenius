import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_period = '30' } = await req.json(); // days

    const daysAgo = parseInt(time_period);
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get all deals in period
    const deals = await base44.entities.Deal.filter({});
    const recentDeals = deals.filter(d => new Date(d.created_date) >= new Date(startDate));

    // Get completed deals
    const completedDeals = recentDeals.filter(d => d.status === 'completed');

    // Calculate metrics
    const totalPipelineValue = recentDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
    const completedValue = completedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);
    const avgLoanAmount = recentDeals.length > 0 ? totalPipelineValue / recentDeals.length : 0;
    const conversionRate = recentDeals.length > 0 ? (completedDeals.length / recentDeals.length) * 100 : 0;
    const avgDaysToClose = completedDeals.length > 0 
      ? completedDeals.reduce((sum, d) => {
          const created = new Date(d.created_date);
          const updated = new Date(d.updated_date);
          return sum + ((updated - created) / (1000 * 60 * 60 * 24));
        }, 0) / completedDeals.length
      : 0;

    // Stage breakdown
    const stageBreakdown = {
      draft: recentDeals.filter(d => d.status === 'draft').length,
      in_progress: recentDeals.filter(d => d.status === 'in_progress').length,
      submitted: recentDeals.filter(d => d.status === 'submitted').length,
      completed: completedDeals.length
    };

    // Product breakdown
    const productBreakdown = {};
    recentDeals.forEach(d => {
      productBreakdown[d.loan_product || 'other'] = (productBreakdown[d.loan_product || 'other'] || 0) + 1;
    });

    return Response.json({
      period_days: daysAgo,
      kpis: {
        total_pipeline_value: Math.round(totalPipelineValue),
        completed_value: Math.round(completedValue),
        avg_loan_amount: Math.round(avgLoanAmount),
        conversion_rate: Math.round(conversionRate * 100) / 100,
        avg_days_to_close: Math.round(avgDaysToClose * 10) / 10,
        total_deals: recentDeals.length,
        completed_deals: completedDeals.length
      },
      stage_breakdown: stageBreakdown,
      product_breakdown: productBreakdown,
      snapshot_date: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});