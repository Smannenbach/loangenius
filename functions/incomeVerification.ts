import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, org_id, income_source_id, data } = await req.json();

    if (action === 'add_income_source') {
      const { source_type, employer_name, job_title, start_date, is_current, pay_frequency, base_salary, overtime, bonus, commission, other_income, borrower_id } = data;
      
      // Calculate monthly income based on pay frequency
      const totalAnnual = (base_salary || 0) + (overtime || 0) + (bonus || 0) + (commission || 0) + (other_income || 0);
      let monthlyIncome = totalAnnual / 12;
      
      if (pay_frequency === 'weekly') monthlyIncome = (base_salary || 0) * 52 / 12;
      else if (pay_frequency === 'biweekly') monthlyIncome = (base_salary || 0) * 26 / 12;
      else if (pay_frequency === 'semi_monthly') monthlyIncome = (base_salary || 0) * 24 / 12;
      else if (pay_frequency === 'monthly') monthlyIncome = base_salary || 0;
      
      const income = await base44.entities.IncomeSource.create({
        org_id, deal_id, borrower_id, source_type, employer_name, job_title, start_date, is_current,
        pay_frequency, base_salary, overtime, bonus, commission, other_income,
        monthly_income: monthlyIncome,
        annual_income: monthlyIncome * 12,
        verification_status: 'pending'
      });
      
      return Response.json({ success: true, income_source: income, monthly_income: monthlyIncome });
    }

    if (action === 'calculate_total_income') {
      const sources = await base44.entities.IncomeSource.filter({ deal_id });
      const verified = sources.filter(s => s.verification_status === 'verified');
      const totalMonthly = verified.reduce((sum, s) => sum + (s.monthly_income || 0), 0);
      
      const breakdown = {};
      for (const s of verified) {
        breakdown[s.source_type] = (breakdown[s.source_type] || 0) + (s.monthly_income || 0);
      }
      
      return Response.json({ total_monthly: totalMonthly, qualifying_income: totalMonthly, breakdown_by_type: breakdown, sources_count: verified.length });
    }

    if (action === 'request_voe') {
      const { method } = data;
      const voe = await base44.entities.EmploymentVerification.create({
        org_id, deal_id, income_source_id, verification_type: method || 'written_voe',
        requested_date: new Date().toISOString().split('T')[0], status: 'sent'
      });
      
      await base44.entities.IncomeSource.update(income_source_id, { verification_status: 'voe_sent' });
      
      return Response.json({ success: true, voe_request_id: voe.id });
    }

    if (action === 'process_voe_response') {
      const { salary_confirmed, start_date_confirmed, current_employment_confirmed, employer_response } = data;
      
      await base44.entities.EmploymentVerification.update(income_source_id, {
        completed_date: new Date().toISOString().split('T')[0],
        salary_confirmed, start_date_confirmed, current_employment_confirmed,
        employer_response_json: employer_response,
        status: salary_confirmed && current_employment_confirmed ? 'verified' : 'discrepancy'
      });
      
      const verifications = await base44.entities.EmploymentVerification.filter({ income_source_id });
      const ver = verifications[0];
      if (ver?.income_source_id) {
        await base44.entities.IncomeSource.update(ver.income_source_id, {
          verification_status: salary_confirmed && current_employment_confirmed ? 'verified' : 'pending'
        });
      }
      
      const discrepancies = [];
      if (!salary_confirmed) discrepancies.push('Salary not confirmed');
      if (!start_date_confirmed) discrepancies.push('Start date not confirmed');
      if (!current_employment_confirmed) discrepancies.push('Current employment not confirmed');
      
      return Response.json({ verified: discrepancies.length === 0, discrepancies });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Income verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});