import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get pending reminders for portal display
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

    // Get outstanding document requirements
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id: session.deal_id,
      status: { $in: ['pending', 'requested'] },
    });

    // Sort by due date
    const sortedReqs = requirements.sort((a, b) => {
      const aDate = new Date(a.due_date || '9999-12-31');
      const bDate = new Date(b.due_date || '9999-12-31');
      return aDate - bDate;
    });

    // Determine urgency
    const reminders = sortedReqs.map(r => {
      const dueDate = new Date(r.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      let urgency = 'low';
      if (daysUntilDue <= 0) urgency = 'critical';
      else if (daysUntilDue <= 2) urgency = 'high';
      else if (daysUntilDue <= 5) urgency = 'medium';

      return {
        id: r.id,
        name: r.display_name,
        status: r.status,
        due_date: r.due_date,
        days_until_due: daysUntilDue,
        urgency,
        instructions: r.instructions,
        is_required: r.is_required,
      };
    });

    // Update last accessed
    await base44.asServiceRole.entities.PortalSession.update(sessionId, {
      last_accessed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      reminders,
      total_pending: reminders.length,
      critical_count: reminders.filter(r => r.urgency === 'critical').length,
    });
  } catch (error) {
    console.error('Portal reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});