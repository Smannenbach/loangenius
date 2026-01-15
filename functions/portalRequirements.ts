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

    // Get session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Session invalid' }, { status: 401 });
    }

    // Get document requirements for deal
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id: session.deal_id,
      is_visible_to_borrower: true,
    });

    // Group by category
    const grouped = {};
    for (const req of requirements) {
      const cat = req.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: req.id,
        name: req.display_name,
        status: req.status,
        due_date: req.due_date,
        is_required: req.is_required,
      });
    }

    // Update last accessed
    await base44.asServiceRole.entities.PortalSession.update(sessionId, {
      last_accessed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      requirements_by_category: grouped,
    });
  } catch (error) {
    console.error('Portal requirements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});