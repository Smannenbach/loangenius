/**
 * Generate rule-based document requirements for a deal
 * Creates Document entities based on loan product/purpose and borrower composition
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Fetch deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (!deals.length) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    // Fetch borrowers for this deal
    const dealBorrowers = await base44.asServiceRole.entities.DealBorrower.filter({
      deal_id: deal_id
    });

    // Fetch borrower details
    const borrowers = await Promise.all(
      dealBorrowers.map(db => base44.asServiceRole.entities.Borrower.filter({ id: db.borrower_id }))
    );

    const hasEntityBorrower = borrowers.some(b => b.length && b[0].borrower_type === 'entity');
    const isRefinance = deal.loan_purpose?.toLowerCase().includes('refinance') || false;

    // Get document requirements for this product/purpose
    const baseRequirements = await base44.asServiceRole.entities.DocumentRequirement.filter({
      org_id,
      loan_product: deal.loan_product,
      is_active: true
    });

    const relevantRequirements = baseRequirements.filter(req => {
      // Check if purpose matches
      if (req.loan_purpose && req.loan_purpose !== deal.loan_purpose) {
        return false;
      }

      // Check conditional rules
      if (req.condition_rule === 'entity_borrower' && !hasEntityBorrower) {
        return false;
      }
      if (req.condition_rule === 'refinance_only' && !isRefinance) {
        return false;
      }

      return req.is_required || req.condition_rule;
    });

    // Create Document records for each requirement
    const createdDocs = [];
    for (const req of relevantRequirements) {
      // Check if document already exists
      const existing = await base44.asServiceRole.entities.Document.filter({
        deal_id,
        document_type: req.document_type
      });

      if (!existing.length) {
        const doc = await base44.asServiceRole.entities.Document.create({
          org_id,
          deal_id,
          document_type: req.document_type,
          source: 'requirement',
          status: 'uploaded',
          expires_at: req.expiration_days 
            ? new Date(Date.now() + req.expiration_days * 86400000).toISOString()
            : null
        });

        createdDocs.push({
          id: doc.id,
          document_type: req.document_type,
          status: 'uploaded',
          expires_at: doc.expires_at
        });
      }
    }

    // Create corresponding Condition records
    const createdConditions = [];
    for (const req of relevantRequirements) {
      // Check if condition exists
      const existing = await base44.asServiceRole.entities.Condition.filter({
        deal_id,
        title: req.document_type
      });

      if (!existing.length) {
        const condition = await base44.asServiceRole.entities.Condition.create({
          org_id,
          deal_id,
          title: req.document_type,
          description: `Provide ${req.document_type.replace(/_/g, ' ')}`,
          condition_type: 'PTD',
          status: 'pending',
          due_at: req.expiration_days
            ? new Date(Date.now() + req.expiration_days * 86400000).toISOString()
            : null
        });

        createdConditions.push({
          id: condition.id,
          title: condition.title,
          status: condition.status,
          due_at: condition.due_at
        });
      }
    }

    return Response.json({
      success: true,
      deal_id,
      documents_created: createdDocs.length,
      documents: createdDocs,
      conditions_created: createdConditions.length,
      conditions: createdConditions
    });
  } catch (error) {
    console.error('Error generating document requirements:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});