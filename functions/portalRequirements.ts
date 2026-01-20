/**
 * Portal Requirements - Get/manage document requirements for borrower portal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, requirement_id, status } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    if (action === 'list' || !action) {
      const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({ 
        deal_id: deal_id 
      });
      
      return Response.json({
        requirements: requirements.map(r => ({
          id: r.id,
          name: r.requirement_name,
          type: r.requirement_type,
          category: r.category,
          status: r.status,
          is_required: r.is_required,
          instructions: r.instructions,
          rejection_reason: r.rejection_reason,
        })),
      });
    }

    if (action === 'update_status' && requirement_id) {
      await base44.asServiceRole.entities.DealDocumentRequirement.update(requirement_id, {
        status: status,
        completed_at: status === 'accepted' ? new Date().toISOString() : null,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});