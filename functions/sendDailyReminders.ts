import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: verify scheduled task token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.includes('Bearer')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all deals with outstanding docs
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      status: 'requested'
    });

    let reminders_sent = 0;
    let errors = [];

    // Group by deal + borrower
    const dealBorrowerMap = new Map();

    for (const req of requirements) {
      // Skip if snoozed
      if (req.snoozed_until && new Date(req.snoozed_until) > new Date()) {
        continue;
      }

      // Skip if already reminded today
      if (req.last_reminded_at) {
        const lastReminderDate = new Date(req.last_reminded_at).toDateString();
        const today = new Date().toDateString();
        if (lastReminderDate === today) {
          continue;
        }
      }

      const key = `${req.deal_id}`;
      if (!dealBorrowerMap.has(key)) {
        dealBorrowerMap.set(key, []);
      }
      dealBorrowerMap.get(key).push(req);
    }

    // Send reminders
    for (const [dealId, reqs] of dealBorrowerMap.entries()) {
      try {
        const deal = await base44.asServiceRole.entities.Deal.get(dealId);
        if (!deal) continue;

        // Get primary borrower
        const borrowers = await base44.asServiceRole.entities.Borrower.filter({
          deal_id: dealId,
          is_primary: true
        });

        if (borrowers.length === 0) continue;

        const borrower = borrowers[0];

        // Check email consent
        const emailConsent = await base44.asServiceRole.entities.ConsentRecord.filter({
          org_id: deal.org_id,
          contact_email: borrower.email,
          consent_type: 'email',
          status: 'opt_in'
        });

        if (emailConsent.length > 0) {
          // Send email reminder
          const docList = reqs.map(r => `• ${r.name}`).join('\n');
          
          await base44.asServiceRole.entities.Communication.create({
            org_id: deal.org_id,
            deal_id: dealId,
            channel: 'Email',
            direction: 'Outbound',
            from_address: Deno.env.get('MAIL_FROM_ADDRESS') || 'noreply@loangenius.com',
            to_address: borrower.email,
            subject: 'Reminder: Documents Still Needed for Your Loan',
            body: `Hi ${borrower.first_name || 'Borrower'},\n\nWe're still waiting on the following documents:\n\n${docList}\n\nPlease visit your portal to upload: ${Deno.env.get('PORTAL_BASE_URL') || 'https://portal.loangenius.com'}/login\n\nThanks!`,
            status: 'Queued'
          });

          reminders_sent++;
        }

        // Update last_reminded_at for all reqs in this deal
        for (const r of reqs) {
          await base44.asServiceRole.entities.DealDocumentRequirement.update(r.id, {
            last_reminded_at: new Date().toISOString()
          });
        }

        // Log reminder
        await base44.asServiceRole.entities.ReminderLog.create({
          org_id: deal.org_id,
          deal_id: dealId,
          contact_email: borrower.email,
          reminder_type: 'outstanding_documents',
          doc_count: reqs.length,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });

      } catch (err) {
        errors.push({
          deal_id: dealId,
          error: err.message
        });
      }
    }

    return Response.json({
      success: true,
      reminders_sent,
      deals_processed: dealBorrowerMap.size,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});