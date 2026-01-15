import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send daily reminders to borrowers for pending documents
 * Run via scheduled automation daily at 9am
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active deals
    const deals = await base44.asServiceRole.entities.Deal.filter({
      stage: { $nin: ['funded', 'denied', 'withdrawn'] },
    });

    let remindersSent = 0;

    for (const deal of deals) {
      // Get borrowers on this deal
      const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id: deal.id,
      });

      for (const db of dealBorrowers) {
        // Get active portal session
        const sessions = await base44.asServiceRole.entities.PortalSession.filter({
          deal_id: deal.id,
          borrower_id: db.borrower_id,
          is_revoked: false,
          expires_at: { $gt: new Date().toISOString() },
        });

        if (sessions.length === 0) continue;

        // Get pending requirements due soon (within 3 days)
        const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
          deal_id: deal.id,
          is_visible_to_borrower: true,
          status: { $in: ['pending', 'requested', 'rejected'] },
          is_required: true,
        });

        const pendingCount = requirements.length;
        if (pendingCount === 0) continue;

        // Get borrower and LO
        const borrower = await base44.asServiceRole.entities.Borrower.get(db.borrower_id);
        const lo = await base44.asServiceRole.entities.User.filter({
          email: deal.assigned_to_user_id,
        });

        // Send reminder email
        await base44.integrations.Core.SendEmail({
          to: borrower.email,
          subject: `Reminder: ${pendingCount} document${pendingCount > 1 ? 's' : ''} needed for your loan`,
          body: `Hi ${borrower.first_name},\n\nYou have ${pendingCount} document${pendingCount > 1 ? 's' : ''} still needed to complete your application.\n\nPlease upload them to your loan portal at your earliest convenience.\n\nYour loan officer: ${lo[0]?.full_name || 'Your Loan Team'}`,
        });

        remindersSent++;

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          org_id: deal.org_id,
          deal_id: deal.id,
          borrower_id: db.borrower_id,
          activity_type: 'REMINDER_SENT',
          description: `Reminder sent for ${pendingCount} pending document${pendingCount > 1 ? 's' : ''}`,
          source: 'system',
        });
      }
    }

    return Response.json({
      success: true,
      reminders_sent: remindersSent,
      deals_processed: deals.length,
    });
  } catch (error) {
    console.error('Portal reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});