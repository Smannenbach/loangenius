import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get and update portal settings
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get user's org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    if (memberships.length === 0) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }
    const org_id = memberships[0].org_id;

    if (req.method === 'GET' || req.method === 'POST') {
      // Handle POST with no action as GET (for invoke compatibility)
      let body = {};
      if (req.method === 'POST') {
        try {
          body = await req.json();
        } catch {}
      }

      // If action is 'update', handle as PUT
      if (body.action === 'update') {
        const { action, ...updates } = body;
        const existing = await base44.asServiceRole.entities.OrgSettings.filter({ org_id });
        if (existing.length === 0) {
          const created = await base44.asServiceRole.entities.OrgSettings.create({ org_id, ...updates });
          return Response.json(created);
        } else {
          const updated = await base44.asServiceRole.entities.OrgSettings.update(existing[0].id, updates);
          return Response.json(updated);
        }
      }

      // Otherwise treat as GET
      // Get portal settings
      const settings = await base44.asServiceRole.entities.OrgSettings.filter({
        org_id,
      });

      if (settings.length === 0) {
        // Return defaults
        return Response.json({
          org_id,
          portal_enabled: true,
          portal_primary_color: '#2563eb',
          portal_secondary_color: '#1e40af',
          session_timeout_minutes: 240,
          session_max_duration_hours: 24,
          link_expiration_days: 7,
          max_file_size_mb: 25,
          allowed_file_types: 'pdf,doc,docx,jpg,jpeg,png',
          enable_borrower_messaging: true,
          enable_borrower_timeline: true,
          enable_document_notifications: true,
          enable_sms_notifications: true,
        });
      }

      return Response.json(settings[0]);
    }

    if (req.method === 'PUT') {
      const updates = await req.json();

      // Get existing settings
      const existing = await base44.asServiceRole.entities.OrgSettings.filter({
        org_id,
      });

      if (existing.length === 0) {
        // Create new
        const created = await base44.asServiceRole.entities.OrgSettings.create({
          org_id,
          ...updates,
        });
        return Response.json(created);
      } else {
        // Update existing
        const updated = await base44.asServiceRole.entities.OrgSettings.update(
          existing[0].id,
          updates
        );
        return Response.json(updated);
      }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Portal settings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});