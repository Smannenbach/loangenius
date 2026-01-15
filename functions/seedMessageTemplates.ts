import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const org = await base44.asServiceRole.entities.Organization.list();
    const orgId = org[0]?.id;

    if (!orgId) {
      return Response.json({ error: 'No organization found' }, { status: 400 });
    }

    const templates = [
      {
        org_id: orgId,
        name: 'Borrower Portal Invitation',
        description: 'Portal invite with magic link',
        channel: 'Both',
        template_type: 'Portal_Invite',
        is_system: true,
        email_subject: 'Welcome to Your Loan Application Portal - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Welcome, {{borrower_first_name}}!</h2>
  <p>Your loan officer, {{lo_name}}, has created a secure portal for your loan application.</p>
  <p><strong>Property:</strong> {{property_address}}</p>
  <p><strong>Loan Amount:</strong> {{loan_amount}}</p>
  <p>Please click the button below to access your portal and upload the required documents:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{portal_link}}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Access Your Portal
    </a>
  </p>
  <p>This link is unique to you and will expire in 7 days. Do not share it with anyone.</p>
  <p>If you have any questions, contact your loan officer:</p>
  <p>{{lo_name}}<br>{{lo_phone}}<br>{{lo_email}}</p>
</div>`,
        sms_body: 'Hi {{borrower_first_name}}, your loan portal is ready! Access it here: {{portal_link}} - {{lo_name}}, LoanGenius',
      },
      {
        org_id: orgId,
        name: 'Document Request',
        description: 'Request specific documents from borrower',
        channel: 'Both',
        template_type: 'Document_Request',
        is_system: true,
        email_subject: 'Documents Needed for Your Loan - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Documents Needed</h2>
  <p>Hi {{borrower_first_name}},</p>
  <p>To continue processing your loan for <strong>{{property_address}}</strong>, we need the following documents:</p>
  <ul style="background: #f9fafb; padding: 20px 40px; border-radius: 5px;">
    {{document_list}}
  </ul>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{portal_link}}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Upload Documents
    </a>
  </p>
  <p>Please upload these at your earliest convenience.</p>
  <p>Questions? Call {{lo_name}} at {{lo_phone}}.</p>
</div>`,
        sms_body: 'Hi {{borrower_first_name}}, we need documents for your loan. Upload here: {{portal_link}} Questions? Call {{lo_phone}}',
      },
      {
        org_id: orgId,
        name: 'Document Reminder (Friendly)',
        description: 'Friendly reminder after 3 days',
        channel: 'Both',
        template_type: 'Document_Reminder',
        is_system: true,
        send_automatically: true,
        trigger_event: 'document.pending_3_days',
        email_subject: 'Friendly Reminder: Documents Still Needed - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Quick Reminder</h2>
  <p>Hi {{borrower_first_name}},</p>
  <p>Just a friendly reminder that we're still waiting on the following documents for your loan:</p>
  <ul style="background: #fef3c7; padding: 20px 40px; border-radius: 5px; border-left: 4px solid #f59e0b;">
    {{pending_documents}}
  </ul>
  <p><strong>Target Closing Date:</strong> {{closing_date}}</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{portal_link}}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Upload Now
    </a>
  </p>
  <p>Thanks,<br>{{lo_name}}</p>
</div>`,
        sms_body: 'Hi {{borrower_first_name}}, reminder: we still need {{pending_count}} document(s) for closing on {{closing_date}}. Upload: {{portal_link}}',
      },
      {
        org_id: orgId,
        name: 'Document Reminder (Urgent)',
        description: 'Urgent reminder after 7 days',
        channel: 'Both',
        template_type: 'Document_Reminder',
        is_system: true,
        send_automatically: true,
        trigger_event: 'document.pending_7_days',
        email_subject: 'URGENT: Documents Required to Avoid Closing Delay - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
    <strong style="color: #dc2626;">⚠️ Action Required</strong>
    <p style="margin: 5px 0 0 0; color: #dc2626;">Missing documents may delay your closing on {{closing_date}}</p>
  </div>
  <p>Hi {{borrower_first_name}},</p>
  <p>We urgently need the following documents to keep your loan on track:</p>
  <ul style="background: #fef2f2; padding: 20px 40px; border-radius: 5px; border-left: 4px solid #dc2626;">
    {{pending_documents}}
  </ul>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{portal_link}}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Upload Documents Now
    </a>
  </p>
  <p>{{lo_name}}<br>{{lo_phone}}</p>
</div>`,
        sms_body: 'URGENT: {{borrower_first_name}}, we need {{pending_count}} doc(s) NOW to avoid delaying your {{closing_date}} closing. Upload: {{portal_link}} or call {{lo_phone}}',
      },
      {
        org_id: orgId,
        name: 'Loan Status Update',
        description: 'Notify borrower of status change',
        channel: 'Email',
        template_type: 'Status_Update',
        is_system: true,
        email_subject: 'Loan Status Update: {{new_status}} - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Loan Status Update</h2>
  <p>Hi {{borrower_first_name}},</p>
  <p>Great news! Your loan status has been updated:</p>
  <div style="background: #ecfdf5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
    <p style="margin: 0; color: #666;">New Status</p>
    <p style="margin: 5px 0; font-size: 24px; color: #059669; font-weight: bold;">{{new_status}}</p>
  </div>
  <p><strong>Property:</strong> {{property_address}}</p>
  <p><strong>Loan Amount:</strong> {{loan_amount}}</p>
  <p><strong>Target Closing:</strong> {{closing_date}}</p>
  <p>{{status_message}}</p>
  <p>Questions? Contact {{lo_name}} at {{lo_phone}}.</p>
</div>`,
      },
      {
        org_id: orgId,
        name: 'Quote/Term Sheet Sent',
        description: 'Send quote to borrower',
        channel: 'Email',
        template_type: 'Quote_Sent',
        is_system: true,
        email_subject: 'Your Loan Quote is Ready - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Your Loan Quote</h2>
  <p>Hi {{borrower_first_name}},</p>
  <p>Please find your loan quote for:</p>
  <p><strong>{{property_address}}</strong></p>
  <div style="background: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Loan Amount:</strong></td>
        <td style="padding: 8px 0; text-align: right;">{{loan_amount}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Interest Rate:</strong></td>
        <td style="padding: 8px 0; text-align: right;">{{interest_rate}}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Monthly Payment:</strong></td>
        <td style="padding: 8px 0; text-align: right;">{{monthly_payment}}</td>
      </tr>
      <tr style="border-top: 2px solid #e5e7eb;">
        <td style="padding: 12px 0;"><strong>Est. Cash to Close:</strong></td>
        <td style="padding: 12px 0; text-align: right; font-size: 18px; color: #2563eb;"><strong>{{cash_to_close}}</strong></td>
      </tr>
    </table>
  </div>
  <p>Ready to proceed? Reply or call {{lo_name}} at {{lo_phone}}.</p>
</div>`,
      },
      {
        org_id: orgId,
        name: 'Closing Reminder (3 Days)',
        description: 'Remind borrower closing is 3 days away',
        channel: 'Both',
        template_type: 'Closing_Reminder',
        is_system: true,
        send_automatically: true,
        trigger_event: 'closing.3_days_before',
        email_subject: 'Your Closing is in 3 Days! - {{loan_number}}',
        email_body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">🎉 Closing in 3 Days!</h2>
  <p>Hi {{borrower_first_name}},</p>
  <p>Your closing is scheduled for <strong>{{closing_date}}</strong>!</p>
  <div style="background: #ecfdf5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #059669;">Closing Details</h3>
    <p><strong>Date:</strong> {{closing_date}}</p>
    <p><strong>Property:</strong> {{property_address}}</p>
  </div>
  <h3>What to Bring:</h3>
  <ul>
    <li>Valid government-issued photo ID</li>
    <li>Certified/cashier's check for {{cash_to_close}}</li>
    <li>Proof of insurance</li>
  </ul>
  <p>Congratulations!<br>{{lo_name}}<br>{{lo_phone}}</p>
</div>`,
        sms_body: '🎉 {{borrower_first_name}}, your closing is in 3 days on {{closing_date}}! Bring ID and funds ({{cash_to_close}}). Call {{lo_phone}} with questions.',
      },
    ];

    for (const template of templates) {
      await base44.asServiceRole.entities.MessageTemplate.create(template);
    }

    return Response.json({
      success: true,
      message: `Seeded ${templates.length} message templates`,
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});