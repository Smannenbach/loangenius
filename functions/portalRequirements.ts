import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dealId = url.pathname.split('/')[3];

    if (!dealId) {
      return Response.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Verify deal exists and borrower has access
    const deal = await base44.entities.Deal.get(dealId);
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get visible requirements
    const requirements = await base44.entities.DealDocumentRequirement.filter({
      deal_id: dealId,
      visible_to_borrower: true
    });

    // Get documents
    const documents = await base44.entities.Document.filter({
      deal_id: dealId
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
        documents: relatedDocs.map(d => ({
          id: d.id,
          name: d.file_name,
          status: d.status,
          created_at: d.created_at
        })),
        reviewer_notes: req.reviewer_notes
      });
    });

    return Response.json({
      deal_id: dealId,
      requirements_by_category: grouped,
      total_count: requirements.length,
      completed_count: requirements.filter(r => r.status === 'approved').length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});