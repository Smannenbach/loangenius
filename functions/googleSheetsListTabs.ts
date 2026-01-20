/**
 * Google Sheets - List Tabs
 * Input: { spreadsheet_id_or_url }
 * Output: { spreadsheetId, sheets:[{ title, sheetId }], ok }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Inline helpers to avoid import issues
async function sheetsRequest(accessToken, endpoint) {
  const baseUrl = 'https://sheets.googleapis.com/v4';
  const url = `${baseUrl}${endpoint}`;
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'Google Sheets authorization expired. Please reconnect.', needs_reconnect: true };
    }
    
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }
    
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `API error: ${text}` };
    }
    
    return { ok: true, data: await response.json() };
  }
  return { ok: false, error: 'Rate limited - please try again' };
}

function parseSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && !urlOrId.includes('/')) return urlOrId;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check role - admin or loan officer can import
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ ok: false, error: 'No organization membership' }, { status: 403 });
    }
    
    const role = memberships[0].role_id || 'user';
    if (!['admin', 'owner', 'manager', 'loan_officer'].includes(role) && user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Import requires admin or loan officer role' }, { status: 403 });
    }
    
    const body = await req.json();
    const { spreadsheet_id_or_url } = body;
    
    if (!spreadsheet_id_or_url) {
      return Response.json({ ok: false, error: 'Missing spreadsheet_id_or_url' }, { status: 400 });
    }
    
    const spreadsheetId = parseSpreadsheetId(spreadsheet_id_or_url);
    if (!spreadsheetId) {
      return Response.json({ ok: false, error: 'Invalid spreadsheet URL or ID' }, { status: 400 });
    }
    
    // Get access token
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({ 
        ok: false, 
        error: 'Google Sheets not connected. Please authorize in Admin → Integrations.',
        needs_reconnect: true 
      }, { status: 403 });
    }
    
    if (!accessToken) {
      return Response.json({ 
        ok: false, 
        error: 'Google Sheets authorization missing.',
        needs_reconnect: true 
      }, { status: 403 });
    }
    
    // Fetch spreadsheet metadata
    const result = await sheetsRequest(
      accessToken,
      `/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`
    );
    
    if (!result.ok) {
      return Response.json({ ok: false, ...result }, { status: result.needs_reconnect ? 403 : 400 });
    }
    
    return Response.json({
      ok: true,
      spreadsheetId: result.data.spreadsheetId,
      title: result.data.properties?.title,
      sheets: (result.data.sheets || []).map(s => ({
        sheetId: s.properties.sheetId,
        title: s.properties.title,
        index: s.properties.index,
      })),
    });
    
  } catch (error) {
    console.error('[googleSheetsListTabs] Error:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});