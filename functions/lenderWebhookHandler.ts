import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Lender Webhook Handler
// Receives status updates from lender APIs

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validate webhook signature (implement per lender requirements)
    const signature = req.headers.get('X-Lender-Signature');
    const webhookSecret = Deno.env.get('LENDER_WEBHOOK_SECRET');
    
    // In production: verify signature here
    // if (!verifySignature(signature, webhookSecret, body)) {
    //   return Response.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload = await req.json();
    const { 
      submission_id, 
      lender_loan_number,
      status,
      message,
      conditions,
      pricing 
    } = payload;

    if (!submission_id) {
      return Response.json({ error: 'Missing submission_id' }, { status: 400 });
    }

    // Find submission
    const submissions = await base44.asServiceRole.entities.LenderSubmission.filter({ 
      id: submission_id 
    });
    const submission = submissions[0];

    if (!submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Update submission with lender response
    await base44.asServiceRole.entities.LenderSubmission.update(submission.id, {
      status: status || submission.status,
      lender_loan_number: lender_loan_number || submission.lender_loan_number,
      response_message: message,
      lender_response_at: new Date().toISOString(),
      conditions: conditions || submission.conditions,
      pricing: pricing || submission.pricing
    });

    // Update deal if status change
    if (status === 'approved' && submission.deal_id) {
      await base44.asServiceRole.entities.Deal.update(submission.deal_id, {
        stage: 'approved'
      });
    } else if (status === 'denied' && submission.deal_id) {
      await base44.asServiceRole.entities.Deal.update(submission.deal_id, {
        stage: 'denied'
      });
    }

    // Create activity log
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: submission.org_id,
      deal_id: submission.deal_id,
      activity_type: 'lender_response',
      description: `${submission.lender_name}: ${message || status}`,
      metadata: { submission_id, lender_loan_number, status }
    }).catch(() => {});

    return Response.json({ 
      success: true,
      message: 'Webhook processed' 
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});