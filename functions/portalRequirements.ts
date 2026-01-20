/**
 * Portal Requirements - Get document requirements for borrower
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ ok: false, error: 'Missing deal_id' }, { status: 400 });
    }

    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      deal_id: deal_id,
    });

    const grouped = {
      pending: requirements.filter(r => r.status === 'pending'),
      uploaded: requirements.filter(r => r.status === 'uploaded'),
      accepted: requirements.filter(r => r.status === 'accepted'),
      rejected: requirements.filter(r => r.status === 'rejected'),
    };

    return Response.json({
      ok: true,
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
      summary: {
        total: requirements.length,
        pending: grouped.pending.length,
        uploaded: grouped.uploaded.length,
        accepted: grouped.accepted.length,
        rejected: grouped.rejected.length,
      },
    });
  } catch (error) {
    console.error('portalRequirements error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});