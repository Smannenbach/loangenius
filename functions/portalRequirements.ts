import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get document requirements for portal
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
      is_visible_to_borrower: true,
    });

    const documents = await base44.asServiceRole.entities.Document.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
    });

    const groupedByCategory = {};
    requirements.forEach((req) => {
      const category = req.category || 'Other';
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }

      const linkedDocs = documents.filter(
        (doc) => doc.document_requirement_id === req.id
      );

      groupedByCategory[category].push({
        id: req.id,
        display_name: req.display_name,
        document_type: req.document_type,
        instructions: req.instructions,
        status: req.status,
        is_required: req.is_required,
        due_date: req.due_date,
        documents: linkedDocs,
      });
    });

    return Response.json({
      requirements_by_category: groupedByCategory,
      total: requirements.length,
      completed: requirements.filter((r) => r.status === 'approved').length,
    });
  } catch (error) {
    console.error('Portal requirements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});