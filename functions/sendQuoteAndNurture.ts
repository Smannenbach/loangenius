import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user && req.headers.get('x-automation') !== 'true') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();
    
    if (!deal_id) {
      return Response.json({ error: 'deal_id is required' }, { status: 400 });
    }

    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    
    // Get borrower
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
    if (dealBorrowers.length === 0) {
      return Response.json({ error: 'No borrower found for deal' }, { status: 400 });
    }
    
    const borrower = await base44.asServiceRole.entities.Borrower.get(dealBorrowers[0].borrower_id);
    
    if (!borrower?.email) {
      return Response.json({ error: 'Borrower email not found' }, { status: 400 });
    }

    // Generate quote/term sheet
    const loanAmount = deal.loan_amount || 0;
    const rate = deal.interest_rate || 7.5;
    const termMonths = deal.loan_term_months || 360;
    
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);

    const quoteHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1e40af;">Your Loan Quote</h2>
        <p>Dear ${borrower.first_name},</p>
        <p>Thank you for applying for a ${deal.loan_product} loan. Here's your customized quote:</p>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Loan Details</h3>
          <p><strong>Loan Amount:</strong> $${loanAmount.toLocaleString()}</p>
          <p><strong>Interest Rate:</strong> ${rate}%</p>
          <p><strong>Term:</strong> ${termMonths / 12} years</p>
          <p><strong>Estimated Monthly Payment:</strong> $${monthlyPayment.toFixed(0).toLocaleString()}</p>
        </div>

        <h3>Next Steps:</h3>
        <ol>
          <li>Review this quote carefully</li>
          <li>Log in to your portal to upload required documents</li>
          <li>Complete any pending items in your application</li>
          <li>We'll reach out to answer any questions</li>
        </ol>

        <p>Ready to move forward? Simply reply to this email or log in to your borrower portal to continue.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>Your LoanGenius Team</p>
        
        <p style="font-size: 11px; color: #666; margin-top: 30px;">
          This quote is valid for 7 days and subject to underwriting approval.
        </p>
      </div>
    `;

    // Send email with quote
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: borrower.email,
      subject: `Your ${deal.loan_product} Loan Quote - ${deal.deal_number || 'Application'}`,
      body: quoteHtml,
      from_name: 'LoanGenius'
    });

    // Send SMS if available
    if (borrower.cell_phone) {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
      
      if (twilioSid && twilioToken && twilioPhone) {
        const smsBody = `Your ${deal.loan_product} quote is ready! Est. payment: $${monthlyPayment.toFixed(0)}/mo at ${rate}%. Check your email for full details. Questions? Reply here.`;
        
        await fetch(
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
      }
    }

    // Log communication
    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: deal.org_id,
      deal_id,
      channel: 'email',
      direction: 'outbound',
      to: borrower.email,
      subject: `Your ${deal.loan_product} Loan Quote`,
      body: 'Quote email sent',
      status: 'sent'
    });

    return Response.json({
      success: true,
      quote_sent: true,
      borrower_email: borrower.email,
      monthly_payment: monthlyPayment.toFixed(2)
    });

  } catch (error) {
    console.error('Error sending quote:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});