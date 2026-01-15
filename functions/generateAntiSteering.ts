import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate Anti-Steering / Business Purpose Certification
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

    const dealProperties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id,
      is_subject_property: true,
    });

    const property = await base44.asServiceRole.entities.Property.filter({
      id: dealProperties[0]?.property_id,
    });

    const org = await base44.asServiceRole.entities.Organization.filter({
      id: org_id,
    });

    const html = buildAntiSteeringHTML({
      deal: deal[0],
      borrower: borrower[0],
      property: property[0],
      organization: org[0],
      user,
    });

    const filename = `AntiSteering_${deal[0].deal_number}_${Date.now()}.pdf`;
    const generatedPdf = await base44.asServiceRole.entities.GeneratedPdf.create({
      org_id,
      deal_id,
      pdf_type: 'anti_steering',
      filename,
      file_url: `/api/pdfs/download/${filename}`,
      generated_by: user.email,
      version_number: 1,
    });

    await base44.asServiceRole.entities.ActivityLog.create({
      org_id,
      actor_user_id: user.email,
      entity_type: 'Deal',
      entity_id: deal_id,
      action: 'generated',
      summary: `Generated anti-steering letter ${filename}`,
    });

    return Response.json({
      success: true,
      pdf_id: generatedPdf.id,
      filename,
      pdf_type: 'anti_steering',
    });
  } catch (error) {
    console.error('Error generating anti-steering:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildAntiSteeringHTML(data) {
  const {
    deal,
    borrower,
    property,
    organization,
    user,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; font-weight: bold; }
    .title { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
    .checkbox { width: 15px; height: 15px; border: 1px solid #333; display: inline-block; margin-right: 5px; vertical-align: middle; }
    .checkbox.checked::after { content: "☑"; position: relative; left: -12px; }
    .line-item { margin-bottom: 8px; }
    .table-container { margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; }
    table th { background: #f0f0f0; padding: 8px; border: 1px solid #999; font-weight: bold; }
    table td { padding: 8px; border: 1px solid #999; }
    .signature-line { border-bottom: 1px solid #333; width: 300px; display: inline-block; margin: 20px 0; }
    .signature-label { font-size: 10px; color: #666; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <div class="header">${organization?.name}</div>
  <div class="title">BUSINESS PURPOSE CERTIFICATION AND ANTI-STEERING DISCLOSURE</div>

  <div class="section">
    <div class="line-item"><strong>Borrower Name(s):</strong> ${borrower?.first_name} ${borrower?.last_name}</div>
    <div class="line-item"><strong>Property Address:</strong> ${property?.address_street}, ${property?.address_city}, ${property?.address_state} ${property?.address_zip}</div>
    <div class="line-item"><strong>Loan Amount:</strong> $${(deal?.loan_amount || 0).toLocaleString()}</div>
    <div class="line-item"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="section-title">BUSINESS PURPOSE CERTIFICATION</div>
    <p>The undersigned borrower(s) hereby certify as follows:</p>
    
    <div class="line-item">
      <strong>1. The loan being requested is for business purposes:</strong>
      <div style="margin-left: 20px;">
        <div><span class="checkbox checked"></span>Acquiring investment property</div>
        <div><span class="checkbox"></span>Refinancing investment property</div>
        <div><span class="checkbox"></span>Business/Commercial purposes</div>
        <div><span class="checkbox"></span>Other: _______________________</div>
      </div>
    </div>

    <div class="line-item">
      <strong>2. The property securing this loan:</strong>
      <div style="margin-left: 20px;">
        <div><span class="checkbox checked"></span>Is NOT and will NOT be my/our primary residence</div>
        <div><span class="checkbox checked"></span>Is used or intended for rental/investment purposes</div>
        <div><span class="checkbox checked"></span>Has __1__ rental unit(s) generating $__${(property?.gross_rent_monthly || 0).toLocaleString()}__/month</div>
      </div>
    </div>

    <div class="line-item">
      <strong>3.</strong> This loan is NOT being used for personal, family, or household purposes.
    </div>

    <div class="line-item">
      <strong>4.</strong> I/We understand that because this is a business purpose loan, it is NOT subject to consumer protection laws including the Truth in Lending Act (TILA), Real Estate Settlement Procedures Act (RESPA), and other consumer lending regulations.
    </div>
  </div>

  <div class="section">
    <div class="section-title">ANTI-STEERING DISCLOSURE</div>
    <p>My Loan Originator has provided information about loan products for which I am likely to qualify. I have been informed of:</p>
    <ul>
      <li>The loan with the lowest interest rate</li>
      <li>The loan with the lowest total points, fees, and costs</li>
      <li>The loan with the lowest rate without negative amortization, prepayment penalty, interest-only, balloon, or shared equity/appreciation features</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">LOAN OPTIONS PRESENTED</div>
    <div class="table-container">
      <table>
        <tr>
          <th>Option</th>
          <th>Rate</th>
          <th>Points</th>
          <th>Prepay</th>
          <th>Monthly Pmt</th>
          <th>APR</th>
        </tr>
        <tr>
          <td>1</td>
          <td>${(deal?.interest_rate || 0).toFixed(3)}%</td>
          <td>1.5%</td>
          <td>${deal?.prepay_penalty_type || 'None'}</td>
          <td>$${computeMonthlyPI(deal?.loan_amount, deal?.interest_rate, deal?.loan_term_months).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td>${(deal?.interest_rate || 0 + 0.235).toFixed(3)}%</td>
        </tr>
        <tr>
          <td>2 ✓</td>
          <td>${(deal?.interest_rate || 0).toFixed(3)}%</td>
          <td>1.0%</td>
          <td>${deal?.prepay_penalty_type || 'None'}</td>
          <td>$${computeMonthlyPI(deal?.loan_amount, deal?.interest_rate, deal?.loan_term_months).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td>${(deal?.interest_rate || 0 + 0.235).toFixed(3)}%</td>
        </tr>
        <tr>
          <td>3</td>
          <td>${((deal?.interest_rate || 0) + 0.5).toFixed(3)}%</td>
          <td>0.0%</td>
          <td>None</td>
          <td>$${computeMonthlyPI(deal?.loan_amount, (deal?.interest_rate || 0) + 0.5, deal?.loan_term_months).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td>${((deal?.interest_rate || 0) + 0.5).toFixed(3)}%</td>
        </tr>
      </table>
    </div>
    <p>I have selected Option: <strong>2</strong> after considering alternatives.</p>
  </div>

  <div class="section">
    <div class="section-title">BORROWER ACKNOWLEDGMENT</div>
    <p>By signing below, I/we certify that the information provided is true and accurate. I/We acknowledge this is a business purpose loan and that I/we have been presented with loan alternatives as described above.</p>
    
    <div style="margin-top: 40px;">
      <div style="display: inline-block; width: 45%;">
        <div class="signature-line"></div>
        <div class="signature-label">Borrower Signature</div>
      </div>
      <div style="display: inline-block; width: 45%; margin-left: 5%;">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>

    <div style="margin-top: 30px;">
      <div style="display: inline-block; width: 45%;">
        <div class="signature-line"></div>
        <div class="signature-label">Co-Borrower Signature (if any)</div>
      </div>
      <div style="display: inline-block; width: 45%; margin-left: 5%;">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <div class="section-title">LOAN ORIGINATOR</div>
    <div style="margin-top: 40px;">
      <div style="display: inline-block; width: 45%;">
        <div class="signature-line"></div>
        <div class="signature-label">Loan Originator Signature</div>
      </div>
      <div style="display: inline-block; width: 45%; margin-left: 5%;">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>

    <div style="margin-top: 20px;">
      <div class="line-item"><strong>Name:</strong> ${user?.full_name}</div>
      <div class="line-item"><strong>NMLS#:</strong> _______________</div>
      <div class="line-item"><strong>Company:</strong> ${organization?.name}</div>
      <div class="line-item"><strong>Company NMLS#:</strong> ${organization?.nmls_id}</div>
    </div>
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