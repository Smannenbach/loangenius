/**
 * Google Sheets Preview - Get headers and sample rows from a sheet
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LEAD_FIELDS = [
  { value: 'first_name', label: 'First Name', aliases: ['first', 'fname', 'firstname'] },
  { value: 'last_name', label: 'Last Name', aliases: ['last', 'lname', 'lastname'] },
  { value: 'home_email', label: 'Email', aliases: ['email', 'e-mail', 'mail'] },
  { value: 'mobile_phone', label: 'Phone', aliases: ['phone', 'mobile', 'cell', 'telephone'] },
  { value: 'property_street', label: 'Property Address', aliases: ['address', 'street', 'property address'] },
  { value: 'property_city', label: 'City', aliases: ['city'] },
  { value: 'property_state', label: 'State', aliases: ['state'] },
  { value: 'property_zip', label: 'ZIP', aliases: ['zip', 'zipcode', 'postal'] },
  { value: 'estimated_value', label: 'Property Value', aliases: ['value', 'property value', 'estimated value'] },
  { value: 'loan_amount', label: 'Loan Amount', aliases: ['loan', 'amount', 'loan amount'] },
  { value: 'loan_type', label: 'Loan Type', aliases: ['type', 'loan type', 'product'] },
  { value: 'loan_purpose', label: 'Loan Purpose', aliases: ['purpose'] },
  { value: 'fico_score', label: 'Credit Score', aliases: ['credit', 'fico', 'score', 'credit score'] },
  { value: 'source', label: 'Lead Source', aliases: ['source', 'lead source'] },
  { value: 'notes', label: 'Notes', aliases: ['notes', 'comments', 'note'] },
];

function autoMapHeaders(headers) {
  const mapping = {};
  
  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const field of LEAD_FIELDS) {
      if (field.value === normalizedHeader || 
          field.label.toLowerCase() === normalizedHeader ||
          field.aliases.some(a => a === normalizedHeader)) {
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
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

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
      return Response.json({ ok: false, needs_reconnect: true, message: 'Please reconnect Google Sheets' });
    }

    if (!accessToken) {
      return Response.json({ ok: false, needs_reconnect: true, message: 'Google Sheets not connected' });
    }

    // Fetch data range
    const range = `'${sheetTitle}'!A${headerRow}:ZZ${headerRow + sampleRows}`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return Response.json({ ok: false, needs_reconnect: true });
      }
      return Response.json({ ok: false, error: 'Failed to read spreadsheet' }, { status: response.status });
    }

    const data = await response.json();
    const values = data.values || [];

    if (values.length === 0) {
      return Response.json({ ok: false, error: 'Sheet is empty' }, { status: 400 });
    }

    const headers = values[0] || [];
    const rows = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    // Get total row count
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    let totalRows = rows.length;
    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      const sheet = meta.sheets?.find(s => s.properties.title === sheetTitle);
      if (sheet?.properties?.gridProperties?.rowCount) {
        totalRows = sheet.properties.gridProperties.rowCount - 1; // minus header
      }
    }

    return Response.json({
      ok: true,
      headers,
      rows,
      totalRows,
      suggestedMapping: autoMapHeaders(headers),
      leadFields: LEAD_FIELDS,
    });
  } catch (error) {
    console.error('googleSheetsPreview error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});