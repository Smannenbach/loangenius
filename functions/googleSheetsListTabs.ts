/**
 * Google Sheets List Tabs - List available sheets/tabs in a spreadsheet
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  
  // If it looks like a URL
  if (urlOrId.includes('/')) {
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
  
  // Otherwise assume it's already an ID
  return urlOrId;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Resolve org
    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    
    if (!orgData.ok || !orgData.has_org) {
      return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    }

    const body = await req.json();
    const spreadsheetIdOrUrl = body.spreadsheet_id_or_url || body.spreadsheetId;
    
    if (!spreadsheetIdOrUrl) {
      return Response.json({ ok: false, error: 'Missing spreadsheet_id_or_url' }, { status: 400 });
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) {
      return Response.json({ ok: false, error: 'Invalid spreadsheet URL or ID' }, { status: 400 });
    }

    // Get access token from connector
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({
        ok: false,
        needs_reconnect: true,
        status: 'needs_reconnect',
        message: 'Google Sheets not connected. Please authorize Google Sheets in your app settings.',
      });
    }

    if (!accessToken) {
      return Response.json({
        ok: false,
        needs_reconnect: true,
        status: 'needs_reconnect',
        message: 'Google Sheets authorization required. Please connect Google Sheets in app settings.',
      });
    }

    // Fetch spreadsheet metadata
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        return Response.json({
          ok: false,
          needs_reconnect: true,
          status: 'needs_reconnect',
          message: 'Google Sheets access expired. Please reconnect in app settings.',
        });
      }
      return Response.json({
        ok: false,
        error: `Failed to access spreadsheet: ${response.status}`,
      }, { status: response.status });
    }

    const data = await response.json();

    const sheets = (data.sheets || []).map(sheet => ({
      sheetId: sheet.properties.sheetId,
      title: sheet.properties.title,
      index: sheet.properties.index,
    }));

    return Response.json({
      ok: true,
      spreadsheetId: data.spreadsheetId,
      title: data.properties?.title || 'Untitled',
      sheets,
    });
  } catch (error) {
    console.error('googleSheetsListTabs error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});