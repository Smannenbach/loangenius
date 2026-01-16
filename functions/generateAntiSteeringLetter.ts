/**
 * Generate Anti-Steering Compliance Letter
 * Required for RESPA/TILA compliance when providing loan estimates
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

    const { deal_id, org_id: provided_org_id, lender_name = 'LoanGenius' } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Fetch deal + borrower
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    const borrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id,
      role: 'primary'
    });

    const borrower = borrowers.length > 0 ? borrowers[0] : null;

    // Generate PDF
    const pdf = new jsPDF();
    let yPos = 20;

    // Header
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('ANTI-STEERING LETTER', 20, yPos);
    yPos += 12;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    pdf.text(`Deal Number: ${deal.deal_number || deal_id}`, 20, yPos);
    yPos += 6;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 12;

    // Salutation
    pdf.setFontSize(10);
    if (borrower) {
      const borrowerData = JSON.parse(borrower.borrower_data_json || '{}');
      pdf.text(`Dear ${borrowerData.first_name} ${borrowerData.last_name},`, 20, yPos);
    } else {
      pdf.text('Dear Borrower,', 20, yPos);
    }
    yPos += 10;

    // Body text
    const bodyText = `This letter is provided to you as required by the Real Estate Settlement Procedures Act (RESPA) and the Truth in Lending Act (TILA). ${lender_name} is providing you with loan estimates and may present you with various loan programs with different terms and rates.

You have the right to shop for the best loan terms available to you. We do not steer or discourage you from applying for any particular loan program based on your protected class characteristics (race, color, national origin, religion, sex, familial status, disability, or sexual orientation), income level, or other prohibited factors.

All loan programs that we offer are available to all qualified applicants regardless of protected class. Our pricing and terms are based solely on legitimate, non-discriminatory factors including:
• Credit profile and credit score
• Loan-to-value ratio
• Debt-to-income ratio  
• Property type and location
• Loan amount and term
• Down payment amount
• Compensating factors and unique circumstances

You are entitled to shop for your own appraisal, title insurance, and other third-party services, and we cannot condition the extension of credit on your use of any particular provider.

If you believe you have been treated unfairly or discriminated against, you may file a complaint with the Consumer Financial Protection Bureau (CFPB) at www.consumerfinance.gov or by calling 1-855-500-2CFPB (2327).

We look forward to working with you to find a loan program that meets your financial needs and goals.`;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(bodyText, 170);
    lines.forEach(line => {
      pdf.text(line, 20, yPos);
      yPos += 5;
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
    });

    yPos += 10;

    // Signature block
    pdf.setFontSize(10);
    pdf.text('Sincerely,', 20, yPos);
    yPos += 15;

    pdf.text('_________________________', 20, yPos);
    yPos += 5;
    pdf.setFontSize(9);
    pdf.text(`${user.full_name}`, 20, yPos);
    yPos += 4;
    pdf.text('Loan Officer', 20, yPos);
    yPos += 4;
    pdf.text(lender_name, 20, yPos);

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(
      'This letter does not constitute an offer, commitment, or pre-approval for credit. All applications are subject to verification and underwriting.',
      20,
      pdf.internal.pageSize.height - 10,
      { maxWidth: 170 }
    );

    const pdfBuffer = pdf.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=AntiSteeringLetter_${deal.deal_number || deal_id}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating anti-steering letter:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});