import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get portal requirements for borrower
 */
Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Validate session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get requirements grouped by type
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
      is_visible_to_borrower: true,
    });

    // Get documents for these requirements
    const documents = await base44.asServiceRole.entities.Document.filter({
      org_id: session.org_id,
      deal_id: session.deal_id,
    });

    // Group by document type
    const grouped = {};
    requirements.forEach((req) => {
      const type = req.document_type || 'Other';
      if (!grouped[type]) {
        grouped[type] = [];
      }

      const linkedDocs = documents.filter((doc) => doc.requirement_id === req.id);
      grouped[type].push({
        id: req.id,
        name: req.display_name,
        status: req.status,
        due_date: req.due_date,
        instructions: req.instructions,
        is_required: req.is_required,
        documents: linkedDocs,
      });
    });

    return Response.json({
      requirements_by_category: grouped,
      total_required: requirements.filter((r) => r.is_required).length,
      total_completed: requirements.filter((r) => r.status === 'approved').length,
    });
  } catch (error) {
    console.error('Portal requirements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});