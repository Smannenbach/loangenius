import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Setup auto-import configuration for Google Sheets
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheet_id, sheet_name } = await req.json();

    if (!spreadsheet_id) {
      return Response.json({ error: 'Missing spreadsheet_id' }, { status: 400 });
    }

    // Check if config already exists
    const existing = await base44.entities.GoogleSheetsSync.filter({
      org_id: user.org_id,
      spreadsheet_id: spreadsheet_id,
    });

    if (existing.length > 0) {
      // Update existing
      await base44.entities.GoogleSheetsSync.update(existing[0].id, {
        is_active: true,
        sync_direction: 'import',
        sheet_name: sheet_name || 'Leads',
      });
    } else {
      // Create new
      await base44.entities.GoogleSheetsSync.create({
        org_id: user.org_id,
        spreadsheet_id: spreadsheet_id,
        sheet_name: sheet_name || 'Leads',
        is_active: true,
        sync_direction: 'import',
      });
    }

    return Response.json({
      success: true,
      message: 'Auto-import enabled',
      spreadsheet_id: spreadsheet_id,
    });
  } catch (error) {
    console.error('Setup auto-import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});