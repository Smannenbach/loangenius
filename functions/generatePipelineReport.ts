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

    const { filter_stage, filter_product } = await req.json();

    // Get deals
    const deals = await base44.entities.Deal.filter({});

    // Apply filters
    let filtered = deals;
    if (filter_stage) {
      filtered = filtered.filter(d => d.status === filter_stage);
    }
    if (filter_product) {
      filtered = filtered.filter(d => d.loan_product === filter_product);
    }

    // Calculate pipeline metrics
    const reportData = filtered.map(d => ({
      id: d.id,
      deal_name: d.deal_name,
      loan_amount: d.loan_amount,
      loan_product: d.loan_product,
      status: d.status,
      stage_percent: getStagePercent(d.status),
      created_date: d.created_date,
      days_in_pipeline: Math.floor((Date.now() - new Date(d.created_date)) / (1000 * 60 * 60 * 24))
    }));

    // Create report record
    const report = await base44.asServiceRole.entities.ReportRun.create({
      org_id: user.org_id || 'default',
      report_type: 'PIPELINE',
      report_name: `Pipeline Report - ${new Date().toLocaleDateString()}`,
      filters_json: { filter_stage, filter_product },
      data_json: reportData,
      total_rows: reportData.length,
      total_value: reportData.reduce((sum, r) => sum + (r.loan_amount || 0), 0),
      generated_by: user.email,
      generated_at: new Date().toISOString()
    });

    return Response.json({
      report_id: report.id,
      report_name: report.report_name,
      total_deals: reportData.length,
      total_pipeline_value: report.total_value,
      data: reportData.slice(0, 50) // Return first 50 for preview
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getStagePercent(status) {
  const stages = {
    draft: 10,
    in_progress: 50,
    submitted: 80,
    completed: 100
  };
  return stages[status] || 0;
}