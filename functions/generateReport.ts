/**
 * Generate report with filtering and export
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id: provided_org_id, report_id, report_type, filters, format } = await req.json();

    // Get org_id from membership if not provided
    let org_id = provided_org_id;
    if (!org_id) {
      const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
        user_id: user.email
      });
      if (memberships.length > 0) {
        org_id = memberships[0].org_id;
      }
    }

    if (!org_id) {
      return Response.json({ error: 'Organization not found for user' }, { status: 400 });
    }

    // Support direct report_type without report_id for quick reports
    let report = null;
    if (report_id) {
      const reports = await base44.asServiceRole.entities.ReportDefinition.filter({ 
        id: report_id,
        org_id 
      });
      if (!reports.length) {
        return Response.json({ error: 'Report not found' }, { status: 404 });
      }
      report = reports[0];
    } else if (report_type) {
      // Create ad-hoc report based on type
      report = { report_type: report_type.toUpperCase() };
    } else {
      return Response.json({ error: 'Either report_id or report_type required' }, { status: 400 });
    }

    // Generate report based on type
    let data = [];
    const startTime = Date.now();

    if (report.report_type === 'PIPELINE') {
      data = await generatePipelineReport(base44, org_id, filters);
    } else if (report.report_type === 'PRODUCTION') {
      data = await generateProductionReport(base44, org_id, filters);
    } else if (report.report_type === 'SCORECARD') {
      data = await generateScorecardReport(base44, org_id, filters);
    } else if (report.report_type === 'LENDER') {
      data = await generateLenderReport(base44, org_id, filters);
    }

    const executionTime = Date.now() - startTime;

    // Create report run record only if we have a report_id
    let reportRun = null;
    if (report_id) {
      reportRun = await base44.asServiceRole.entities.ReportRun.create({
        org_id,
        report_id,
        run_type: 'MANUAL',
        filters_used: filters || {},
        row_count: data.length,
        status: 'COMPLETED',
        execution_time_ms: executionTime,
        run_by: user.email
      });
    }

    return Response.json({
      success: true,
      run_id: reportRun?.id || null,
      row_count: data.length,
      data: data.slice(0, 1000) // Limit to 1000 rows in response
    });
  } catch (error) {
    console.error('Error in generateReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generatePipelineReport(base44, org_id, filters) {
  const deals = await base44.asServiceRole.entities.Deal.filter({
    org_id,
    ...(filters?.status_filter && { stage: filters.status_filter })
  });

  return deals.map(deal => ({
    deal_number: deal.deal_number,
    borrower: deal.primary_borrower_id,
    loan_amount: deal.loan_amount,
    stage: deal.stage,
    loan_product: deal.loan_product,
    assigned_to: deal.assigned_to_user_id,
    days_in_stage: deal.created_at ? Math.floor((Date.now() - new Date(deal.created_at)) / (1000 * 60 * 60 * 24)) : 0,
    created_at: deal.created_at
  }));
}

async function generateProductionReport(base44, org_id, filters) {
  const deals = await base44.asServiceRole.entities.Deal.filter({
    org_id,
    stage: 'FUNDED'
  });

  const monthStart = filters?.month_start || new Date(new Date().setDate(1));
  const filtered = deals.filter(d => new Date(d.created_at) >= monthStart);

  return filtered.map(deal => ({
    deal_number: deal.deal_number,
    funded_date: deal.created_at,
    loan_amount: deal.loan_amount,
    loan_product: deal.loan_product,
    assigned_to: deal.assigned_to_user_id,
    interest_rate: deal.interest_rate,
    loan_term: deal.loan_term_months
  }));
}

async function generateScorecardReport(base44, org_id, filters) {
  const deals = await base44.asServiceRole.entities.Deal.filter({ org_id });
  const users = await base44.asServiceRole.entities.User.list();

  const scorecard = users.map(user => {
    const userDeals = deals.filter(d => d.assigned_to_user_id === user.id);
    const fundedDeals = userDeals.filter(d => d.stage === 'FUNDED');
    const applications = userDeals.filter(d => d.stage === 'APPLICATION');

    return {
      user_name: user.full_name,
      email: user.email,
      total_deals: userDeals.length,
      funded_count: fundedDeals.length,
      funded_volume: fundedDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0),
      applications_submitted: applications.length,
      pull_through_rate: applications.length > 0 ? (fundedDeals.length / applications.length * 100).toFixed(2) : 0,
      avg_loan_size: userDeals.length > 0 ? (userDeals.reduce((sum, d) => sum + (d.loan_amount || 0), 0) / userDeals.length).toFixed(0) : 0
    };
  });

  return scorecard.sort((a, b) => b.funded_volume - a.funded_volume);
}

async function generateLenderReport(base44, org_id, filters) {
  // Placeholder - would integrate with IntegrationConfig
  return [];
}