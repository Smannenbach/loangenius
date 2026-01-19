import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Lender API Submission Handler
// Submits MISMO XML to lender APIs and tracks responses

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, lender_integration_id, submission_type = 'initial', skip_validation = false } = await req.json();

    if (!deal_id || !lender_integration_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get lender integration
    const integrations = await base44.asServiceRole.entities.LenderIntegration.filter({ id: lender_integration_id });
    const lender = integrations[0];

    if (!lender) {
      return Response.json({ error: 'Lender integration not found' }, { status: 404 });
    }

    // Generate MISMO XML
    const exportResponse = await base44.asServiceRole.functions.invoke('mismoExportOrchestrator', {
      deal_id,
      export_mode: lender.api_type === 'MISMO_34' ? 'GENERIC_MISMO_34' : 'DU_ULAD_STRICT'
    });

    if (!exportResponse.data.success) {
      return Response.json({
        error: 'Failed to generate MISMO XML',
        details: exportResponse.data.export_run
      }, { status: 400 });
    }

    const xmlContent = exportResponse.data.xml_content;

    // Pre-submission validation (unless explicitly skipped)
    if (!skip_validation) {
      const validationResponse = await base44.asServiceRole.functions.invoke('mismoSchemaValidator', {
        xml_content: xmlContent,
        schema_pack: lender.api_type === 'MISMO_34' ? 'standard' : 'strict',
        validation_mode: 'full',
        context: 'export'
      });

      const validationResult = validationResponse.data;
      
      if (!validationResult.can_proceed) {
        // Create failed submission record for audit
        await base44.asServiceRole.entities.LenderSubmission.create({
          org_id: lender.org_id,
          deal_id,
          lender_integration_id,
          lender_name: lender.lender_name,
          submission_type,
          submission_method: lender.api_type,
          submitted_by: user.email,
          submitted_at: new Date().toISOString(),
          status: 'failed',
          response_code: 'VALIDATION_FAILED',
          response_message: validationResult.block_reason || 'MISMO validation failed',
          notes: JSON.stringify({
            errors: validationResult.report?.errors?.slice(0, 5),
            warnings_count: validationResult.report?.summary?.total_warnings
          })
        });

        return Response.json({
          success: false,
          validation_failed: true,
          validation_status: validationResult.validation_status,
          block_reason: validationResult.block_reason,
          errors: validationResult.report?.errors || [],
          warnings: validationResult.report?.warnings || [],
          lender_response: {
            success: false,
            message: 'Pre-submission MISMO validation failed. Please fix the errors and try again.'
          }
        });
      }
    }

    // Create submission record
    const submission = await base44.asServiceRole.entities.LenderSubmission.create({
      org_id: lender.org_id,
      deal_id,
      lender_integration_id,
      lender_name: lender.lender_name,
      submission_type,
      submission_method: lender.api_type,
      submitted_by: user.email,
      submitted_at: new Date().toISOString(),
      status: 'pending',
      mismo_file_url: exportResponse.data.filename
    });

    // Submit based on API type
    let apiResponse;
    switch (lender.api_type) {
      case 'REST_API':
        apiResponse = await submitViaRestAPI(lender, xmlContent, submission.id);
        break;
      case 'EMAIL':
        apiResponse = await submitViaEmail(base44, lender, xmlContent, submission.id);
        break;
      case 'MISMO_34':
        apiResponse = await submitViaMISMOAPI(lender, xmlContent, submission.id);
        break;
      default:
        apiResponse = { success: false, message: 'Manual submission required' };
    }

    // Update submission with response
    await base44.asServiceRole.entities.LenderSubmission.update(submission.id, {
      status: apiResponse.success ? 'submitted' : 'failed',
      response_code: apiResponse.code,
      response_message: apiResponse.message,
      lender_loan_number: apiResponse.lender_loan_number
    });

    // Update lender stats
    await base44.asServiceRole.entities.LenderIntegration.update(lender.id, {
      total_submissions: (lender.total_submissions || 0) + 1,
      successful_submissions: apiResponse.success ? (lender.successful_submissions || 0) + 1 : lender.successful_submissions,
      last_submission_at: new Date().toISOString()
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: lender.org_id,
      user_id: user.email,
      action: 'lender_submission',
      entity_type: 'LenderSubmission',
      entity_id: submission.id,
      metadata: {
        lender_name: lender.lender_name,
        deal_id,
        submission_method: lender.api_type,
        success: apiResponse.success
      }
    }).catch(() => {});

    return Response.json({
      success: apiResponse.success,
      submission_id: submission.id,
      lender_response: apiResponse
    });

  } catch (error) {
    console.error('Lender submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function submitViaRestAPI(lender, xmlContent, submissionId) {
  if (!lender.api_endpoint) {
    return { success: false, message: 'API endpoint not configured' };
  }

  try {
    // Get API key from lender config (decrypt if needed)
    const apiKey = lender.api_key_encrypted; // In production, decrypt this

    const response = await fetch(lender.api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${apiKey}`,
        'X-Submission-ID': submissionId
      },
      body: xmlContent
    });

    const responseData = await response.json().catch(() => ({}));

    return {
      success: response.ok,
      code: response.status.toString(),
      message: responseData.message || response.statusText,
      lender_loan_number: responseData.loan_number
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

async function submitViaEmail(base44, lender, xmlContent, submissionId) {
  if (!lender.submission_email) {
    return { success: false, message: 'Submission email not configured' };
  }

  try {
    await base44.integrations.Core.SendEmail({
      to: lender.submission_email,
      subject: `Loan Submission - ${submissionId}`,
      body: `Please find attached MISMO 3.4 XML submission.\n\nSubmission ID: ${submissionId}\n\nXML Content:\n\n${xmlContent}`
    });

    return {
      success: true,
      code: '200',
      message: 'Submitted via email'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

async function submitViaMISMOAPI(lender, xmlContent, submissionId) {
  // Standard MISMO API submission
  return submitViaRestAPI(lender, xmlContent, submissionId);
}