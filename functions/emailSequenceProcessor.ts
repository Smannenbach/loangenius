import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    
    // Get all active enrollments that need processing
    const enrollments = await base44.asServiceRole.entities.SequenceEnrollment.filter({
      status: 'active'
    });

    const results = {
      processed: 0,
      sent: 0,
      completed: 0,
      errors: []
    };

    for (const enrollment of enrollments) {
      try {
        // Check if it's time to process this enrollment
        if (enrollment.next_action_at && new Date(enrollment.next_action_at) > now) {
          continue;
        }

        // Get the sequence
        const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
          id: enrollment.sequence_id
        });
        
        if (sequences.length === 0 || !sequences[0].is_active) {
          await base44.asServiceRole.entities.SequenceEnrollment.update(enrollment.id, {
            status: 'cancelled',
            cancelled_reason: 'Sequence not found or inactive'
          });
          continue;
        }

        const sequence = sequences[0];
        const steps = sequence.steps || [];
        const currentStep = enrollment.current_step || 0;

        // Check if sequence is complete
        if (currentStep >= steps.length) {
          await base44.asServiceRole.entities.SequenceEnrollment.update(enrollment.id, {
            status: 'completed',
            completed_at: now.toISOString()
          });
          results.completed++;
          continue;
        }

        const step = steps[currentStep];
        
        // Get lead/deal data for personalization
        let contactData = {};
        if (enrollment.lead_id) {
          const leads = await base44.asServiceRole.entities.Lead.filter({ id: enrollment.lead_id });
          if (leads.length > 0) contactData = leads[0];
        } else if (enrollment.deal_id) {
          const deals = await base44.asServiceRole.entities.Deal.filter({ id: enrollment.deal_id });
          if (deals.length > 0) contactData = deals[0];
        }

        // Personalize the message
        const personalizedSubject = personalizeTemplate(step.subject || '', contactData);
        const personalizedBody = personalizeTemplate(step.body || '', contactData);

        // Send based on channel
        if (step.channel === 'email') {
          const email = enrollment.contact_email || contactData.home_email || contactData.work_email;
          if (email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: personalizedSubject,
              body: personalizedBody
            });
            results.sent++;
          }
        } else if (step.channel === 'sms') {
          const phone = enrollment.contact_phone || contactData.mobile_phone;
          if (phone) {
            await base44.asServiceRole.functions.invoke('sendSMSNotification', {
              to: phone,
              message: personalizedBody
            });
            results.sent++;
          }
        }

        // Calculate next action time
        const nextStep = currentStep + 1;
        let nextActionAt = null;
        
        if (nextStep < steps.length) {
          const nextStepData = steps[nextStep];
          const delayMinutes = nextStepData.delay_minutes || 1440; // Default 24 hours
          nextActionAt = new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString();
        }

        // Update enrollment
        const stepsCompleted = enrollment.steps_completed || [];
        stepsCompleted.push({
          step: currentStep,
          channel: step.channel,
          sent_at: now.toISOString()
        });

        await base44.asServiceRole.entities.SequenceEnrollment.update(enrollment.id, {
          current_step: nextStep,
          next_action_at: nextActionAt,
          steps_completed: stepsCompleted,
          status: nextStep >= steps.length ? 'completed' : 'active',
          completed_at: nextStep >= steps.length ? now.toISOString() : null
        });

        results.processed++;

      } catch (err) {
        results.errors.push({ enrollment_id: enrollment.id, error: err.message });
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function personalizeTemplate(template, data) {
  let result = template;
  const placeholders = {
    '{{first_name}}': data.first_name || 'there',
    '{{last_name}}': data.last_name || '',
    '{{full_name}}': `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'there',
    '{{email}}': data.home_email || data.work_email || data.email || '',
    '{{phone}}': data.mobile_phone || data.home_phone || '',
    '{{property_address}}': `${data.property_street || ''}, ${data.property_city || ''}, ${data.property_state || ''}`.trim(),
    '{{loan_amount}}': data.loan_amount ? `$${Number(data.loan_amount).toLocaleString()}` : '',
    '{{loan_purpose}}': data.loan_purpose || '',
    '{{status}}': data.status || '',
    '{{fico_score}}': data.fico_score || '',
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}