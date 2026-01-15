import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, date_range, metrics = [] } = body;

    if (action === 'run_portfolio_analysis') {
      // Simulate portfolio analysis
      const alerts = [];

      if (metrics.includes('dscr')) {
        alerts.push({
          type: 'dscr_compression',
          severity: 'warning',
          message: 'One property shows DSCR declining below 1.10'
        });
      }

      if (metrics.includes('concentration')) {
        alerts.push({
          type: 'concentration_risk',
          severity: 'info',
          message: 'Portfolio concentration at 35% (within limits)'
        });
      }

      return Response.json({
        report_id: crypto.randomUUID(),
        date_range,
        portfolio_metrics: {
          total_loans: 12,
          average_dscr: 1.18,
          weighted_dscr: 1.15
        },
        alerts,
        analysis_date: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});