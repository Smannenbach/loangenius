/**
 * SendGrid Email Service
 * Sends emails with templates + tracking + opt-out support
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, to_email, subject, template_name, data, html_body, deal_id } = await req.json();

    if (!org_id || !to_email || (!template_name && !html_body)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check opt-out
    const optOuts = await base44.asServiceRole.entities.EmailOptOut.filter({
      org_id,
      email: to_email
    });

    if (optOuts.length > 0 && optOuts[0].status === 'opted_out') {
      return Response.json({ 
        success: false, 
        error: 'Borrower has opted out of email',
        email: to_email 
      }, { status: 400 });
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      return Response.json({ error: 'SendGrid API key not configured' }, { status: 500 });
    }

    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@loangenius.io';
    const fromName = 'LoanGenius';

    let body;
    if (template_name) {
      body = getEmailTemplate(template_name, data);
    } else {
      body = html_body;
    }

    // SendGrid API payload
    const payload = {
      personalizations: [
        {
          to: [{ email: to_email }],
          subject: subject
        }
      ],
      from: {
        email: fromEmail,
        name: fromName
      },
      content: [
        {
          type: 'text/html',
          value: body
        }
      ],
      tracking_settings: {
        open: { enable: true },
        click: { enable: true }
      }
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      org_id,
      deal_id,
      channel: 'Email',
      direction: 'Outbound',
      from_address: fromEmail,
      to_address: to_email,
      subject,
      body,
      status: response.ok ? 'Sent' : 'Failed',
      provider: 'SendGrid',
      sent_at: new Date().toISOString()
    });

    return Response.json({
      success: response.ok,
      status: response.status,
      email: to_email,
      message: response.ok ? 'Email sent' : 'Email send failed'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getEmailTemplate(template_name, data = {}) {
  const templates = {
    welcome: `
      <h2>Welcome to LoanGenius</h2>
      <p>Dear ${data.borrower_name || 'Borrower'},</p>
      <p>Your loan application has been created. Use your portal to:</p>
      <ul>
        <li>Upload required documents</li>
        <li>Track your loan status</li>
        <li>Communicate with your loan officer</li>
      </ul>
      <a href="${data.portal_url}">Access Your Portal</a>
    `,
    document_request: `
      <h2>Documents Required</h2>
      <p>Dear ${data.borrower_name || 'Borrower'},</p>
      <p>We need the following documents to move forward:</p>
      <p>${data.documents?.join('<br>') || 'See portal for details'}</p>
      <p>Due by: ${data.due_date || 'As soon as possible'}</p>
      <a href="${data.portal_url}">Upload Documents</a>
    `,
    rate_lock: `
      <h2>Rate Lock Confirmation</h2>
      <p>Your rate has been locked!</p>
      <table>
        <tr><td>Rate:</td><td>${data.rate}%</td></tr>
        <tr><td>Points:</td><td>${data.points}</td></tr>
        <tr><td>Lock Days:</td><td>${data.lock_days}</td></tr>
        <tr><td>Expires:</td><td>${data.expiration_date}</td></tr>
      </table>
    `,
    approval: `
      <h2>Loan Approved!</h2>
      <p>Great news! Your loan application has been approved.</p>
      <p>Next steps:</p>
      <ol>
        <li>Schedule closing appointment</li>
        <li>Review final documents</li>
        <li>Complete e-signature process</li>
      </ol>
      <a href="${data.portal_url}">View Details</a>
    `
  };

  return templates[template_name] || '<p>Message from your lender</p>';
}