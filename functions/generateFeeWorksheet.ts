import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate Fee Worksheet PDF
 * Creates ARDRI/industry-standard fee worksheet
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      deal_id,
      org_id,
    } = await req.json();

    // Get all required data
    const deal = await base44.asServiceRole.entities.Deal.filter({
      id: deal_id,
      org_id,
    });

    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id,
      role: 'primary',
    });

    const borrower = await base44.asServiceRole.entities.Borrower.filter({
      id: dealBorrowers[0]?.borrower_id,
    });

    const fees = await base44.asServiceRole.entities.DealFee.filter({
      deal_id,
    });

    const org = await base44.asServiceRole.entities.Organization.filter({
      id: org_id,
    });

    // Categorize fees
    const lenderFees = fees.filter(f => f.category === 'lender' || f.category === 'origination');
    const thirdPartyFees = fees.filter(f => f.category === 'third_party');
    const govtFees = fees.filter(f => f.category === 'government');
    const prepaidsEscrow = fees.filter(f => f.category === 'prepaids' || f.category === 'escrow');

    const html = buildFeeWorksheetHTML({
      deal: deal[0],
      borrower: borrower[0],
      lenderFees,
      thirdPartyFees,
      govtFees,
      prepaidsEscrow,
      organization: org[0],
      user,
    });

    // Create GeneratedPdf record
    const filename = `FeeWorksheet_${deal[0].deal_number}_${Date.now()}.pdf`;
    const generatedPdf = await base44.asServiceRole.entities.GeneratedPdf.create({
      org_id,
      deal_id,
      pdf_type: 'fee_worksheet',
      filename,
      file_url: `/api/pdfs/download/${filename}`,
      generated_by: user.email,
      version_number: 1,
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id,
      actor_user_id: user.email,
      entity_type: 'Deal',
      entity_id: deal_id,
      action: 'generated',
      summary: `Generated fee worksheet ${filename}`,
    });

    return Response.json({
      success: true,
      pdf_id: generatedPdf.id,
      filename,
      pdf_type: 'fee_worksheet',
    });
  } catch (error) {
    console.error('Error generating fee worksheet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildFeeWorksheetHTML(data) {
  const {
    deal,
    borrower,
    lenderFees,
    thirdPartyFees,
    govtFees,
    prepaidsEscrow,
    organization,
    user,
  } = data;

  const lenderTotal = lenderFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const thirdPartyTotal = thirdPartyFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const govtTotal = govtFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const prepaidsTotal = prepaidsEscrow.reduce((sum, f) => sum + (f.amount || 0), 0);
  const allFees = lenderFees.concat(thirdPartyFees, govtFees, prepaidsEscrow);
  const totalFees = allFees.reduce((sum, f) => sum + (f.amount || 0), 0);

  const monthlyPI = computeMonthlyPI(deal.loan_amount, deal.interest_rate, deal.loan_term_months);
  const monthlyPayment = monthlyPI + (deal.monthly_pitia || 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 10px; color: #333; }
    .header { margin-bottom: 20px; }
    .title { font-size: 14px; font-weight: bold; }
    .subtitle { font-size: 10px; color: #666; }
    .section-header { background: #2563eb; color: white; padding: 6px; font-weight: bold; margin-top: 12px; }
    .fee-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
    .fee-label { flex: 1; }
    .fee-amount { text-align: right; width: 120px; }
    .total-row { font-weight: bold; background: #f0f0f0; padding: 4px 0; }
    .disclaimer { font-size: 9px; color: #666; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${borrower?.first_name} ${borrower?.last_name}</div>
    <div class="subtitle">INITIAL FEES WORKSHEET</div>
    <div class="subtitle">Preparation Date: ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section-header">LENDER FEES</div>
  ${lenderFees.map(f => `
    <div class="fee-row">
      <span class="fee-label">${f.name}</span>
      <span class="fee-amount">$${(f.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
    </div>
  `).join('')}
  <div class="total-row fee-row">
    <span class="fee-label">TOTAL LENDER FEES</span>
    <span class="fee-amount">$${lenderTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="section-header">THIRD PARTY FEES</div>
  ${thirdPartyFees.map(f => `
    <div class="fee-row">
      <span class="fee-label">${f.name}</span>
      <span class="fee-amount">$${(f.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
    </div>
  `).join('')}
  <div class="total-row fee-row">
    <span class="fee-label">TOTAL THIRD PARTY FEES</span>
    <span class="fee-amount">$${thirdPartyTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="section-header">GOVERNMENT FEES</div>
  ${govtFees.map(f => `
    <div class="fee-row">
      <span class="fee-label">${f.name}</span>
      <span class="fee-amount">$${(f.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
    </div>
  `).join('')}
  <div class="total-row fee-row">
    <span class="fee-label">TOTAL GOVERNMENT FEES</span>
    <span class="fee-amount">$${govtTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="section-header">PREPAIDS & ESCROW</div>
  ${prepaidsEscrow.map(f => `
    <div class="fee-row">
      <span class="fee-label">${f.name}</span>
      <span class="fee-amount">$${(f.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
    </div>
  `).join('')}
  <div class="total-row fee-row">
    <span class="fee-label">TOTAL PREPAIDS & ESCROW</span>
    <span class="fee-amount">$${prepaidsTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="section-header">SUMMARY</div>
  <div class="fee-row">
    <span class="fee-label">Loan Amount</span>
    <span class="fee-amount">$${(deal?.loan_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>
  <div class="fee-row">
    <span class="fee-label">Total Closing Costs</span>
    <span class="fee-amount">$${totalFees.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>
  <div class="total-row fee-row">
    <span class="fee-label">ESTIMATED CASH TO CLOSE</span>
    <span class="fee-amount">$${(totalFees + (deal?.down_payment || 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="section-header">ESTIMATED MONTHLY PAYMENT</div>
  <div class="fee-row">
    <span class="fee-label">Principal & Interest</span>
    <span class="fee-amount">$${monthlyPI.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>
  <div class="fee-row">
    <span class="fee-label">Taxes, Insurance & HOA</span>
    <span class="fee-amount">$${(deal?.monthly_pitia || monthlyPI * 0.3).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>
  <div class="total-row fee-row">
    <span class="fee-label">TOTAL MONTHLY PAYMENT</span>
    <span class="fee-amount">$${monthlyPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
  </div>

  <div class="disclaimer">
    ${organization?.name} | NMLS# ${organization?.nmls_id}<br>
    Your actual rate, payment and costs could be higher. Get an official Loan Estimate before choosing a loan.<br>
    Equal Housing Lender
  </div>
</body>
</html>
  `;
}

function computeMonthlyPI(loanAmount, rate, months) {
  if (!loanAmount || !rate || !months) return 0;
  const r = rate / 100 / 12;
  return loanAmount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}