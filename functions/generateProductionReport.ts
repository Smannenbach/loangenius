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

    // Get completed deals
    const deals = await base44.entities.Deal.filter({ status: 'completed' });
    const recentCompleted = deals.filter(d => new Date(d.updated_date) >= new Date(startDate));

    // Production metrics
    const reportData = recentCompleted.map(d => ({
      id: d.id,
      deal_name: d.deal_name,
      loan_amount: d.loan_amount,
      loan_product: d.loan_product,
      completed_date: d.updated_date,
      days_to_close: Math.floor((new Date(d.updated_date) - new Date(d.created_date)) / (1000 * 60 * 60 * 24))
    }));

    const totalProduction = reportData.reduce((sum, r) => sum + (r.loan_amount || 0), 0);
    const avgDaysToClose = reportData.length > 0 
      ? reportData.reduce((sum, r) => sum + r.days_to_close, 0) / reportData.length
      : 0;

    // Create report
    const report = await base44.asServiceRole.entities.ReportRun.create({
      org_id: user.org_id || 'default',
      report_type: 'PRODUCTION',
      report_name: `Production Report - ${new Date().toLocaleDateString()}`,
      filters_json: { period_days: daysAgo },
      data_json: reportData,
      total_rows: reportData.length,
      total_value: totalProduction,
      metadata_json: { avg_days_to_close: Math.round(avgDaysToClose * 10) / 10 },
      generated_by: user.email,
      generated_at: new Date().toISOString()
    });

    return Response.json({
      report_id: report.id,
      report_name: report.report_name,
      period_days: daysAgo,
      total_completed: reportData.length,
      total_production: totalProduction,
      avg_days_to_close: Math.round(avgDaysToClose * 10) / 10,
      data: reportData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});