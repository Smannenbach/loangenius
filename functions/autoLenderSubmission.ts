import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, deal_id, org_id, lender_ids, submission_id } = await req.json();

    if (action === 'submit_to_lenders') {
      // Fetch deal
      const deals = await base44.entities.Deal.filter({ id: deal_id });
      const deal = deals[0];
      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 });
      }

      // Fetch selected lenders
      const lenders = await base44.entities.LenderIntegration.filter({ 
        org_id: org_id || deal.org_id,
        is_active: true 
      });

      const selectedLenders = lender_ids 
        ? lenders.filter(l => lender_ids.includes(l.id))
        : lenders;

      if (selectedLenders.length === 0) {
        return Response.json({ error: 'No lenders configured' }, { status: 400 });
      }

      const submissions = [];

      for (const lender of selectedLenders) {
        // Create submission record
        const submission = await base44.entities.LenderSubmission.create({
          org_id: org_id || deal.org_id,
          deal_id,
          lender_integration_id: lender.id,
          lender_name: lender.lender_name,
          submission_type: 'initial',
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user.email,
          notes: `Auto-submitted via system`,
        });

        submissions.push(submission);

        // Log activity
        try {
          await base44.entities.ActivityLog.create({
            org_id: org_id || deal.org_id,
            entity_type: 'deal',
            entity_id: deal_id,
            action: 'lender_submission',
            user_id: user.email,
            user_name: user.full_name,
            details_json: {
              lender_name: lender.lender_name,
              submission_id: submission.id,
            },
          });
        } catch (e) {
          console.log('Activity log failed:', e.message);
        }
      }

      return Response.json({
        success: true,
        submissions_created: submissions.length,
        submissions,
      });
    }

    if (action === 'update_status') {
      if (!submission_id) {
        return Response.json({ error: 'submission_id required' }, { status: 400 });
      }

      const { status, lender_loan_number, response_notes, conditions } = await req.json();

      const submissions = await base44.entities.LenderSubmission.filter({ id: submission_id });
      const submission = submissions[0];

      if (!submission) {
        return Response.json({ error: 'Submission not found' }, { status: 404 });
      }

      // Calculate response time
      const submittedAt = new Date(submission.submitted_at);
      const responseTimeHours = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60);

      const updateData = {
        status,
        response_received_at: new Date().toISOString(),
        response_time_hours: responseTimeHours,
      };

      if (lender_loan_number) updateData.lender_loan_number = lender_loan_number;
      if (response_notes) updateData.notes = response_notes;
      if (conditions) updateData.conditions_json = conditions;

      await base44.entities.LenderSubmission.update(submission_id, updateData);

      // Update deal status if approved
      if (status === 'approved') {
        await base44.entities.Deal.update(submission.deal_id, {
          status: 'conditional_approval',
        });
      }

      return Response.json({ success: true, updated: true });
    }

    if (action === 'get_submissions') {
      const submissions = await base44.entities.LenderSubmission.filter({ 
        deal_id,
      });

      // Calculate metrics
      const totalSubmissions = submissions.length;
      const pending = submissions.filter(s => ['submitted', 'in_review'].includes(s.status)).length;
      const approved = submissions.filter(s => s.status === 'approved').length;
      const denied = submissions.filter(s => s.status === 'denied').length;
      const avgResponseTime = submissions
        .filter(s => s.response_time_hours)
        .reduce((sum, s) => sum + s.response_time_hours, 0) / 
        (submissions.filter(s => s.response_time_hours).length || 1);

      return Response.json({
        submissions,
        metrics: {
          total: totalSubmissions,
          pending,
          approved,
          denied,
          avg_response_hours: avgResponseTime.toFixed(1),
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Lender submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});