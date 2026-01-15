import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send loan quote to borrower via email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { borrower_email, borrower_name, quote_data } = await req.json();

    if (!borrower_email || !quote_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailBody = `
Dear ${borrower_name},

Thank you for choosing LoanGenius for your loan needs. Below is your personalized loan quote.

LOAN QUOTE SUMMARY
==================

Property Address: ${quote_data.propertyAddress}
Property Value: $${parseFloat(quote_data.propertyValue).toLocaleString()}
Loan Amount: $${parseFloat(quote_data.loanAmount).toLocaleString()}
Interest Rate: ${quote_data.interestRate}%
Loan Term: ${quote_data.term} years
LTV: ${quote_data.ltv}%
DSCR: ${quote_data.dscr}

MONTHLY PAYMENT
===============
P&I: $${parseFloat(quote_data.monthlyPayment).toLocaleString()}

CLOSING COSTS BREAKDOWN
=======================
Origination Fee: $${parseFloat(quote_data.originationFee).toLocaleString()}
Points: $${parseFloat(quote_data.points).toLocaleString()}
Appraisal Fee: $${parseFloat(quote_data.appraisalFee || 0).toLocaleString()}
Title Insurance: $${parseFloat(quote_data.titleInsurance || 0).toLocaleString()}
Title Search: $${parseFloat(quote_data.titleSearch || 0).toLocaleString()}
Home Inspection: $${parseFloat(quote_data.homeInspection || 0).toLocaleString()}
Survey: $${parseFloat(quote_data.survey || 0).toLocaleString()}
Other Fees: $${parseFloat(quote_data.otherFees || 0).toLocaleString()}
-----
Total Closing Costs: $${parseFloat(quote_data.totalClosingCosts).toLocaleString()}

TOTAL LOAN COST
===============
Total Upfront: $${parseFloat(quote_data.totalUpfrontCosts).toLocaleString()}
Total Interest: $${(parseFloat(quote_data.totalPayment) - parseFloat(quote_data.loanAmount)).toLocaleString()}
Total Cost of Loan: $${parseFloat(quote_data.totalCostOfLoan).toLocaleString()}
APR: ${quote_data.apr}%

This quote is valid for 7 days. Please contact us for any questions.

Best regards,
LoanGenius Team
    `;

    await base44.integrations.Core.SendEmail({
      to: borrower_email,
      subject: `Your Loan Quote from LoanGenius - ${quote_data.borrowerName}`,
      body: emailBody,
      from_name: 'LoanGenius',
    });

    // Log the quote sent
    await base44.asServiceRole.entities.CommunicationsLog.create({
      org_id: user.org_id || 'default',
      channel: 'email',
      direction: 'outbound',
      to: borrower_email,
      from: user.email,
      subject: `Loan Quote - ${quote_data.borrowerName}`,
      body: `Quote for $${parseFloat(quote_data.loanAmount).toLocaleString()} at ${quote_data.interestRate}%`,
      status: 'sent',
    });

    return Response.json({
      success: true,
      message: `Quote sent to ${borrower_email}`,
    });
  } catch (error) {
    console.error('Send quote error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});