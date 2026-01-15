import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, date_range, pricing_snapshots = [] } = body;

    if (action === 'run_fair_lending_analysis') {
      // Simulate fair-lending analysis
      const findings = [];

      if (pricing_snapshots.length > 0) {
        const avgCoupon = pricing_snapshots.reduce((sum, p) => sum + p.coupon, 0) / pricing_snapshots.length;
        const outliers = pricing_snapshots.filter(p => Math.abs(p.coupon - avgCoupon) > 0.002);

        if (outliers.length > 0) {
          findings.push({
            type: 'pricing_outlier',
            severity: 'warning',
            count: outliers.length,
            message: `${outliers.length} pricing outliers detected`
          });
        }
      }

      return Response.json({
        report_id: crypto.randomUUID(),
        findings,
        date_range,
        analysis_type: 'fair_lending_screening'
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});