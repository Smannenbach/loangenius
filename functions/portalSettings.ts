/**
 * Portal Settings - Get/update borrower portal settings
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    if (!orgData.ok) return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    const orgId = orgData.org_id;

    // Only admin can update settings
    if (!['admin', 'owner'].includes(orgData.membership_role)) {
      return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'get' } = body;

    if (action === 'get') {
      const settings = await base44.asServiceRole.entities.OrgSettings.filter({ org_id: orgId });
      const setting = settings.length > 0 ? settings[0] : null;

      return Response.json({
        ok: true,
        settings: {
          company_name: setting?.company_name,
          logo_url: setting?.logo_url,
          portal_enabled: setting?.portal_enabled !== false,
          primary_color: setting?.primary_color || '#2563eb',
        },
      });
    }

    if (action === 'update') {
      const { settings: newSettings } = body;
      
      const existing = await base44.asServiceRole.entities.OrgSettings.filter({ org_id: orgId });
      
      if (existing.length > 0) {
        await base44.asServiceRole.entities.OrgSettings.update(existing[0].id, newSettings);
      } else {
        await base44.asServiceRole.entities.OrgSettings.create({
          org_id: orgId,
          ...newSettings,
        });
      }

      return Response.json({ ok: true, message: 'Settings updated' });
    }

    return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('portalSettings error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});