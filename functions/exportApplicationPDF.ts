import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Fetch deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Fetch related data
    let borrowers = [];
    let properties = [];
    
    try {
      const borrowerLinks = await base44.asServiceRole.entities.DealBorrower.filter({ deal_id });
      for (const link of borrowerLinks) {
        const b = await base44.asServiceRole.entities.Borrower.filter({ id: link.borrower_id });
        if (b.length) borrowers.push({ ...b[0], role: link.role });
      }
    } catch {}
    
    try {
      const propertyLinks = await base44.asServiceRole.entities.DealProperty.filter({ deal_id });
      for (const link of propertyLinks) {
        const p = await base44.asServiceRole.entities.Property.filter({ id: link.property_id });
        if (p.length) properties.push(p[0]);
      }
    } catch {}

    // Create PDF
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('Loan Application Summary', 20, y);
    
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    doc.text(`Deal #: ${deal.deal_number || deal.id}`, 120, y);

    // Loan Details
    y += 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Loan Details', 20, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.text(`Loan Product: ${deal.loan_product || 'N/A'}`, 25, y);
    y += 6;
    doc.text(`Loan Purpose: ${deal.loan_purpose || 'N/A'}`, 25, y);
    y += 6;
    doc.text(`Loan Amount: $${(deal.loan_amount || 0).toLocaleString()}`, 25, y);
    y += 6;
    doc.text(`Interest Rate: ${deal.interest_rate || 0}%`, 25, y);
    y += 6;
    doc.text(`Term: ${(deal.loan_term_months || 360) / 12} years`, 25, y);
    y += 6;
    doc.text(`LTV: ${(deal.ltv || 0).toFixed(2)}%`, 25, y);
    y += 6;
    doc.text(`DSCR: ${(deal.dscr || 0).toFixed(3)}`, 25, y);

    // Borrowers
    y += 12;
    doc.setFontSize(14);
    doc.text(`Borrowers (${borrowers.length})`, 20, y);
    y += 8;
    doc.setFontSize(10);
    
    borrowers.forEach((b, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${b.first_name} ${b.last_name} - ${b.role || 'Borrower'}`, 25, y);
      y += 6;
      if (b.email) {
        doc.text(`   Email: ${b.email}`, 25, y);
        y += 6;
      }
      if (b.cell_phone) {
        doc.text(`   Phone: ${b.cell_phone}`, 25, y);
        y += 6;
      }
    });

    // Properties
    y += 8;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text(`Properties (${properties.length})`, 20, y);
    y += 8;
    doc.setFontSize(10);
    
    properties.forEach((p, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${p.address_street}`, 25, y);
      y += 6;
      doc.text(`   ${p.address_city}, ${p.address_state} ${p.address_zip}`, 25, y);
      y += 6;
      doc.text(`   Type: ${p.property_type}, Occupancy: ${p.occupancy_type}`, 25, y);
      y += 6;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=LoanApp_${deal.deal_number || deal.id}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});