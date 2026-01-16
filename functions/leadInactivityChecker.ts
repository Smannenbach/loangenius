import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const results = {
      checked: 0,
      enrolled: 0,
      errors: []
    };

    // Get all inactivity-triggered sequences
    const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
      trigger_type: 'lead_inactivity',
      is_active: true
    });

    for (const sequence of sequences) {
      try {
        const config = sequence.trigger_config || {};
        const inactivityDays = config.inactivity_days || 1;
        const targetStatus = config.target_status || 'new';
        
        const cutoffDate = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000);

        // Get leads matching criteria
        const leads = await base44.asServiceRole.entities.Lead.filter({
          status: targetStatus,
          is_deleted: false
        });

        for (const lead of leads) {
          results.checked++;
          
          // Check if lead has been inactive
          const lastActivity = new Date(lead.updated_date || lead.created_date);
          if (lastActivity > cutoffDate) continue;

          // Check if already enrolled in this sequence
          const existingEnrollments = await base44.asServiceRole.entities.SequenceEnrollment.filter({
            sequence_id: sequence.id,
            lead_id: lead.id
          });

          if (existingEnrollments.length > 0) continue;

          // Enroll in sequence
          await base44.asServiceRole.entities.SequenceEnrollment.create({
            org_id: lead.org_id,
            sequence_id: sequence.id,
            lead_id: lead.id,
            contact_email: lead.home_email || lead.work_email,
            contact_phone: lead.mobile_phone,
            status: 'active',
            current_step: 0,
            next_action_at: now.toISOString(),
            enrolled_at: now.toISOString(),
            steps_completed: []
          });

          results.enrolled++;
        }

      } catch (err) {
        results.errors.push({ sequence_id: sequence.id, error: err.message });
      }
    }

    // Also check for lost lead re-engagement (90 days)
    const reengagementSequences = await base44.asServiceRole.entities.EmailSequence.filter({
      trigger_type: 'lead_inactivity',
      is_active: true
    });

    for (const sequence of reengagementSequences) {
      const config = sequence.trigger_config || {};
      if (config.target_status !== 'lost') continue;

      const reengageDays = config.inactivity_days || 90;
      const cutoffDate = new Date(now.getTime() - reengageDays * 24 * 60 * 60 * 1000);

      const lostLeads = await base44.asServiceRole.entities.Lead.filter({
        status: 'lost',
        is_deleted: false
      });

      for (const lead of lostLeads) {
        const lastActivity = new Date(lead.updated_date || lead.created_date);
        if (lastActivity > cutoffDate) continue;

        const existingEnrollments = await base44.asServiceRole.entities.SequenceEnrollment.filter({
          sequence_id: sequence.id,
          lead_id: lead.id
        });

        if (existingEnrollments.length > 0) continue;

        await base44.asServiceRole.entities.SequenceEnrollment.create({
          org_id: lead.org_id,
          sequence_id: sequence.id,
          lead_id: lead.id,
          contact_email: lead.home_email || lead.work_email,
          contact_phone: lead.mobile_phone,
          status: 'active',
          current_step: 0,
          next_action_at: now.toISOString(),
          enrolled_at: now.toISOString(),
          steps_completed: []
        });

        results.enrolled++;
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});