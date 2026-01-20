/**
 * Portal Settings - Get/update portal configuration
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { action, settings } = body;

    if (action === 'get' || !action) {
      const orgSettings = await base44.entities.OrgSettings.filter({ org_id: orgId });
      const portalBranding = await base44.entities.PortalBranding.filter({ org_id: orgId });

      return Response.json({
        settings: orgSettings.length > 0 ? orgSettings[0] : null,
        branding: portalBranding.length > 0 ? portalBranding[0] : null,
      });
    }

    if (action === 'update') {
      const existing = await base44.entities.OrgSettings.filter({ org_id: orgId });
      
      if (existing.length > 0) {
        await base44.entities.OrgSettings.update(existing[0].id, settings);
      } else {
        await base44.entities.OrgSettings.create({ org_id: orgId, ...settings });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});