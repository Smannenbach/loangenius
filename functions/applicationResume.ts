/**
 * Application Resume - Load saved wizard state
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];

    return Response.json({
      success: true,
      wizard_data: deal.wizard_data_json || {},
      current_step: deal.wizard_current_step || 1,
      last_saved: deal.last_autosave_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});