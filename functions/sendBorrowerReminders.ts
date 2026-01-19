import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    
    // Service role access for automated reminders
    const isAutomation = req.headers.get('x-automation') === 'true';
    if (!user && !isAutomation) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { force } = body;
    
    // Handle entity automation payload if present
    let deal_id = body.deal_id;
    if (!deal_id && body.event?.entity_id) {
      deal_id = body.event.entity_id;
    }
    if (!deal_id && body.data?.id) {
      deal_id = body.data.id;
    }
    
    // Get all deals in application or processing stage with incomplete documents
    let dealsToRemind = [];
    
    if (deal_id) {
      const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
      dealsToRemind = [deal];
    } else {
      // Get all active deals in early stages
      const allDeals = await base44.asServiceRole.entities.Deal.filter({
        status: 'active',
        stage: 'application'
      });
      dealsToRemind = allDeals;
    }

    let remindersSent = 0;
    const results = [];

    for (const deal of dealsToRemind) {
      // Check for incomplete requirements
      let requirements = [];
      try {
        requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
          deal_id: deal.id,
          status: 'pending'
        });
      } catch (e) {
        console.log(`No requirements found for deal ${deal.id}, skipping`);
        continue;
      }

      if (!requirements || requirements.length === 0) continue; // All docs uploaded or none exist

      // Get borrower email
      const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
        deal_id: deal.id
      });
      
      if (dealBorrowers.length === 0) continue;

      const borrower = await base44.asServiceRole.entities.Borrower.get(dealBorrowers[0].borrower_id);
      
      if (!borrower?.email) continue;

      // Check if reminder was sent recently (within last 24 hours)
      const lastReminder = requirements[0]?.last_reminder_sent;
      if (!force && lastReminder) {
        const hoursSinceLastReminder = (Date.now() - new Date(lastReminder).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 24) {
          continue; // Skip if reminded in last 24 hours
        }
      }

      // Prepare reminder message
      const pendingDocs = requirements
        .filter(r => r.is_required && r.status === 'pending')
        .map(r => `• ${r.requirement_name}`)
        .join('\n');

      const emailSubject = `Action Required: Complete Your Loan Application - ${deal.deal_number || 'Your Loan'}`;
      const emailBody = `Dear ${borrower.first_name || 'Borrower'},

We need the following documents to continue processing your loan application:

${pendingDocs}

Please log in to your borrower portal to upload these documents:
[Portal Link]

If you have any questions, please don't hesitate to reach out.

Best regards,
Your Loan Team`;

      const smsBody = `LoanGenius: Your loan application needs ${requirements.length} document${requirements.length > 1 ? 's' : ''}. Please upload at your portal. Questions? Reply STOP to opt out.`;

      // Send email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: borrower.email,
          subject: emailSubject,
          body: emailBody,
          from_name: 'LoanGenius'
        });
        remindersSent++;
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      // Send SMS if phone available
      if (borrower.cell_phone) {
        try {
          // Check SMS opt-out first
          const optOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
            phone_number: borrower.cell_phone
          });
          
          if (optOuts.length === 0) {
            const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
            const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
            
            if (twilioSid && twilioToken && twilioPhone) {
              const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`)
                  },
                  body: new URLSearchParams({
                    To: borrower.cell_phone,
                    From: twilioPhone,
                    Body: smsBody
                  })
                }
              );
              
              if (response.ok) {
                remindersSent++;
              }
            }
          }
        } catch (smsError) {
          console.error('SMS send failed:', smsError);
        }
      }

      // Update reminder count on all requirements
      for (const requirement of requirements) {
        await base44.asServiceRole.entities.DealDocumentRequirement.update(requirement.id, {
          reminder_sent_count: (requirement.reminder_sent_count || 0) + 1,
          last_reminder_sent: new Date().toISOString()
        });
      }

      results.push({
        deal_id: deal.id,
        deal_number: deal.deal_number,
        borrower_email: borrower.email,
        pending_docs: requirements.length,
        reminder_sent: true
      });
    }

    return Response.json({
      success: true,
      reminders_sent: remindersSent,
      deals_processed: results.length,
      results
    });

  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});