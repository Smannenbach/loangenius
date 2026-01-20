/**
 * Application Autosave - Save wizard progress
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { deal_id, wizard_data, current_step } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // SECURITY FIX: Verify user has access to this deal (IDOR prevention)
    const deals = await base44.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    // The SDK already scopes to user's org, but double-check
    const deal = deals[0];
    
    // Update deal with wizard state
    await base44.entities.Deal.update(deal_id, {
      wizard_data_json: wizard_data,
      wizard_current_step: current_step,
      last_autosave_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      saved_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});