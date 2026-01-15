import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate borrower risk analysis - credit scores, DTI distributions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_date, end_date, org_id } = await req.json();

    const startTime = performance.now();

    // Get all credit reports in range
    const creditReports = await base44.asServiceRole.entities.CreditReport.filter({
      org_id,
    });

    const filteredReports = creditReports.filter(cr => {
      const pulledDate = new Date(cr.pulled_at);
      return pulledDate >= new Date(start_date) && pulledDate <= new Date(end_date);
    });

    const creditScores = filteredReports.map(cr => cr.credit_score || 700);
    const dtiRatios = filteredReports.map(cr => cr.debt_to_income_ratio || 35);

    const avgScore = creditScores.length > 0 ? Math.round(creditScores.reduce((a, b) => a + b) / creditScores.length) : 0;
    const avgDTI = dtiRatios.length > 0 ? Math.round((dtiRatios.reduce((a, b) => a + b) / dtiRatios.length) * 10) / 10 : 0;

    const report = {
      period: { start: start_date, end: end_date },
      total_borrowers: filteredReports.length,
      credit_score_distribution: {
        excellent: creditScores.filter(s => s >= 750).length,
        good: creditScores.filter(s => s >= 700 && s < 750).length,
        fair: creditScores.filter(s => s >= 650 && s < 700).length,
        poor: creditScores.filter(s => s < 650).length,
        avg_score: avgScore,
        min_score: Math.min(...creditScores),
        max_score: Math.max(...creditScores),
      },
      dti_distribution: {
        under_40: dtiRatios.filter(d => d < 40).length,
        '40_to_50': dtiRatios.filter(d => d >= 40 && d <= 50).length,
        over_50: dtiRatios.filter(d => d > 50).length,
        avg_dti: avgDTI,
      },
      risk_summary: {
        high_risk_count: creditScores.filter(s => s < 620).length,
        marginal_risk_count: creditScores.filter(s => s >= 620 && s < 700).length,
      },
    };

    const execTime = performance.now() - startTime;

    // Log report run
    await base44.asServiceRole.entities.ReportRun.create({
      org_id,
      report_type: 'risk',
      start_date,
      end_date,
      filters_applied: {},
      generated_by: user.email,
      row_count: filteredReports.length,
      execution_ms: Math.round(execTime),
    });

    return Response.json({
      success: true,
      report: {
        ...report,
        generated_at: new Date().toISOString(),
        execution_ms: Math.round(execTime),
      },
    });
  } catch (error) {
    console.error('Error generating risk analysis:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});