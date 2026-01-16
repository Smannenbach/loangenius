import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const { dealId, deal_id, borrowerId, borrower_id, reminderType, reminder_type, channel, escalationLevel } = await req.json();

    // Support both camelCase and snake_case
    const finalDealId = dealId || deal_id;
    const finalBorrowerId = borrowerId || borrower_id;
    const finalReminderType = reminderType || reminder_type || 'document_missing';

    if (!finalDealId || !finalBorrowerId) {
      return new Response(JSON.stringify({ error: 'Missing deal_id or borrower_id' }), { status: 400 });
    }

    // Get deal and borrower
    const deal = await base44.asServiceRole.entities.Deal.filter({ id: finalDealId });
    const borrower = await base44.asServiceRole.entities.Borrower.filter({ id: finalBorrowerId });
    
    if (!deal.length || !borrower.length) {
      return new Response(JSON.stringify({ error: 'Deal or borrower not found' }), { status: 404 });
    }

    // Get template for reminder type
    const template = getTemplate(finalReminderType, escalationLevel);

    // Render merge fields
    const recipient = channel === 'sms' ? borrower[0].phone : borrower[0].email;
    const subject = template.subject
      .replace('{{first_name}}', borrower[0].first_name)
      .replace('{{document_type}}', 'Bank Statements');
    
    const body = template.body
      .replace('{{first_name}}', borrower[0].first_name)
      .replace('{{last_name}}', borrower[0].last_name)
      .replace('{{document_type}}', 'Bank Statements')
      .replace('{{company_name}}', 'Loan Daddy');

    // Send via appropriate channel
    if (channel === 'email' || channel === 'both') {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject,
        body,
      });
    }

    // Create reminder log
    await base44.asServiceRole.entities.RemindersLog.create({
      org_id: deal[0].org_id || 'default',
      deal_id: finalDealId,
      borrower_id: finalBorrowerId,
      reminder_type: finalReminderType,
      channel: channel || 'email',
      escalation_level: escalationLevel || 1,
      recipient,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, message: 'Reminder sent' }), { status: 200 });

  } catch (error) {
    console.error('Error sending reminder:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function getTemplate(reminderType, level) {
  const templates = {
    document_missing: {
      1: {
        subject: 'Quick reminder: We need your {{document_type}}',
        body: `Hi {{first_name}},

Just a friendly reminder that we're still waiting on your {{document_type}} to move forward with your loan.

You can upload it anytime here: {{portal_link}}

Questions? Just reply to this email!

Best,
{{company_name}}`,
      },
      2: {
        subject: 'Action needed: {{document_type}} required',
        body: `Hi {{first_name}},

We haven't received your {{document_type}} yet and it's holding up your loan. Please upload it today: {{portal_link}}

Need help? Call us!

Best,
{{company_name}}`,
      },
      3: {
        subject: 'Final notice: Your loan file is incomplete',
        body: `Hi {{first_name}},

This is our final reminder about your {{document_type}}. Without it, we cannot proceed with your loan. Please upload immediately or contact us to discuss.

{{portal_link}}

Best,
{{company_name}}`,
      },
    },
  };

  return templates[reminderType]?.[level] || templates.document_missing[1];
}