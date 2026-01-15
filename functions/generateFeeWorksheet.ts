/**
 * Generate Fee Worksheet PDF (Closing Costs breakdown)
 * Groups by TRID category, shows borrower/seller paid splits
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, org_id } = await req.json();

    if (!deal_id || !org_id) {
      return Response.json({ error: 'Missing deal_id or org_id' }, { status: 400 });
    }

    // Fetch deal + fees
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    const fees = await base44.asServiceRole.entities.DealFee.filter({
      deal_id
    });

    // Generate PDF
    const pdf = new jsPDF();
    let yPos = 20;

    // Header
    pdf.setFontSize(18);
    pdf.text('CLOSING COSTS ESTIMATE', 20, yPos);
    yPos += 10;

    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Deal: ${deal.deal_number || deal_id}`, 20, yPos);
    pdf.text(`Prepared: ${new Date().toLocaleDateString()}`, 120, yPos);
    yPos += 10;

    // Loan amount summary
    pdf.setFontSize(10);
    pdf.setTextColor(0);
    pdf.text(`Loan Amount: $${deal.loan_amount?.toLocaleString()}`, 20, yPos);
    yPos += 8;

    // TRID Category Breakdown
    const groupedByCategory = {};
    let totalBorrowerPaid = 0;
    let totalSellerPaid = 0;
    let totalOther = 0;

    fees.forEach(fee => {
      const cat = fee.trid_category || 'Other';
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = { fees: [], total: 0 };
      }
      groupedByCategory[cat].fees.push(fee);
      groupedByCategory[cat].total += fee.calculated_amount || 0;

      if (fee.is_borrower_paid) totalBorrowerPaid += fee.calculated_amount || 0;
      if (fee.is_seller_paid) totalSellerPaid += fee.calculated_amount || 0;
      if (!fee.is_borrower_paid && !fee.is_seller_paid) totalOther += fee.calculated_amount || 0;
    });

    // Category by category detail
    pdf.setFontSize(10);
    yPos += 2;

    const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Other'];

    categories.forEach(cat => {
      if (!groupedByCategory[cat]) return;

      const group = groupedByCategory[cat];

      // Category header
      pdf.setFont(undefined, 'bold');
      pdf.text(`Category ${cat}`, 20, yPos);
      yPos += 6;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      // Fees in category
      group.fees.forEach(fee => {
        const paidBy = fee.is_borrower_paid ? 'Borrower' : fee.is_seller_paid ? 'Seller' : 'Lender';
        pdf.text(`${fee.fee_name}`, 25, yPos);
        pdf.text(paidBy, 100, yPos);
        pdf.text(`$${fee.calculated_amount?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
        yPos += 4;
      });

      // Category subtotal
      pdf.setFont(undefined, 'bold');
      pdf.text(`Subtotal Category ${cat}`, 25, yPos);
      pdf.text(`$${group.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
      yPos += 6;

      pdf.setFont(undefined, 'normal');
    });

    // Summary table
    yPos += 4;
    pdf.setDrawColor(0);
    pdf.rect(20, yPos, 170, 25);

    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    yPos += 6;
    pdf.text('SUMMARY', 20, yPos);
    yPos += 7;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    pdf.text('Borrower Paid:', 25, yPos);
    pdf.text(`$${totalBorrowerPaid.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 5;

    pdf.text('Seller Paid:', 25, yPos);
    pdf.text(`$${totalSellerPaid.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 5;

    pdf.text('Lender/Other:', 25, yPos);
    pdf.text(`$${totalOther.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });
    yPos += 5;

    pdf.setFont(undefined, 'bold');
    pdf.text('TOTAL CLOSING COSTS:', 25, yPos);
    const totalFees = totalBorrowerPaid + totalSellerPaid + totalOther;
    pdf.text(`$${totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 160, yPos, { align: 'right' });

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(
      'Fees and costs are estimates and subject to change during underwriting. This is not a binding commitment.',
      20,
      pdf.internal.pageSize.height - 10,
      { maxWidth: 170 }
    );

    const pdfBuffer = pdf.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FeeWorksheet_${deal.deal_number || deal_id}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating fee worksheet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});