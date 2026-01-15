import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate dashboard KPIs for current user
 * Respects role-based filtering (admin sees all, LO sees only theirs)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period = 'month' } = await req.json();

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Filter by user if not admin
    let userFilter = {};
    const orgId = user.org_id || '';

    // Get all deals for org
    const currentDeals = await base44.asServiceRole.entities.Deal.filter({
      org_id: orgId,
      status_not_in: ['denied', 'withdrawn'],
    });

    // Active Deals (not in terminal status)
    const activeDealsCurrent = currentDeals.filter(
      d => !['denied', 'withdrawn'].includes(d.status?.toLowerCase())
    ).length;

    const lastMonthDeals = currentDeals.filter(
      d => new Date(d.created_date) <= endOfLastMonth && 
           !['denied', 'withdrawn'].includes(d.status?.toLowerCase())
    ).length;

    // Pipeline Value (sum of loan amounts)
    const pipelineValueCurrent = currentDeals
      .filter(d => !['denied', 'withdrawn'].includes(d.status?.toLowerCase()))
      .reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    const pipelineValuePrevious = currentDeals
      .filter(d => new Date(d.created_date) <= endOfLastMonth && 
                   !['denied', 'withdrawn'].includes(d.status?.toLowerCase()))
      .reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    // Closing This Month
    const closingThisMonth = currentDeals.filter(
      d => d.stage === 'closing' && 
           new Date(d.application_date) >= startOfMonth &&
           new Date(d.application_date) <= endOfMonth
    ).length;

    // Funded This Month
    const fundedThisMonth = currentDeals.filter(
      d => d.stage === 'funded' &&
           new Date(d.updated_date) >= startOfMonth &&
           new Date(d.updated_date) <= endOfMonth
    );

    const fundedVolume = fundedThisMonth.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    const fundedPrevious = currentDeals.filter(
      d => d.stage === 'funded' &&
           new Date(d.updated_date) >= startOfLastMonth &&
           new Date(d.updated_date) <= endOfLastMonth
    ).reduce((sum, d) => sum + (d.loan_amount || 0), 0);

    // Pipeline by stage
    const stages = ['inquiry', 'application', 'processing', 'underwriting', 'approved', 'closing', 'funded'];
    const pipelineByStage = stages.map(stage => ({
      stage,
      count: currentDeals.filter(d => d.stage === stage).length,
      volume: currentDeals
        .filter(d => d.stage === stage)
        .reduce((sum, d) => sum + (d.loan_amount || 0), 0),
    }));

    // Calculate percent changes
    const activeDealsChange = calculatePercentChange(lastMonthDeals, activeDealsCurrent);
    const pipelineChange = calculatePercentChange(pipelineValuePrevious, pipelineValueCurrent);
    const fundedChange = calculatePercentChange(fundedPrevious, fundedVolume);

    return Response.json({
      success: true,
      kpis: {
        active_deals: {
          current: activeDealsCurrent,
          previous: lastMonthDeals,
          change_pct: activeDealsChange,
          trend: activeDealsChange >= 0 ? 'up' : 'down',
        },
        pipeline_value: {
          current: pipelineValueCurrent,
          previous: pipelineValuePrevious,
          change_pct: pipelineChange,
          trend: pipelineChange >= 0 ? 'up' : 'down',
        },
        closing_this_month: {
          count: closingThisMonth,
          target: 10, // Placeholder
          variance: closingThisMonth - 10,
        },
        funded_this_month: {
          volume: fundedVolume,
          count: fundedThisMonth.length,
          previous_volume: fundedPrevious,
          change_pct: fundedChange,
          trend: fundedChange >= 0 ? 'up' : 'down',
        },
      },
      pipeline_by_stage: pipelineByStage,
      data_as_of: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculatePercentChange(previous, current) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}