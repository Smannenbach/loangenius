import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dealId = url.pathname.split('/')[3];

    if (!dealId) {
      return Response.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Get deal
    const deal = await base44.asServiceRole.entities.Deal.get(dealId);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get visible requirements
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id: dealId,
      visible_to_borrower: true
    });

    // Get documents
    const documents = await base44.asServiceRole.entities.Document.filter({
      deal_id: dealId
    });

    // Get messages
    const messages = await base44.asServiceRole.entities.Communication.filter({
      deal_id: dealId,
      channel: 'Portal_Message'
    });

    // Group requirements by category
    const grouped = {};
    requirements.forEach(req => {
      if (!grouped[req.category]) {
        grouped[req.category] = [];
      }
      
      const relatedDocs = documents.filter(d => d.document_requirement_id === req.id);
      
      grouped[req.category].push({
        id: req.id,
        name: req.name,
        category: req.category,
        status: req.status,
        due_at: req.due_at,
        instructions: req.instructions_text,
        snoozed_until: req.snoozed_until,
        requested_at: req.requested_at,
        last_reminded_at: req.last_reminded_at,
        documents: relatedDocs.map(d => ({
          id: d.id,
          name: d.file_name,
          status: d.status,
          created_at: d.created_at,
          reviewer_notes: d.metadata_json?.reviewer_notes
        })),
        reviewer_notes: req.reviewer_notes
      });
    });

    // Internal controls available
    const internalControls = {
      can_request_docs: true,
      can_approve_docs: true,
      can_reject_docs: true,
      can_snooze_requirements: true,
      can_send_reminder: true,
      can_waive_requirement: true
    };

    return Response.json({
      // Borrower-visible payload (exact same structure)
      borrower_view: {
        deal_id: dealId,
        requirements_by_category: grouped,
        total_count: requirements.length,
        completed_count: requirements.filter(r => r.status === 'approved').length,
        messages: messages.map(m => ({
          id: m.id,
          direction: m.direction,
          from: m.from_address,
          to: m.to_address,
          body: m.body,
          created_at: m.created_at,
          status: m.status
        }))
      },
      // Internal metadata + controls
      internal_view: {
        internalControls,
        deal_summary: {
          loan_product: deal.loan_product,
          loan_purpose: deal.loan_purpose,
          status: deal.status,
          loan_amount: deal.loan_amount,
          created_at: deal.created_at
        },
        all_requirements: requirements.map(r => ({
          id: r.id,
          status: r.status,
          responsibility: r.responsibility,
          snoozed_until: r.snoozed_until
        }))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});