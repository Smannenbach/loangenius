import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    if (!event || event.entity_name !== 'Lead') {
      return Response.json({ skipped: true, reason: 'Not a Lead event' });
    }

    const now = new Date();
    const results = { sequences_triggered: 0, sms_sent: 0 };

    // Handle status changes
    if (event.type === 'update' && old_data?.status !== data?.status) {
      const fromStatus = old_data?.status;
      const toStatus = data?.status;

      // Find matching sequences
      const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
        trigger_type: 'lead_status_change',
        is_active: true
      });

      for (const sequence of sequences) {
        const config = sequence.trigger_config || {};
        
        // Check if this sequence should trigger
        const matchesFrom = !config.from_status || config.from_status === fromStatus;
        const matchesTo = !config.to_status || config.to_status === toStatus;
        
        if (!matchesFrom || !matchesTo) continue;

        // Check if already enrolled
        const existing = await base44.asServiceRole.entities.SequenceEnrollment.filter({
          sequence_id: sequence.id,
          lead_id: data.id
        });

        if (existing.length > 0) {
          // Cancel existing enrollment if status changed
          await base44.asServiceRole.entities.SequenceEnrollment.update(existing[0].id, {
            status: 'cancelled',
            cancelled_reason: `Lead status changed to ${toStatus}`
          });
        }

        // Enroll in new sequence
        await base44.asServiceRole.entities.SequenceEnrollment.create({
          org_id: data.org_id,
          sequence_id: sequence.id,
          lead_id: data.id,
          contact_email: data.home_email || data.work_email,
          contact_phone: data.mobile_phone,
          status: 'active',
          current_step: 0,
          next_action_at: now.toISOString(),
          enrolled_at: now.toISOString(),
          steps_completed: []
        });

        results.sequences_triggered++;
      }

      // Send SMS notification if configured
      const smsConfigs = await base44.asServiceRole.entities.SMSNotificationConfig.filter({
        event_type: 'lead_status_change',
        is_active: true
      });

      for (const smsConfig of smsConfigs) {
        if (smsConfig.org_id && smsConfig.org_id !== data.org_id) continue;

        const phone = data.mobile_phone || data.home_phone;
        if (!phone) continue;

        const message = personalizeTemplate(smsConfig.template, {
          ...data,
          old_status: fromStatus,
          new_status: toStatus
        });

        try {
          await base44.asServiceRole.functions.invoke('sendSMSNotification', {
            to: phone,
            message
          });
          results.sms_sent++;
        } catch (err) {
          console.error('SMS send error:', err);
        }
      }
    }

    // Handle new leads
    if (event.type === 'create') {
      const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
        trigger_type: 'lead_status_change',
        is_active: true
      });

      for (const sequence of sequences) {
        const config = sequence.trigger_config || {};
        if (config.to_status !== 'new' && config.to_status) continue;

        await base44.asServiceRole.entities.SequenceEnrollment.create({
          org_id: data.org_id,
          sequence_id: sequence.id,
          lead_id: data.id,
          contact_email: data.home_email || data.work_email,
          contact_phone: data.mobile_phone,
          status: 'active',
          current_step: 0,
          next_action_at: now.toISOString(),
          enrolled_at: now.toISOString(),
          steps_completed: []
        });

        results.sequences_triggered++;
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
    '{{status}}': data.status || data.new_status || '',
    '{{old_status}}': data.old_status || '',
    '{{new_status}}': data.new_status || data.status || '',
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}