import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate Term Sheet PDF
 * Creates a professional quote/term sheet for borrowers
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
      pricing_snapshot_id,
      org_id,
    } = await req.json();

    // Get deal, borrower, property, pricing, and fees
    const deal = await base44.asServiceRole.entities.Deal.filter({
      id: deal_id,
      org_id,
    });
    
    if (deal.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const dealData = deal[0];

    // Get primary borrower
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id,
      role: 'primary',
    });

    const borrower = await base44.asServiceRole.entities.Borrower.filter({
      id: dealBorrowers[0]?.borrower_id,
    });

    // Get properties
    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id,
      is_subject_property: true,
    });

    const property = await base44.asServiceRole.entities.Property.filter({
      id: dealProperties[0]?.property_id,
    });

    // Get pricing snapshot
    const pricing = await base44.asServiceRole.entities.PricingSnapshot.filter({
      id: pricing_snapshot_id,
    });

    // Get fees
    const fees = await base44.asServiceRole.entities.DealFee.filter({
      deal_id,
    });

    // Get organization
    const org = await base44.asServiceRole.entities.Organization.filter({
      id: org_id,
    });

    // Build HTML content
    const html = buildTermSheetHTML({
      deal: dealData,
      borrower: borrower[0],
      property: property[0],
      pricing: pricing[0],
      fees: fees,
      organization: org[0],
      user,
    });

    // Generate PDF (using simulated server-side generation)
    const pdfBase64 = await generatePDFFromHTML(html);
    
    // Create GeneratedPdf record
    const filename = `TermSheet_${dealData.deal_number}_${Date.now()}.pdf`;
    const generatedPdf = await base44.asServiceRole.entities.GeneratedPdf.create({
      org_id,
      deal_id,
      pdf_type: 'term_sheet',
      filename,
      file_url: `/api/pdfs/download/${filename}`,
      file_size_bytes: pdfBase64.length,
      generated_by: user.email,
      pricing_snapshot_id: pricing_snapshot_id,
      version_number: 1,
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id,
      actor_user_id: user.email,
      entity_type: 'Deal',
      entity_id: deal_id,
      action: 'generated',
      summary: `Generated term sheet ${filename}`,
    });

    return Response.json({
      success: true,
      pdf_id: generatedPdf.id,
      filename,
      pdf_type: 'term_sheet',
    });
  } catch (error) {
    console.error('Error generating term sheet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildTermSheetHTML(data) {
  const {
    deal,
    borrower,
    property,
    pricing,
    fees,
    organization,
    user,
  } = data;

  const monthlyPI = computeMonthlyPI(deal.loan_amount, deal.interest_rate, deal.loan_term_months);
  const dscrColor = deal.dscr >= 1.25 ? '#22c55e' : deal.dscr >= 1.0 ? '#eab308' : '#ef4444';
  const dscrText = deal.dscr >= 1.25 ? 'QUALIFIED' : deal.dscr >= 1.0 ? 'MARGINAL' : 'BELOW MINIMUM';

  const totalFees = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const cashToClose = (deal.loan_amount || 0) - (deal.down_payment || 0) + totalFees;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .title { font-size: 20px; font-weight: bold; color: #2563eb; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
    .row { display: flex; margin-bottom: 8px; }
    .col { flex: 1; }
    .col-label { font-weight: bold; width: 200px; }
    .col-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    table th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: bold; border: 1px solid #d1d5db; }
    table td { padding: 8px; border: 1px solid #d1d5db; }
    .dscr-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .dscr-ratio { font-size: 32px; font-weight: bold; color: ${dscrColor}; }
    .dscr-label { color: #6b7280; font-size: 12px; }
    .dscr-status { color: ${dscrColor}; font-weight: bold; }
    .disclaimer { font-size: 11px; color: #6b7280; margin-top: 20px; }
    .footer { font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${organization?.logo_url ? `<img src="${organization.logo_url}" height="40">` : `<div class="logo">${organization?.name || 'LoanGenius'}</div>`}
    </div>
    <div class="title">TERM SHEET / QUOTE</div>
  </div>

  <div class="section">
    <div class="section-title">Borrower Information</div>
    <div class="row">
      <div class="col">
        <div class="row"><span class="col-label">Name:</span><span class="col-value">${borrower?.first_name} ${borrower?.last_name}</span></div>
        <div class="row"><span class="col-label">Email:</span><span class="col-value">${borrower?.email}</span></div>
        <div class="row"><span class="col-label">Phone:</span><span class="col-value">${borrower?.phone}</span></div>
      </div>
      <div class="col">
        <div class="row"><span class="col-label">Deal #:</span><span class="col-value">${deal?.deal_number}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Property Information</div>
    <div class="row">
      <div class="col-value"><strong>Address:</strong> ${property?.address_street}, ${property?.address_city}, ${property?.address_state} ${property?.address_zip}</div>
    </div>
    <div class="row">
      <div class="col"><strong>Type:</strong> ${property?.property_type}</div>
      <div class="col"><strong>Units:</strong> 1</div>
      <div class="col"><strong>Purchase Price:</strong> $${(property?.sqft || 0).toLocaleString()}</div>
    </div>
    <div class="row">
      <div class="col"><strong>Monthly Rent:</strong> $${(property?.gross_rent_monthly || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Loan Terms</div>
    <div class="row">
      <div class="col">
        <div class="row"><span class="col-label">Loan Type:</span><span class="col-value">${deal?.loan_product} ${deal?.loan_purpose}</span></div>
        <div class="row"><span class="col-label">Loan Amount:</span><span class="col-value">$${(deal?.loan_amount || 0).toLocaleString()}</span></div>
        <div class="row"><span class="col-label">Down Payment:</span><span class="col-value">$${((property?.sqft || 0) * 0.25).toLocaleString()} (25%)</span></div>
      </div>
      <div class="col">
        <div class="row"><span class="col-label">Interest Rate:</span><span class="col-value">${(deal?.interest_rate || 0).toFixed(3)}%</span></div>
        <div class="row"><span class="col-label">APR:</span><span class="col-value">${(pricing?.apr || (deal?.interest_rate || 0) + 0.235).toFixed(3)}%</span></div>
        <div class="row"><span class="col-label">Term:</span><span class="col-value">${deal?.loan_term_months} months (${Math.floor((deal?.loan_term_months || 360) / 12)} years)</span></div>
      </div>
    </div>
    <div class="row">
      <div class="col"><strong>Monthly P&I:</strong> $${monthlyPI.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      <div class="col"><strong>Prepay:</strong> ${deal?.prepay_penalty_type || 'None'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DSCR Analysis</div>
    <div class="row">
      <div class="col"><strong>Monthly Gross Rent:</strong> $${(property?.gross_rent_monthly || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
    </div>
    <div class="row">
      <div class="col"><strong>Monthly Expenses:</strong></div>
    </div>
    <div class="row">
      <div class="col" style="margin-left: 20px;">
        <div>- Property Tax: $${(property?.taxes_monthly || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        <div>- Insurance: $${(property?.insurance_monthly || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        <div>- HOA: $${(property?.hoa_monthly || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      </div>
    </div>
    
    <div class="dscr-box">
      <div class="dscr-label">DEBT SERVICE COVERAGE RATIO</div>
      <div class="dscr-ratio">${(deal?.dscr || 0).toFixed(2)}</div>
      <div class="dscr-status">${dscrText}</div>
      <div class="dscr-label" style="margin-top: 8px;">Minimum Required: 1.00</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Fees</div>
    <table>
      <tr>
        <th>Fee Description</th>
        <th style="text-align: right; width: 150px;">Amount</th>
      </tr>
      ${fees.map(f => `
        <tr>
          <td>${f.name}</td>
          <td style="text-align: right;">$${(f.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('')}
      <tr style="font-weight: bold;">
        <td>ESTIMATED CASH TO CLOSE</td>
        <td style="text-align: right;">$${cashToClose.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      </tr>
    </table>
  </div>

  <div class="disclaimer">
    <strong>DISCLAIMER:</strong> This is not a commitment to lend. Terms subject to change. Final terms determined upon full underwriting approval. Rate lock requires signed LOI and appraisal deposit.
  </div>

  <div class="footer">
    <div>Prepared by: ${user?.full_name} | Date: ${new Date().toLocaleDateString()}</div>
    <div>${organization?.name} | NMLS# ${organization?.nmls_id}</div>
    <div>Equal Housing Lender</div>
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

async function generatePDFFromHTML(html) {
  // For now, return a placeholder base64 PDF
  // In production, use a library like puppeteer or pdfkit
  return Buffer.from(html).toString('base64');
}