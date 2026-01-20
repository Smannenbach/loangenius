import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, sections = [] } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'deal_id required' }, { status: 400 });
    }

    // Fetch deal data
    const deals = await base44.entities.Deal.list();
    const deal = deals.find(d => d.id === deal_id);
    
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch related data
    const [borrowers, properties, fees, documents, conditions] = await Promise.all([
      base44.entities.Borrower.filter({ deal_id }).catch(() => []),
      base44.entities.Property.filter({ deal_id }).catch(() => []),
      base44.entities.DealFee.filter({ deal_id }).catch(() => []),
      base44.entities.Document.filter({ deal_id }).catch(() => []),
      base44.entities.Condition.filter({ deal_id }).catch(() => []),
    ]);

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Loan Summary', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Deal: ${deal.deal_number || deal.id.slice(0, 8)}`, 20, y);
    y += 6;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 15;

    // Summary section
    if (sections.includes('summary')) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Loan Details', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.text(`Product: ${deal.loan_product || '-'}`, 20, y);
      y += 6;
      doc.text(`Purpose: ${deal.loan_purpose || '-'}`, 20, y);
      y += 6;
      doc.text(`Amount: $${(deal.loan_amount || 0).toLocaleString()}`, 20, y);
      y += 6;
      doc.text(`Rate: ${deal.interest_rate || '-'}%`, 20, y);
      y += 6;
      doc.text(`Term: ${deal.loan_term_months ? `${deal.loan_term_months / 12} years` : '-'}`, 20, y);
      y += 12;
    }

    // Borrowers section
    if (sections.includes('borrowers') && borrowers.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Borrowers', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      borrowers.forEach(b => {
        doc.text(`${b.first_name || ''} ${b.last_name || b.entity_name || 'Unknown'}`, 20, y);
        y += 6;
        if (b.email) {
          doc.text(`Email: ${b.email}`, 25, y);
          y += 6;
        }
      });
      y += 10;
    }

    // Property section
    if (sections.includes('property') && properties.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      const property = properties[0];
      doc.setFontSize(14);
      doc.text('Property', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.text(property.address_street || '-', 20, y);
      y += 6;
      doc.text(`${property.address_city || ''}, ${property.address_state || ''} ${property.address_zip || ''}`, 20, y);
      y += 6;
      doc.text(`Type: ${property.property_type || '-'}`, 20, y);
      y += 12;
    }

    // Fees section
    if (sections.includes('fees') && fees.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Fees', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      fees.forEach(fee => {
        doc.text(`${fee.fee_name || fee.fee_type}: $${(fee.amount || 0).toLocaleString()}`, 20, y);
        y += 6;
      });
      
      const totalFees = fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      y += 4;
      doc.setFont(undefined, 'bold');
      doc.text(`Total: $${totalFees.toLocaleString()}`, 20, y);
      doc.setFont(undefined, 'normal');
      y += 12;
    }

    // Documents section
    if (sections.includes('documents') && documents.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Documents', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      documents.forEach(d => {
        doc.text(`${d.name || d.document_type} - ${d.status || 'pending'}`, 20, y);
        y += 6;
      });
    }

    // Generate blob
    const pdfBytes = doc.output('arraybuffer');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Upload to storage
    const file = new File([blob], `deal-summary-${deal.deal_number || deal_id}.pdf`, { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({
      success: true,
      pdf_url: uploadResult.file_url,
      filename: `deal-summary-${deal.deal_number || deal_id}.pdf`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});