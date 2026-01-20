/**
 * Verify Lead Contact - Verify email/phone for a lead
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { lead_id, field, value } = body;

    if (!lead_id || !field) {
      return Response.json({ error: 'Missing lead_id or field' }, { status: 400 });
    }

    // Get lead
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Mark as verified
    const updateField = `${field}_verified`;
    await base44.entities.Lead.update(lead_id, {
      [updateField]: true,
    });

    return Response.json({
      success: true,
      field: field,
      verified: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});