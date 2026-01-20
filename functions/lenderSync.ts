/**
 * Lender Sync - Submit to lenders and check status
 * Handles automated data mapping between LoanGenius and lender systems
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, deal_id, lender_integration_id, submission_id } = await req.json();

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      case 'submit':
        return await handleSubmission(base44, deal_id, lender_integration_id, user);
      case 'check_status':
        return await checkSubmissionStatus(base44, submission_id);
      case 'sync_all':
        return await syncAllPendingSubmissions(base44, user);
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Lender sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleSubmission(base44, dealId, lenderIntegrationId, user) {
  if (!dealId || !lenderIntegrationId) {
    return Response.json({ error: 'Missing deal_id or lender_integration_id' }, { status: 400 });
  }

  const startTime = Date.now();

  // Fetch deal and lender integration
  const [deals, integrations] = await Promise.all([
    base44.entities.Deal.filter({ id: dealId }),
    base44.entities.LenderIntegration.filter({ id: lenderIntegrationId }),
  ]);

  const deal = deals[0];
  const integration = integrations[0];

  if (!deal) return Response.json({ error: 'Deal not found' }, { status: 404 });
  if (!integration) return Response.json({ error: 'Lender integration not found' }, { status: 404 });

  // Fetch related data for mapping
  const [borrowers, properties] = await Promise.all([
    base44.entities.Borrower.filter({ deal_id: dealId }).catch(() => []),
    base44.entities.Property.filter({ deal_id: dealId }).catch(() => []),
  ]);

  // Map data to lender format
  const mappedData = mapDealToLenderFormat(deal, borrowers, properties, integration);

  // Validate required fields
  const validationResult = validateSubmission(mappedData, integration);
  if (!validationResult.valid) {
    // Log failed validation
    await base44.entities.LenderSyncLog.create({
      org_id: deal.org_id,
      lender_integration_id: lenderIntegrationId,
      deal_id: dealId,
      sync_type: 'submit',
      direction: 'outbound',
      status: 'failed',
      error_message: 'Validation failed: ' + validationResult.errors.join(', '),
      request_payload: mappedData,
      duration_ms: Date.now() - startTime,
    });

    return Response.json({
      success: false,
      error: 'Validation failed',
      validation_errors: validationResult.errors,
    }, { status: 400 });
  }

  // Create sync log entry
  const syncLog = await base44.entities.LenderSyncLog.create({
    org_id: deal.org_id,
    lender_integration_id: lenderIntegrationId,
    deal_id: dealId,
    sync_type: 'submit',
    direction: 'outbound',
    status: 'pending',
    request_payload: mappedData,
  });

  try {
    let response;

    // Handle different integration types
    switch (integration.api_type) {
      case 'REST_API':
        response = await submitViaRestAPI(integration, mappedData);
        break;
      case 'EMAIL':
        response = await submitViaEmail(base44, integration, mappedData, deal);
        break;
      case 'MISMO_34':
        response = await submitViaMISMO(base44, integration, mappedData, deal);
        break;
      default:
        response = { success: true, reference_id: `MANUAL-${Date.now()}`, message: 'Manual submission required' };
    }

    // Update sync log
    await base44.entities.LenderSyncLog.update(syncLog.id, {
      status: response.success ? 'success' : 'failed',
      response_payload: response,
      lender_reference_id: response.reference_id,
      error_message: response.error,
      duration_ms: Date.now() - startTime,
    });

    // Update submission count
    if (response.success) {
      await base44.entities.LenderIntegration.update(lenderIntegrationId, {
        total_submissions: (integration.total_submissions || 0) + 1,
        successful_submissions: (integration.successful_submissions || 0) + 1,
        last_submission_at: new Date().toISOString(),
      });

      // Create submission record
      await base44.entities.LenderSubmission.create({
        org_id: deal.org_id,
        deal_id: dealId,
        lender_integration_id: lenderIntegrationId,
        lender_name: integration.lender_name,
        submission_method: integration.api_type,
        status: 'submitted',
        lender_loan_number: response.reference_id,
        submitted_at: new Date().toISOString(),
        submitted_by: user.email,
      }).catch(() => {});
    }

    return Response.json({
      success: response.success,
      sync_log_id: syncLog.id,
      lender_reference: response.reference_id,
      message: response.message,
      duration_ms: Date.now() - startTime,
    });

  } catch (error) {
    await base44.entities.LenderSyncLog.update(syncLog.id, {
      status: 'failed',
      error_message: error.message,
      retry_count: 0,
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min retry
      duration_ms: Date.now() - startTime,
    });

    return Response.json({
      success: false,
      error: error.message,
      sync_log_id: syncLog.id,
    }, { status: 500 });
  }
}

async function checkSubmissionStatus(base44, submissionId) {
  if (!submissionId) {
    return Response.json({ error: 'Missing submission_id' }, { status: 400 });
  }

  const submissions = await base44.entities.LenderSubmission.filter({ id: submissionId });
  const submission = submissions[0];
  
  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  // For REST API integrations, we could check status with the lender
  // For now, return current status
  return Response.json({
    success: true,
    submission,
    status: submission.status,
    last_updated: submission.updated_date,
  });
}

async function syncAllPendingSubmissions(base44, user) {
  // Find submissions needing status check
  const pendingSubmissions = await base44.entities.LenderSubmission.filter({
    status: 'submitted',
  });

  const results = [];
  for (const sub of pendingSubmissions.slice(0, 10)) { // Limit to 10
    const result = await checkSubmissionStatus(base44, sub.id);
    results.push({ id: sub.id, ...result });
  }

  return Response.json({
    success: true,
    checked: results.length,
    results,
  });
}

function mapDealToLenderFormat(deal, borrowers, properties, integration) {
  const primaryBorrower = borrowers.find(b => b.is_primary) || borrowers[0];
  const subjectProperty = properties.find(p => p.is_subject_property) || properties[0];

  return {
    loan: {
      amount: deal.loan_amount,
      term: deal.loan_term_months,
      rate: deal.interest_rate,
      purpose: deal.loan_purpose,
      product: deal.loan_product,
      ltv: deal.ltv,
      dscr: deal.dscr,
    },
    borrower: primaryBorrower ? {
      first_name: primaryBorrower.first_name,
      last_name: primaryBorrower.last_name,
      email: primaryBorrower.email,
      phone: primaryBorrower.phone,
      credit_score: primaryBorrower.credit_score,
    } : null,
    property: subjectProperty ? {
      address: subjectProperty.street_address,
      city: subjectProperty.city,
      state: subjectProperty.state,
      zip: subjectProperty.zip_code,
      type: subjectProperty.property_type,
      value: subjectProperty.appraised_value || deal.appraised_value,
      monthly_rent: subjectProperty.monthly_rent,
    } : null,
    submission_date: new Date().toISOString(),
    deal_number: deal.deal_number,
  };
}

function validateSubmission(data, integration) {
  const errors = [];

  if (!data.loan?.amount) errors.push('Loan amount is required');
  if (!data.borrower?.first_name) errors.push('Borrower first name is required');
  if (!data.borrower?.last_name) errors.push('Borrower last name is required');
  if (!data.property?.address) errors.push('Property address is required');

  // Check lender-specific requirements
  if (integration.min_loan_amount && data.loan?.amount < integration.min_loan_amount) {
    errors.push(`Loan amount below minimum (${integration.min_loan_amount})`);
  }
  if (integration.max_loan_amount && data.loan?.amount > integration.max_loan_amount) {
    errors.push(`Loan amount above maximum (${integration.max_loan_amount})`);
  }
  if (integration.min_dscr && data.loan?.dscr && data.loan.dscr < integration.min_dscr) {
    errors.push(`DSCR below minimum (${integration.min_dscr})`);
  }
  if (integration.max_ltv && data.loan?.ltv && data.loan.ltv > integration.max_ltv) {
    errors.push(`LTV above maximum (${integration.max_ltv}%)`);
  }

  return { valid: errors.length === 0, errors };
}

async function submitViaRestAPI(integration, data) {
  if (!integration.api_endpoint) {
    return { success: false, error: 'No API endpoint configured' };
  }

  // In production, this would make actual API call
  // For now, simulate successful submission
  return {
    success: true,
    reference_id: `API-${Date.now()}`,
    message: 'Submission received',
  };
}

async function submitViaEmail(base44, integration, data, deal) {
  if (!integration.submission_email) {
    return { success: false, error: 'No submission email configured' };
  }

  await base44.integrations.Core.SendEmail({
    to: integration.submission_email,
    subject: `Loan Submission - ${deal.deal_number || deal.id.slice(0, 8)}`,
    body: `
New loan submission from LoanGenius:

Loan Amount: $${data.loan.amount?.toLocaleString()}
Interest Rate: ${data.loan.rate}%
Loan Purpose: ${data.loan.purpose}
LTV: ${data.loan.ltv}%
DSCR: ${data.loan.dscr}

Borrower: ${data.borrower?.first_name} ${data.borrower?.last_name}
Email: ${data.borrower?.email}

Property: ${data.property?.address}
${data.property?.city}, ${data.property?.state} ${data.property?.zip}

Please log into your lender portal to process this submission.
    `,
  });

  return {
    success: true,
    reference_id: `EMAIL-${Date.now()}`,
    message: 'Email sent to lender',
  };
}

async function submitViaMISMO(base44, integration, data, deal) {
  // Trigger MISMO export
  try {
    const exportResult = await base44.functions.invoke('generateMISMO34', {
      deal_id: deal.id,
      profile: 'DSCR Lender (Generic)',
    });

    return {
      success: true,
      reference_id: `MISMO-${Date.now()}`,
      message: 'MISMO XML generated',
      export_url: exportResult?.data?.download_url,
    };
  } catch (e) {
    return {
      success: false,
      error: 'Failed to generate MISMO XML: ' + e.message,
    };
  }
}