import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Daily batch reminder job (scheduled - no user auth needed)
 * Sends reminders to borrowers with outstanding documents
 * Also notifies loan officers of deals needing attention
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a scheduled task - verify it came from Base44
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all organizations
    const orgs = await base44.asServiceRole.entities.Organization.list();
    
    let totalReminders = 0;
    let errors = [];

    // Process each org
    for (const org of orgs) {
      try {
        // Get deals in active stages needing attention
        const deals = await base44.asServiceRole.entities.Deal.filter({
          org_id: org.id,
          stage: { $in: ['application', 'processing', 'underwriting'] },
          is_deleted: false,
        });

        // For each deal, check for outstanding docs
        for (const deal of deals) {
          try {
            const outstandingReqs = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
              deal_id: deal.id,
              status: { $in: ['pending', 'requested'] },
              is_visible_to_borrower: true,
            });

            if (outstandingReqs.length === 0) continue;

            // Check if we already reminded today
            const lastReminder = await base44.asServiceRole.entities.RemindersLog.filter({
              deal_id: deal.id,
              reminder_type: 'document_missing',
            });

            const reminderToday = lastReminder.some(r => {
              const reminderDate = new Date(r.created_date).toDateString();
              const today = new Date().toDateString();
              return reminderDate === today;
            });

            if (reminderToday) continue;

            // Get primary borrower
            const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
              deal_id: deal.id,
              role: 'primary',
            });

            if (dealBorrowers.length === 0) continue;

            const borrower = await base44.asServiceRole.entities.Borrower.get(dealBorrowers[0].borrower_id);
            if (!borrower || !borrower.email) continue;

            // Determine escalation level based on days overdue
            let escalationLevel = 1;
            const oldestDue = outstandingReqs
              .filter(r => r.due_date)
              .map(r => new Date(r.due_date))
              .sort((a, b) => a - b)[0];

            if (oldestDue) {
              const daysOverdue = Math.floor((new Date() - oldestDue) / (1000 * 60 * 60 * 24));
              if (daysOverdue > 7) escalationLevel = 3;
              else if (daysOverdue > 3) escalationLevel = 2;
            }

            // Send borrower reminder
            const docList = outstandingReqs.map(r => r.display_name).join(', ');
            const subject = `Reminder: ${outstandingReqs.length} document(s) needed for ${deal.deal_number}`;
            const body = `Hi ${borrower.first_name},\n\nWe're still waiting on:\n${outstandingReqs.map(r => `• ${r.display_name}`).join('\n')}\n\nPlease upload via your portal to keep your application moving forward.\n\nThanks!`;

            await base44.integrations.Core.SendEmail({
              to: borrower.email,
              subject,
              body,
              from_name: 'LoanGenius Portal',
            });

            // Log reminder
            await base44.asServiceRole.entities.RemindersLog.create({
              org_id: org.id,
              deal_id: deal.id,
              borrower_id: borrower.id,
              reminder_type: 'document_missing',
              channel: 'email',
              escalation_level: escalationLevel,
              recipient: borrower.email,
              subject,
              body,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });

            totalReminders++;

            // Notify loan officer if high escalation
            if (escalationLevel >= 2 && deal.assigned_to_user_id) {
              await base44.integrations.Core.SendEmail({
                to: deal.assigned_to_user_id,
                subject: `Deal Alert: ${deal.deal_number} - Missing Documents (Level ${escalationLevel})`,
                body: `Deal ${deal.deal_number} for ${borrower.first_name} ${borrower.last_name} is missing critical documents:\n\n${outstandingReqs.map(r => `• ${r.display_name} (Due: ${new Date(r.due_date).toLocaleDateString()})`).join('\n')}\n\nPlease follow up with the borrower.`,
                from_name: 'LoanGenius Portal',
              });
            }
          } catch (err) {
            errors.push({ deal_id: deal.id, error: err.message });
          }
        }
      } catch (err) {
        errors.push({ org_id: org.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      reminders_sent: totalReminders,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Daily reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});