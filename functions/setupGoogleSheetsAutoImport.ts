import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Setup auto-import configuration for Google Sheets
 * Can be called manually with spreadsheet_id, or by automation to run import on existing configs
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Allow automation calls without user auth
    const isAutomation = req.headers.get('x-automation') === 'true';
    if (!user && !isAutomation) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let { spreadsheet_id, sheet_name } = body;

    // If no spreadsheet_id provided and this is an automation call,
    // use the configured default spreadsheet from the automation description
    if (!spreadsheet_id && isAutomation) {
      // Default spreadsheet from automation config
      spreadsheet_id = '1bArzqISX3za6l2Vg5LIr6b1nyuYQSVzlZeN-cfOHuoQ';
      sheet_name = sheet_name || 'All Leads';
    }

    if (!spreadsheet_id) {
      return Response.json({ error: 'Missing spreadsheet_id' }, { status: 400 });
    }

    const org_id = user?.org_id || 'default';

    // Check if config already exists
    const existing = await base44.asServiceRole.entities.GoogleSheetsSync.filter({
      spreadsheet_id: spreadsheet_id,
    });

    if (existing.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.GoogleSheetsSync.update(existing[0].id, {
        is_active: true,
        sync_direction: 'import',
        sheet_name: sheet_name || 'All Leads',
      });
    } else {
      // Create new
      await base44.asServiceRole.entities.GoogleSheetsSync.create({
        org_id: org_id,
        spreadsheet_id: spreadsheet_id,
        sheet_name: sheet_name || 'All Leads',
        is_active: true,
        sync_direction: 'import',
      });
    }

    return Response.json({
      success: true,
      message: 'Auto-import enabled',
      spreadsheet_id: spreadsheet_id,
      sheet_name: sheet_name || 'All Leads',
    });
  } catch (error) {
    console.error('Setup auto-import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});