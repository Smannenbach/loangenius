/**
 * AI-Powered Loan Document Generator
 * Generates loan documents (disclosures, commitment letters, etc.) based on deal data
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { deal_id, document_type, custom_instructions } = await req.json();

    if (!deal_id || !document_type) {
      return Response.json({ error: 'Missing deal_id or document_type' }, { status: 400 });
    }

    // Fetch deal data
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    const deal = deals[0];
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Fetch related data
    const [borrowers, properties] = await Promise.all([
      base44.entities.Borrower.filter({ deal_id }).catch(() => []),
      base44.entities.Property.filter({ deal_id }).catch(() => []),
    ]);

    const primaryBorrower = borrowers.find(b => b.is_primary) || borrowers[0];
    const subjectProperty = properties.find(p => p.is_subject_property) || properties[0];

    // Document templates by type
    const documentPrompts = {
      initial_disclosure: `Generate an Initial Disclosure document for a ${deal.loan_product || 'DSCR'} loan with the following details:
- Borrower: ${primaryBorrower?.first_name || 'N/A'} ${primaryBorrower?.last_name || ''}
- Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
- Interest Rate: ${deal.interest_rate || 'N/A'}%
- Loan Term: ${deal.loan_term_months || 360} months
- Property: ${subjectProperty?.street_address || 'N/A'}, ${subjectProperty?.city || ''} ${subjectProperty?.state || ''}
Include standard TILA disclosures, APR calculation, and payment schedule.`,

      commitment_letter: `Generate a Loan Commitment Letter for a ${deal.loan_product || 'DSCR'} loan:
- Borrower: ${primaryBorrower?.first_name || 'N/A'} ${primaryBorrower?.last_name || ''}
- Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
- Interest Rate: ${deal.interest_rate || 'N/A'}%
- Property: ${subjectProperty?.street_address || 'N/A'}
- LTV: ${deal.ltv || 'N/A'}%
- DSCR: ${deal.dscr || 'N/A'}
Include standard conditions for funding, expiration date (30 days), and required documentation.`,

      pre_approval: `Generate a Pre-Approval Letter for:
- Borrower: ${primaryBorrower?.first_name || 'N/A'} ${primaryBorrower?.last_name || ''}
- Maximum Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
- Loan Type: ${deal.loan_product || 'DSCR'}
Include standard pre-approval language and conditions.`,

      term_sheet: `Generate a Term Sheet for a ${deal.loan_product || 'DSCR'} loan:
- Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
- Interest Rate: ${deal.interest_rate || 'N/A'}%
- Loan Term: ${deal.loan_term_months || 360} months
- Amortization: ${deal.amortization_type || 'Fixed'}
- LTV: ${deal.ltv || 'N/A'}%
- DSCR: ${deal.dscr || 'N/A'}
- Prepayment Penalty: ${deal.prepay_penalty_type || 'N/A'}
- Estimated Closing Costs: ${deal.closing_costs_estimate || 'TBD'}
Include all standard terms and conditions.`,

      loan_estimate: `Generate a Loan Estimate (LE) document for:
- Borrower: ${primaryBorrower?.first_name || 'N/A'} ${primaryBorrower?.last_name || ''}
- Property: ${subjectProperty?.street_address || 'N/A'}
- Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
- Interest Rate: ${deal.interest_rate || 'N/A'}%
- Loan Purpose: ${deal.loan_purpose || 'Purchase'}
Include estimated closing costs, cash to close, and projected payments.`,

      rate_lock_confirmation: `Generate a Rate Lock Confirmation for:
- Borrower: ${primaryBorrower?.first_name || 'N/A'} ${primaryBorrower?.last_name || ''}
- Locked Rate: ${deal.interest_rate || 'N/A'}%
- Lock Period: 30 days
- Loan Amount: $${deal.loan_amount?.toLocaleString() || 'N/A'}
Include rate lock terms, expiration date, and extension policy.`,
    };

    const basePrompt = documentPrompts[document_type] || 
      `Generate a ${document_type} document for loan deal with amount $${deal.loan_amount?.toLocaleString()}.`;

    const fullPrompt = custom_instructions 
      ? `${basePrompt}\n\nAdditional instructions: ${custom_instructions}`
      : basePrompt;

    // Generate document using AI
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${fullPrompt}

Format the document in professional HTML with proper headings, sections, and styling. Include today's date: ${new Date().toLocaleDateString()}.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string', description: 'HTML formatted document content' },
          summary: { type: 'string' },
          missing_data: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'List of fields that were missing or marked N/A'
          },
        },
      },
    });

    // Save generated document
    const savedDoc = await base44.entities.GeneratedDocument.create({
      org_id: deal.org_id,
      deal_id: deal_id,
      document_type: document_type,
      title: response.title || `${document_type.replace(/_/g, ' ')} - ${deal.deal_number || deal_id.slice(0, 8)}`,
      content: response.content,
      data_snapshot: {
        deal: { id: deal.id, loan_amount: deal.loan_amount, interest_rate: deal.interest_rate },
        borrower: primaryBorrower ? { name: `${primaryBorrower.first_name} ${primaryBorrower.last_name}` } : null,
        property: subjectProperty?.street_address || null,
        generated_at: new Date().toISOString(),
      },
      status: 'draft',
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      deal_id: deal_id,
      user_id: user.email,
      action_type: 'document_generated',
      details: { document_type, document_id: savedDoc.id },
    }).catch(() => {});

    return Response.json({
      success: true,
      document: savedDoc,
      missing_data: response.missing_data || [],
      summary: response.summary,
    });

  } catch (error) {
    console.error('Document generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});