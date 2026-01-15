import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Render template with loan data and custom variables
 */
async function renderTemplate(base44, templateId, loanFileId, additionalVars = {}) {
  try {
    const template = await base44.entities.MessageTemplate.get(templateId);
    const loanFile = await base44.entities.LoanFile.get(loanFileId);
    
    if (!template || !loanFile) {
      throw new Error('Template or Loan File not found');
    }

    // Build variables object from loan data
    let borrower = null;
    let loanOfficer = null;
    let properties = [];
    
    if (loanFile.primary_borrower_id) {
      borrower = await base44.entities.Borrower.get(loanFile.primary_borrower_id);
    }
    
    if (loanFile.loan_officer_id) {
      const lo = await base44.entities.OrgMembership.get(loanFile.loan_officer_id);
      if (lo) loanOfficer = lo;
    }
    
    properties = await base44.entities.Property.filter({ loan_file_id: loanFileId });

    // Build variables map
    const variables = {
      // Borrower
      borrower_first_name: borrower?.first_name || '',
      borrower_last_name: borrower?.last_name || '',
      borrower_full_name: `${borrower?.first_name || ''} ${borrower?.last_name || ''}`.trim(),
      borrower_email: borrower?.email || '',
      borrower_phone: borrower?.phone || '',
      
      // Loan
      loan_number: loanFile.loan_number || '',
      loan_amount: loanFile.loan_amount ? `$${loanFile.loan_amount.toLocaleString()}` : '',
      loan_amount_raw: loanFile.loan_amount || 0,
      interest_rate: loanFile.interest_rate ? loanFile.interest_rate.toFixed(3) : '0',
      loan_term: loanFile.loan_term_months ? Math.round(loanFile.loan_term_months / 12) : 0,
      monthly_payment: loanFile.monthly_pitia ? `$${loanFile.monthly_pitia.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '',
      dscr_ratio: loanFile.dscr_ratio ? loanFile.dscr_ratio.toFixed(2) : '0',
      ltv: loanFile.ltv ? `${loanFile.ltv.toFixed(1)}%` : '',
      
      // Property (first property)
      property_address: properties[0] ? `${properties[0].address_street}, ${properties[0].address_city}, ${properties[0].address_state} ${properties[0].address_zip}` : '',
      property_street: properties[0]?.address_street || '',
      property_city: properties[0]?.address_city || '',
      property_state: properties[0]?.address_state || '',
      property_zip: properties[0]?.address_zip || '',
      
      // Dates
      closing_date: loanFile.closing_date ? new Date(loanFile.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
      closing_date_short: loanFile.closing_date ? new Date(loanFile.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      
      // Team
      lo_name: loanOfficer?.name || '',
      lo_email: loanOfficer?.email || '',
      lo_phone: loanOfficer?.phone || '',
      
      // Merge additional vars
      ...additionalVars,
    };

    // Replace variables in templates
    const replaceVars = (text) => {
      if (!text) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
    };

    return {
      subject: replaceVars(template.email_subject),
      emailHtml: replaceVars(template.email_body_html),
      emailText: replaceVars(template.email_body_text),
      smsBody: replaceVars(template.sms_body),
      template,
    };
  } catch (error) {
    console.error('Error rendering template:', error);
    throw error;
  }
}

/**
 * Send email via SendGrid
 */
async function sendEmail(base44, params) {
  const { to, subject, bodyHtml, bodyText, loanFileId, borrowerId } = params;
  
  try {
    if (!to || !subject || !bodyHtml) {
      throw new Error('Missing required email parameters');
    }

    // Check opt-in if borrower provided
    if (borrowerId) {
      const borrower = await base44.entities.Borrower.get(borrowerId);
      if (borrower && borrower.email_opt_in === false) {
        console.log(`Email skipped - borrower ${borrowerId} opted out`);
        return { success: false, skipped: true, reason: 'Borrower opted out' };
      }
    }

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@loangenius.ai',
        name: Deno.env.get('SENDGRID_FROM_NAME') || 'LoanGenius',
      },
      subject,
      content: [
        { type: 'text/plain', value: bodyText || bodyHtml },
        { type: 'text/html', value: bodyHtml },
      ],
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.status} ${response.statusText}`);
    }

    const messageId = response.headers.get('X-Message-Id') || crypto.randomUUID();

    // Log communication
    if (loanFileId) {
      await base44.asServiceRole.entities.Communication.create({
        loan_file_id: loanFileId,
        borrower_id: borrowerId,
        channel: 'Email',
        direction: 'Outbound',
        subject,
        body: bodyHtml,
        status: 'Sent',
        external_id: messageId,
        sent_at: new Date().toISOString(),
      });
    }

    return { success: true, messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(base44, params) {
  const { to, body, loanFileId, borrowerId } = params;
  
  try {
    if (!to || !body) {
      throw new Error('Missing required SMS parameters');
    }

    // Check opt-in if borrower provided
    if (borrowerId) {
      const borrower = await base44.entities.Borrower.get(borrowerId);
      if (borrower && borrower.sms_opt_in === false) {
        console.log(`SMS skipped - borrower ${borrowerId} opted out`);
        return { success: false, skipped: true, reason: 'Borrower opted out' };
      }
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone to E.164
    const formattedPhone = to.replace(/\D/g, '');
    const e164Phone = formattedPhone.startsWith('1') ? `+${formattedPhone}` : `+1${formattedPhone}`;

    const payload = new URLSearchParams({
      From: twilioFromNumber,
      To: e164Phone,
      Body: body.substring(0, 1600),
    });

    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const messageSid = result.sid;

    // Log communication
    if (loanFileId) {
      await base44.asServiceRole.entities.Communication.create({
        loan_file_id: loanFileId,
        borrower_id: borrowerId,
        channel: 'SMS',
        direction: 'Outbound',
        body,
        status: 'Sent',
        external_id: messageSid,
        sent_at: new Date().toISOString(),
      });
    }

    return { success: true, messageId: messageSid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main endpoint: send template
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, templateId, loanFileId, borrowerId, additionalVars } = await req.json();

    if (action === 'renderTemplate') {
      const rendered = await renderTemplate(base44, templateId, loanFileId, additionalVars);
      return Response.json(rendered);
    }

    if (action === 'sendTemplate') {
      const rendered = await renderTemplate(base44, templateId, loanFileId, additionalVars);
      const template = rendered.template;

      let results = {};

      if (template.channel === 'Email' || template.channel === 'Both') {
        results.email = await sendEmail(base44, {
          to: additionalVars.email || (await base44.entities.Borrower.get(borrowerId))?.email,
          subject: rendered.subject,
          bodyHtml: rendered.emailHtml,
          bodyText: rendered.emailText,
          loanFileId,
          borrowerId,
        });
      }

      if (template.channel === 'SMS' || template.channel === 'Both') {
        results.sms = await sendSMS(base44, {
          to: additionalVars.phone || (await base44.entities.Borrower.get(borrowerId))?.phone,
          body: rendered.smsBody,
          loanFileId,
          borrowerId,
        });
      }

      // Update template usage
      await base44.asServiceRole.entities.MessageTemplate.update(templateId, {
        times_used: (template.times_used || 0) + 1,
        last_used_at: new Date().toISOString(),
      });

      return Response.json({ success: true, results });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});