/**
 * Generate Term Sheet PDF from deal canonical snapshot
 * Shows loan terms, rate, fees, property, borrower summary
 * Now includes organization branding
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Fetch organization branding settings
 */
async function getOrgBranding(base44, orgId) {
  try {
    const settings = await base44.asServiceRole.entities.OrgSettings.filter({ org_id: orgId });
    const orgSettings = settings[0] || {};
    
    return {
      company_name: orgSettings.company_name || 'Your Company',
      logo_url: orgSettings.logo_url || null,
      nmls_id: orgSettings.nmls_id || '',
      phone: orgSettings.phone || '',
      address: orgSettings.address || '',
      website: orgSettings.website || '',
      primary_color: orgSettings.primary_color || '#2563eb',
    };
  } catch {
    return {
      company_name: 'Your Company',
      logo_url: null,
      nmls_id: '',
      phone: '',
      address: '',
      website: '',
      primary_color: '#2563eb',
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id: provided_org_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Fetch deal + borrower + property + fees
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    // Get organization branding
    const branding = await getOrgBranding(base44, deal.org_id);

    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id
    });

    const properties = await base44.asServiceRole.entities.DealProperty.filter({
      deal_id
    });

    const fees = await base44.asServiceRole.entities.DealFee.filter({
      deal_id
    });

    // Generate PDF
    const pdf = new jsPDF();
    let yPos = 15;

    // Branded Header
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235); // Blue
    pdf.text(branding.company_name, 20, yPos);
    
    yPos += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    if (branding.nmls_id) {
      pdf.text(`NMLS# ${branding.nmls_id}`, 20, yPos);
      yPos += 4;
    }
    if (branding.address) {
      pdf.text(branding.address, 20, yPos);
      yPos += 4;
    }
    if (branding.phone) {
      pdf.text(branding.phone, 20, yPos);
      yPos += 4;
    }
    
    yPos += 6;
    
    // Document Title
    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text('LOAN TERM SHEET', 105, yPos, { align: 'center' });
    yPos += 4;
    
    // Separator line
    pdf.setDrawColor(200);
    pdf.line(20, yPos, 190, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Deal: ${deal.deal_number || deal_id}`, 20, yPos);
    yPos += 6;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 12;

    // Loan Terms Section
    pdf.setFontSize(12);
    pdf.setTextColor(0);
    pdf.text('LOAN TERMS', 20, yPos);
    yPos += 8;

    const loanTerms = [
      ['Loan Product', deal.loan_product],
      ['Loan Purpose', deal.loan_purpose],
      ['Loan Amount', `$${deal.loan_amount?.toLocaleString() || 'N/A'}`],
      ['Interest Rate', `${deal.interest_rate?.toFixed(3) || 'N/A'}%`],
      ['Loan Term', `${deal.loan_term_months || 'N/A'} months`],
      ['Amortization', deal.amortization_type],
      ['LTV', `${deal.ltv?.toFixed(2) || 'N/A'}%`],
      ['DSCR', `${deal.dscr?.toFixed(2) || 'N/A'}`],
      ['Monthly P&I', `$${deal.monthly_pitia?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || 'N/A'}`]
    ];

    pdf.setFontSize(9);
    loanTerms.forEach(([label, value]) => {
      pdf.text(`${label}:`, 25, yPos);
      pdf.text(value, 100, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 6;

    // Borrower Section
    pdf.setFontSize(12);
    pdf.text('BORROWER(S)', 20, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    borrowers.forEach((b, idx) => {
      const borrowerData = JSON.parse(b.borrower_data_json || '{}');
      pdf.text(`${idx + 1}. ${borrowerData.first_name} ${borrowerData.last_name} (${b.role})`, 25, yPos);
      yPos += 5;
    });

    yPos += 4;

    // Property Section
    if (properties.length > 0) {
      pdf.setFontSize(12);
      pdf.text('PROPERTY(IES)', 20, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      properties.forEach((p, idx) => {
        const propData = JSON.parse(p.property_data_json || '{}');
        pdf.text(
          `${idx + 1}. ${propData.address_street}, ${propData.address_city}, ${propData.address_state} ${propData.address_zip}`,
          25,
          yPos
        );
        pdf.text(`Type: ${propData.property_type}`, 30, yPos + 5);
        pdf.text(`Est. Value: ${propData.estimated_value ? '$' + propData.estimated_value.toLocaleString() : 'N/A'}`, 30, yPos + 10);
        yPos += 15;
      });
    }

    yPos += 4;

    // Fees Summary
    if (fees.length > 0) {
      pdf.setFontSize(12);
      pdf.text('ESTIMATED FEES & COSTS', 20, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      let feeTotal = 0;
      const groupedByCategory = {};

      fees.forEach(fee => {
        const cat = fee.trid_category || 'Other';
        if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
        groupedByCategory[cat].push(fee);
        feeTotal += fee.calculated_amount || 0;
      });

      Object.keys(groupedByCategory).forEach(cat => {
        pdf.text(`Category ${cat}:`, 25, yPos);
        yPos += 5;

        groupedByCategory[cat].forEach(fee => {
          pdf.text(`  ${fee.fee_name}`, 30, yPos);
          pdf.text(`$${fee.calculated_amount?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}`, 150, yPos, { align: 'right' });
          yPos += 4;
        });

        yPos += 2;
      });

      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL ESTIMATED FEES', 25, yPos);
      pdf.text(`$${feeTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 150, yPos, { align: 'right' });
      pdf.setFont(undefined, 'normal');
    }

    yPos += 15;

    // Footer / Disclaimer with branding
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `${branding.company_name} | NMLS# ${branding.nmls_id || 'N/A'} | This Term Sheet is confidential and subject to completion of underwriting and appraisal. Not a binding commitment.`,
      105,
      pdf.internal.pageSize.height - 10,
      { align: 'center', maxWidth: 170 }
    );

    const pdfBuffer = pdf.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=TermSheet_${deal.deal_number || deal_id}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating term sheet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});