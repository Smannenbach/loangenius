/**
 * Google Sheets Sync Helper
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
    const { action, spreadsheet_id } = body;

    // Check if Google Sheets connector authorized
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    if (!accessToken) {
      return Response.json({
        success: false,
        connected: false,
        message: 'Google Sheets not connected',
      });
    }

    if (action === 'status') {
      // Get sync config
      const syncs = await base44.entities.GoogleSheetsSync.filter({ org_id: orgId });
      
      return Response.json({
        success: true,
        connected: true,
        syncs: syncs.map(s => ({
          id: s.id,
          spreadsheet_id: s.spreadsheet_id,
          sheet_name: s.sheet_name,
          status: s.status,
          last_sync_at: s.last_sync_at,
        })),
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});