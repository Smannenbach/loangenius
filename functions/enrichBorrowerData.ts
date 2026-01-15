import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Enrich borrower data with credit pull and income verification
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { borrower_id, org_id, deal_id, include_credit = true, include_income = false } = await req.json();

    // Get borrower
    const borrowers = await base44.asServiceRole.entities.Borrower.filter({
      id: borrower_id,
      org_id,
    });

    if (borrowers.length === 0) {
      return Response.json({ error: 'Borrower not found' }, { status: 404 });
    }

    const borrower = borrowers[0];

    // Get credit bureau integration
    const integrations = await base44.asServiceRole.entities.ThirdPartyIntegration.filter({
      org_id,
      integration_type: 'credit_bureau',
      is_active: true,
    });

    if (integrations.length === 0 && include_credit) {
      return Response.json({
        error: 'No credit bureau integration configured',
        help: 'Admin must configure credit bureau integration',
      }, { status: 400 });
    }

    const results = {};

    // 1. Pull Credit Report
    if (include_credit && integrations.length > 0) {
      const creditResult = await pullCreditReport(borrower, integrations[0], org_id, deal_id, user, base44);
      results.credit = creditResult;
    }

    // 2. Verify Income (if requested)
    if (include_income) {
      const incomeResult = await verifyIncome(borrower, org_id, deal_id, user, base44);
      results.income = incomeResult;
    }

    return Response.json({
      success: true,
      borrower_id,
      results,
    });
  } catch (error) {
    console.error('Error enriching borrower data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function pullCreditReport(borrower, integration, org_id, deal_id, user, base44) {
  // Create enrichment log entry
  const enrichmentLog = await base44.asServiceRole.entities.EnrichmentLog.create({
    org_id,
    deal_id,
    entity_type: 'borrower',
    entity_id: borrower.id,
    enrichment_type: 'credit_pull',
    integration_id: integration.id,
    provider_name: integration.provider_name,
    status: 'processing',
    request_data: {
      first_name: borrower.first_name,
      last_name: borrower.last_name,
      // SSN would be decrypted here in production
    },
    initiated_by: user.email,
  });

  try {
    // Simulate credit bureau API call
    // In production, call actual Equifax, Experian, or TransUnion API
    const creditData = {
      credit_score: Math.floor(Math.random() * 200) + 600, // 600-800
      bureaus: [
        { bureau: 'Equifax', score: 720 },
        { bureau: 'Experian', score: 730 },
        { bureau: 'TransUnion', score: 710 },
      ],
      inquiries_last_90_days: Math.floor(Math.random() * 3),
      accounts: [
        { type: 'Mortgage', balance: 350000, payment: 2100, status: 'Current' },
        { type: 'Auto Loan', balance: 25000, payment: 450, status: 'Current' },
      ],
      delinquencies: [],
      total_monthly_debt: 2550,
    };

    // Create credit report record
    const creditReport = await base44.asServiceRole.entities.CreditReport.create({
      org_id,
      borrower_id: borrower.id,
      enrichment_log_id: enrichmentLog.id,
      credit_score: creditData.credit_score,
      credit_range: creditData.credit_score >= 750 ? 'Excellent' : creditData.credit_score >= 700 ? 'Good' : 'Fair',
      credit_bureaus: creditData.bureaus,
      accounts_json: creditData.accounts,
      inquiries_last_90_days: creditData.inquiries_last_90_days,
      delinquencies: creditData.delinquencies,
      total_monthly_debt: creditData.total_monthly_debt,
      pulled_at: new Date().toISOString(),
    });

    // Update borrower with credit score
    await base44.asServiceRole.entities.Borrower.update(borrower.id, {
      credit_score_est: creditData.credit_score,
    });

    // Update enrichment log
    await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
      status: 'completed',
      response_data: creditData,
    });

    return {
      success: true,
      credit_report_id: creditReport.id,
      score: creditData.credit_score,
      range: creditData.credit_range,
    };
  } catch (error) {
    await base44.asServiceRole.entities.EnrichmentLog.update(enrichmentLog.id, {
      status: 'failed',
      error_message: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

async function verifyIncome(borrower, org_id, deal_id, user, base44) {
  const enrichmentLog = await base44.asServiceRole.entities.EnrichmentLog.create({
    org_id,
    deal_id,
    entity_type: 'borrower',
    entity_id: borrower.id,
    enrichment_type: 'income_verification',
    provider_name: 'The Work Number',
    status: 'pending',
    initiated_by: user.email,
  });

  return {
    success: true,
    enrichment_log_id: enrichmentLog.id,
    status: 'pending',
    message: 'Income verification requested and will be completed asynchronously',
  };
}