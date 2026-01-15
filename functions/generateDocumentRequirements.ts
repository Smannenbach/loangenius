import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate document requirements for a new deal
 * Based on loan product, loan purpose, and borrower type
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'Deal ID required' }, { status: 400 });
    }

    // Get deal
    const deal = await base44.asServiceRole.entities.Deal.get(deal_id);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Standard DSCR document checklist
    const standardRequirements = [
      {
        document_type: 'bank_statements',
        display_name: 'Bank Statements (Last 2 months)',
        category: 'Assets',
        instructions: 'Download or scan your bank statements showing your business bank account.',
        is_required: true,
        days_until_due: 5,
      },
      {
        document_type: 'tax_returns',
        display_name: 'Tax Returns (Last 2 years)',
        category: 'Income',
        instructions: 'Provide completed business tax returns (1040s, Schedule C, or corporate returns).',
        is_required: true,
        days_until_due: 5,
      },
      {
        document_type: 'profit_loss',
        display_name: 'Profit & Loss Statement (Last 12 months)',
        category: 'Income',
        instructions: 'Business P&L statement signed by CPA or accountant.',
        is_required: true,
        days_until_due: 5,
      },
      {
        document_type: 'lease_agreements',
        display_name: 'Lease Agreements',
        category: 'Property',
        instructions: 'All signed lease agreements for the subject property.',
        is_required: true,
        days_until_due: 7,
      },
      {
        document_type: 'appraisal',
        display_name: 'Property Appraisal',
        category: 'Property',
        instructions: 'Recent appraisal report (within 6 months).',
        is_required: true,
        days_until_due: 10,
      },
      {
        document_type: 'title_report',
        display_name: 'Title Report',
        category: 'Property',
        instructions: 'Preliminary title report for the property.',
        is_required: true,
        days_until_due: 10,
      },
      {
        document_type: 'id_verification',
        display_name: 'ID Verification',
        category: 'Identity',
        instructions: 'Copy of driver\'s license or passport.',
        is_required: true,
        days_until_due: 3,
      },
      {
        document_type: 'proof_of_funds',
        display_name: 'Proof of Funds',
        category: 'Assets',
        instructions: 'Bank statements showing down payment funds available.',
        is_required: true,
        days_until_due: 5,
      },
    ];

    // Create document requirements
    const createdRequirements = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // Default 14 days from now

    for (const req of standardRequirements) {
      const created = await base44.asServiceRole.entities.DealDocumentRequirement.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        requirement_template_id: null,
        document_type: req.document_type,
        display_name: req.display_name,
        instructions: req.instructions,
        category: req.category,
        status: 'pending',
        is_required: req.is_required,
        is_visible_to_borrower: true,
        due_date: dueDate.toISOString(),
      });
      createdRequirements.push(created);
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: deal.org_id,
      deal_id: deal_id,
      activity_type: 'DEAL_CREATED',
      description: `Generated ${createdRequirements.length} document requirements for ${deal.deal_number}`,
      source: 'system',
    });

    return Response.json({
      success: true,
      requirements_created: createdRequirements.length,
      requirements: createdRequirements.map(r => ({
        id: r.id,
        document_type: r.document_type,
        display_name: r.display_name,
      })),
    });
  } catch (error) {
    console.error('Generate requirements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});