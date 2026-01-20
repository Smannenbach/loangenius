/**
 * Send Quote - Generate and send loan quote
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { lead_id, quote_data, send_email } = body;

    if (!lead_id || !quote_data) {
      return Response.json({ error: 'Missing lead_id or quote_data' }, { status: 400 });
    }

    // Get lead
    const leads = await base44.entities.Lead.filter({ id: lead_id, org_id: orgId });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }
    const lead = leads[0];

    // Create quote record
    const quote = await base44.entities.Quote.create({
      org_id: orgId,
      lead_id: lead_id,
      loan_amount: quote_data.loan_amount,
      interest_rate: quote_data.interest_rate,
      loan_term: quote_data.loan_term,
      monthly_payment: quote_data.monthly_payment,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Send email if requested
    if (send_email && lead.home_email) {
      await base44.integrations.Core.SendEmail({
        to: lead.home_email,
        subject: 'Your Loan Quote',
        body: `
          Hi ${lead.first_name},

          Thank you for your interest in our loan products. Here is your personalized quote:

          Loan Amount: $${quote_data.loan_amount?.toLocaleString()}
          Interest Rate: ${quote_data.interest_rate}%
          Loan Term: ${quote_data.loan_term} months
          Estimated Monthly Payment: $${quote_data.monthly_payment?.toLocaleString()}

          Please reply to this email or call us to discuss your options.

          Best regards,
          Your Loan Team
        `,
      });
    }

    return Response.json({ success: true, quote });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});