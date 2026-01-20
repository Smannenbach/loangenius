/**
 * Export Application as PDF
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal data
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Get borrowers
    const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id: deal_id });
    const borrowers = [];
    for (const db of dealBorrowers) {
      const b = await base44.entities.Borrower.filter({ id: db.borrower_id });
      if (b.length > 0) borrowers.push(b[0]);
    }

    // Generate PDF
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Loan Application', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Deal Number: ${deal.deal_number || deal.id}`, 20, 35);
    doc.text(`Loan Product: ${deal.loan_product}`, 20, 45);
    doc.text(`Loan Amount: $${deal.loan_amount?.toLocaleString()}`, 20, 55);
    
    if (borrowers.length > 0) {
      doc.text('Borrower:', 20, 70);
      doc.text(`${borrowers[0].first_name} ${borrowers[0].last_name}`, 20, 80);
      doc.text(`Email: ${borrowers[0].email}`, 20, 90);
    }

    doc.text(`Stage: ${deal.stage}`, 20, 105);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 115);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=application_${deal.deal_number}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});