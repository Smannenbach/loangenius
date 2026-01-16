import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    if (!event || !['DealDocumentRequirement', 'Document'].includes(event.entity_name)) {
      return Response.json({ skipped: true });
    }

    const results = { emails_sent: 0, sms_sent: 0 };

    // Determine event type
    let eventType = null;
    if (event.entity_name === 'DealDocumentRequirement') {
      if (event.type === 'update') {
        if (old_data?.status !== data?.status) {
          if (data.status === 'uploaded') eventType = 'document_submitted';
          else if (data.status === 'accepted') eventType = 'document_approved';
          else if (data.status === 'rejected') eventType = 'document_rejected';
        }
      }
    }

    if (!eventType) {
      return Response.json({ skipped: true, reason: 'No matching event type' });
    }

    // Get deal and borrower info
    let deal = null;
    let borrower = null;
    
    if (data.deal_id) {
      const deals = await base44.asServiceRole.entities.Deal.filter({ id: data.deal_id });
      deal = deals[0];
      
      if (deal?.primary_borrower_id) {
        const borrowers = await base44.asServiceRole.entities.Borrower.filter({ 
          id: deal.primary_borrower_id 
        });
        borrower = borrowers[0];
      }
    }

    // Get SMS notification config
    const smsConfigs = await base44.asServiceRole.entities.SMSNotificationConfig.filter({
      event_type: eventType,
      is_active: true
    });

    for (const config of smsConfigs) {
      let recipientPhone = null;
      
      if (config.recipient_type === 'borrower' && borrower?.cell_phone) {
        recipientPhone = borrower.cell_phone;
      }

      if (!recipientPhone) continue;

      const message = personalizeTemplate(config.template, {
        first_name: borrower?.first_name,
        last_name: borrower?.last_name,
        document_name: data.requirement_name,
        status: data.status,
        deal_number: deal?.deal_number
      });

      try {
        await base44.asServiceRole.functions.invoke('sendSMSNotification', {
          to: recipientPhone,
          message,
          event_type: eventType,
          entity_data: { org_id: data.org_id }
        });
        results.sms_sent++;
      } catch (err) {
        console.error('SMS error:', err);
      }
    }

    // Send email notification
    if (borrower?.email) {
      const emailSubjects = {
        'document_submitted': 'Document Received - {{document_name}}',
        'document_approved': 'Document Approved - {{document_name}}',
        'document_rejected': 'Action Required - {{document_name}}'
      };

      const emailBodies = {
        'document_submitted': `Hi {{first_name}},\n\nWe've received your {{document_name}}. Our team is reviewing it and will update you shortly.\n\nThank you for your prompt submission!`,
        'document_approved': `Hi {{first_name}},\n\nGreat news! Your {{document_name}} has been approved. ✓\n\nWe're one step closer to completing your loan application.`,
        'document_rejected': `Hi {{first_name}},\n\nWe need a revised version of your {{document_name}}.\n\nReason: ${data.rejection_reason || 'Please contact us for details.'}\n\nPlease upload a new version at your earliest convenience.`
      };

      const subject = personalizeTemplate(emailSubjects[eventType], {
        document_name: data.requirement_name
      });

      const body = personalizeTemplate(emailBodies[eventType], {
        first_name: borrower?.first_name || 'there',
        document_name: data.requirement_name
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: borrower.email,
        subject,
        body
      });
      results.emails_sent++;
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function personalizeTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}