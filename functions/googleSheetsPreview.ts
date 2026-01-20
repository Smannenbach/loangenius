/**
 * Google Sheets - Preview Data
 * Input: { spreadsheetId, sheetTitle, headerRow=1, sampleRows=25 }
 * Output: { headers:[], rows:[[]], ok }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Inline helpers
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

// Lead fields for auto-mapping
const LEAD_FIELDS = [
  { value: 'first_name', label: 'First Name', aliases: ['first name', 'firstname', 'first', 'fname'] },
  { value: 'last_name', label: 'Last Name', aliases: ['last name', 'lastname', 'last', 'lname', 'surname'] },
  { value: 'home_email', label: 'Email', aliases: ['email', 'home email', 'personal email', 'e-mail'] },
  { value: 'work_email', label: 'Work Email', aliases: ['work email', 'business email'] },
  { value: 'mobile_phone', label: 'Mobile Phone', aliases: ['phone', 'mobile', 'cell', 'mobile phone', 'cell phone'] },
  { value: 'home_phone', label: 'Home Phone', aliases: ['home phone', 'landline'] },
  { value: 'work_phone', label: 'Work Phone', aliases: ['work phone', 'office phone', 'business phone'] },
  { value: 'property_street', label: 'Property Address', aliases: ['address', 'street', 'property address', 'property street'] },
  { value: 'property_city', label: 'City', aliases: ['city'] },
  { value: 'property_state', label: 'State', aliases: ['state'] },
  { value: 'property_zip', label: 'ZIP Code', aliases: ['zip', 'zipcode', 'zip code', 'postal'] },
  { value: 'property_county', label: 'County', aliases: ['county'] },
  { value: 'estimated_value', label: 'Property Value', aliases: ['value', 'property value', 'estimated value', 'home value'] },
  { value: 'loan_amount', label: 'Loan Amount', aliases: ['loan amount', 'loan', 'amount'] },
  { value: 'loan_type', label: 'Loan Type', aliases: ['loan type', 'type'] },
  { value: 'loan_purpose', label: 'Loan Purpose', aliases: ['loan purpose', 'purpose'] },
  { value: 'fico_score', label: 'Credit Score', aliases: ['fico', 'credit score', 'fico score', 'credit'] },
  { value: 'current_rate', label: 'Current Rate', aliases: ['current rate', 'rate', 'interest rate'] },
  { value: 'current_balance', label: 'Current Balance', aliases: ['current balance', 'balance', 'mortgage balance'] },
  { value: 'source', label: 'Lead Source', aliases: ['source', 'lead source'] },
  { value: 'status', label: 'Status', aliases: ['status'] },
  { value: 'notes', label: 'Notes', aliases: ['notes', 'comments'] },
  { value: 'platform', label: 'Platform', aliases: ['platform', 'ad platform'] },
  { value: 'fb_campaign_name', label: 'FB Campaign', aliases: ['campaign', 'fb campaign', 'facebook campaign'] },
];

function autoMapHeaders(headers) {
  const mapping = {};
  
  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const field of LEAD_FIELDS) {
      if (field.aliases.some(alias => normalizedHeader === alias || normalizedHeader.includes(alias))) {
        mapping[header] = field.value;
        break;
      }
    }
  }
  
  return mapping;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check role
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ ok: false, error: 'No organization membership' }, { status: 403 });
    }
    
    const role = memberships[0].role_id || 'user';
    if (!['admin', 'owner', 'manager', 'loan_officer'].includes(role) && user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Import requires admin or loan officer role' }, { status: 403 });
    }
    
    const body = await req.json();
    const { spreadsheetId, sheetTitle, headerRow = 1, sampleRows = 25 } = body;
    
    if (!spreadsheetId || !sheetTitle) {
      return Response.json({ ok: false, error: 'Missing spreadsheetId or sheetTitle' }, { status: 400 });
    }
    
    // Get access token
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({ 
        ok: false, 
        error: 'Google Sheets not connected.',
        needs_reconnect: true 
      }, { status: 403 });
    }
    
    // Use batchGet to fetch header and sample rows in ONE request
    const headerRange = `'${sheetTitle}'!${headerRow}:${headerRow}`;
    const dataStartRow = headerRow + 1;
    const dataEndRow = headerRow + sampleRows;
    const dataRange = `'${sheetTitle}'!${dataStartRow}:${dataEndRow}`;
    
    const result = await sheetsRequest(
      accessToken,
      `/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${encodeURIComponent(headerRange)}&ranges=${encodeURIComponent(dataRange)}`
    );
    
    if (!result.ok) {
      return Response.json({ ok: false, ...result }, { status: result.needs_reconnect ? 403 : 400 });
    }
    
    const valueRanges = result.data.valueRanges || [];
    const headers = valueRanges[0]?.values?.[0] || [];
    const rawRows = valueRanges[1]?.values || [];
    
    // Convert rows to objects keyed by header
    const rows = rawRows.map((row, idx) => {
      const obj = { _rowIndex: dataStartRow + idx };
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });
    
    // Auto-map headers
    const suggestedMapping = autoMapHeaders(headers);
    
    return Response.json({
      ok: true,
      headers,
      rows,
      totalRows: rawRows.length,
      suggestedMapping,
      leadFields: LEAD_FIELDS.map(f => ({ value: f.value, label: f.label })),
    });
    
  } catch (error) {
    console.error('[googleSheetsPreview] Error:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});