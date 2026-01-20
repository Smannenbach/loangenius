import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, credit_report_id, borrower_id, data } = await req.json();

    if (action === 'pull_credit') {
      const { pull_type } = data || {};
      
      // Create credit report record (in real implementation, would call credit bureau API)
      const report = await base44.entities.CreditReport.create({
        org_id, deal_id, borrower_id, pull_type: pull_type || 'hard', bureau: 'tri_merge',
        pull_date: new Date().toISOString(),
        expires_at: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 120 days
        status: 'pending'
      });
      
      return Response.json({ success: true, credit_report_id: report.id });
    }

    if (action === 'analyze_profile') {
      const reports = await base44.entities.CreditReport.filter({ id: credit_report_id });
      const report = reports[0];
      if (!report) return Response.json({ error: 'Credit report not found' }, { status: 404 });
      
      const tradelines = await base44.entities.Tradeline.filter({ credit_report_id });
      const totalLiabilities = tradelines.filter(t => !t.exclude_from_dti).reduce((sum, t) => sum + (t.monthly_payment || 0), 0);
      
      const flags = [];
      const recommendations = [];
      
      if (report.representative_score < 680) flags.push('Credit score below 680 threshold');
      if (report.late_payments_30 > 0) flags.push(`${report.late_payments_30} late payments (30 days) in history`);
      if (report.late_payments_60 > 0) flags.push(`${report.late_payments_60} late payments (60 days) in history`);
      if (report.late_payments_90 > 0) flags.push(`${report.late_payments_90} late payments (90+ days) in history`);
      if (report.bankruptcy) flags.push('Bankruptcy on record');
      if (report.foreclosure) flags.push('Foreclosure on record');
      if (report.utilization_rate > 30) flags.push(`High credit utilization (${report.utilization_rate}%)`);
      
      if (report.utilization_rate > 30) recommendations.push('Pay down credit card balances to reduce utilization');
      if (report.inquiries_last_6_months > 3) recommendations.push('Avoid additional credit inquiries');
      
      await base44.entities.CreditReport.update(credit_report_id, { status: 'analyzed' });
      
      return Response.json({ analysis: { score: report.representative_score, utilization: report.utilization_rate, total_liabilities: totalLiabilities }, flags, recommendations });
    }

    if (action === 'calculate_liabilities') {
      const tradelines = await base44.entities.Tradeline.filter({ credit_report_id });
      const included = tradelines.filter(t => !t.exclude_from_dti);
      const excluded = tradelines.filter(t => t.exclude_from_dti);
      const totalLiabilities = included.reduce((sum, t) => sum + (t.monthly_payment || 0), 0);
      
      return Response.json({ total_liabilities: totalLiabilities, included: included.map(t => ({ name: t.creditor_name, payment: t.monthly_payment })), excluded: excluded.map(t => ({ name: t.creditor_name, reason: t.exclude_reason })) });
    }

    if (action === 'check_expiration') {
      const reports = await base44.entities.CreditReport.filter({ deal_id });
      const report = reports.sort((a, b) => new Date(b.pull_date) - new Date(a.pull_date))[0];
      
      if (!report) return Response.json({ expires_at: null, days_remaining: 0, needs_refresh: true });
      
      const expiresAt = new Date(report.expires_at);
      const daysRemaining = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
      
      return Response.json({ expires_at: report.expires_at, days_remaining: daysRemaining, needs_refresh: daysRemaining < 30 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Credit analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});