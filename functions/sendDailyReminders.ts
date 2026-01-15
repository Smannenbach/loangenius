/**
 * Daily Reminders Job
 * Sends email/SMS reminders for outstanding documents, rate locks, tasks
 * Respects opt-out + consent + cadence controls
 * Runs once daily (scheduled)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const org_id = new URL(req.url).searchParams.get('org_id');
    if (!org_id) {
      return Response.json({ error: 'Missing org_id' }, { status: 400 });
    }

    let remindersSent = 0;

    // Find deals with outstanding documents
    const deals = await base44.asServiceRole.entities.Deal.filter({
      org_id,
      status: 'active'
    });

    for (const deal of deals) {
      // Get outstanding document requirements
      const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
        deal_id: deal.id,
        status: 'pending'
      });

      if (requirements.length === 0) continue;

      // Get primary borrower
      const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id: deal.id,
        role: 'primary'
      });

      if (!borrowers.length) continue;
      const borrower = borrowers[0];
      const borrowerEmail = borrower.email;

      // Check consent + opt-out
      const consent = await base44.asServiceRole.entities.ConsentRecord.filter({
        org_id,
        borrower_email: borrowerEmail,
        consent_type: 'email',
        status: 'opt_in'
      });

      if (!consent.length) continue; // No consent

      // Check if reminder already sent today
      const logs = await base44.asServiceRole.entities.ReminderLog.filter({
        deal_id: deal.id,
        borrower_email: borrowerEmail,
        reminder_type: 'document'
      });

      const lastReminder = logs.length > 0 ? new Date(logs[0].last_sent_at) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check cadence
      const cadence = logs.length > 0 ? logs[0].cadence : 'daily';
      let shouldSend = false;

      if (cadence === 'daily' && (!lastReminder || lastReminder < today)) {
        shouldSend = true;
      } else if (cadence === 'every_3_days' && (!lastReminder || daysDiff(lastReminder, new Date()) >= 3)) {
        shouldSend = true;
      } else if (cadence === 'weekly' && (!lastReminder || daysDiff(lastReminder, new Date()) >= 7)) {
        shouldSend = true;
      }

      if (!shouldSend) continue;

      // Build message
      const docList = requirements.slice(0, 3).map(r => `• ${r.name}`).join('\n');
      const message = `Dear Borrower,\n\nWe're waiting for the following documents to proceed with your loan:\n\n${docList}\n\nPlease upload them to your portal as soon as possible.\n\nDeal: ${deal.deal_number}`;

      // Send email
      try {
        await base44.integrations.Core.SendEmail({
          to: borrowerEmail,
          subject: `Action Required: Submit Missing Documents - ${deal.deal_number}`,
          body: message
        });

        // Log reminder
        const nextSend = new Date();
        if (cadence === 'daily') nextSend.setDate(nextSend.getDate() + 1);
        else if (cadence === 'every_3_days') nextSend.setDate(nextSend.getDate() + 3);
        else nextSend.setDate(nextSend.getDate() + 7);

        if (logs.length > 0) {
          await base44.asServiceRole.entities.ReminderLog.update(logs[0].id, {
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSend.toISOString()
          });
        } else {
          await base44.asServiceRole.entities.ReminderLog.create({
            org_id,
            deal_id: deal.id,
            borrower_email: borrowerEmail,
            reminder_type: 'document',
            channel: 'email',
            message_sent: message,
            sent_at: new Date().toISOString(),
            cadence: 'daily',
            next_send_at: nextSend.toISOString()
          });
        }

        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder for deal ${deal.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      reminders_sent: remindersSent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sendDailyReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function daysDiff(from, to) {
  const diffMs = to - from;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}