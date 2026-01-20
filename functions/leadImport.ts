/**
 * Lead Import Handler - CSV and Google Sheets import
 * FIXED: Uses resolveOrgId, asServiceRole, robust CSV parsing, is_deleted:false
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LEAD_FIELDS = [
  { value: 'first_name', label: 'First Name', aliases: ['first name', 'firstname', 'first', 'fname'] },
  { value: 'last_name', label: 'Last Name', aliases: ['last name', 'lastname', 'last', 'lname'] },
  { value: 'home_email', label: 'Email', aliases: ['email', 'home email', 'e-mail'] },
  { value: 'work_email', label: 'Work Email', aliases: ['work email', 'business email'] },
  { value: 'mobile_phone', label: 'Mobile Phone', aliases: ['phone', 'mobile', 'cell', 'phone number'] },
  { value: 'home_phone', label: 'Home Phone', aliases: ['home phone'] },
  { value: 'work_phone', label: 'Work Phone', aliases: ['work phone'] },
  { value: 'property_street', label: 'Property Address', aliases: ['address', 'street', 'property address'] },
  { value: 'property_city', label: 'City', aliases: ['city'] },
  { value: 'property_state', label: 'State', aliases: ['state'] },
  { value: 'property_zip', label: 'ZIP Code', aliases: ['zip', 'zipcode', 'zip code', 'postal'] },
  { value: 'estimated_value', label: 'Property Value', aliases: ['value', 'property value', 'home value'] },
  { value: 'loan_amount', label: 'Loan Amount', aliases: ['loan amount', 'amount', 'loan'] },
  { value: 'loan_type', label: 'Loan Type', aliases: ['loan type', 'type'] },
  { value: 'loan_purpose', label: 'Loan Purpose', aliases: ['loan purpose', 'purpose'] },
  { value: 'fico_score', label: 'Credit Score', aliases: ['fico', 'credit score', 'credit'] },
  { value: 'source', label: 'Lead Source', aliases: ['source', 'lead source'] },
  { value: 'status', label: 'Status', aliases: ['status'] },
  { value: 'notes', label: 'Notes', aliases: ['notes', 'comments'] },
];

/**
 * Robust CSV parser that handles quoted fields with commas
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    row._rowIndex = i + 1;
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Auto-map headers to lead fields
 */
function autoMapHeaders(headers) {
  const mapping = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    for (const field of LEAD_FIELDS) {
      if (field.aliases.some(a => normalized === a || normalized.includes(a))) {
        mapping[header] = field.value;
        break;
      }
    }
  }
  return mapping;
}

/**
 * Resolve org using resolveOrgId function
 */
async function resolveOrg(base44) {
  const response = await base44.functions.invoke('resolveOrgId', { auto_create: true });
  const data = response.data;
  
  if (!data.ok || !data.has_org) {
    throw new Error('No organization found. Please contact support.');
  }
  
  return data.org_id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve org via canonical function
    let orgId;
    try {
      orgId = await resolveOrg(base44);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 403 });
    }

    const body = await req.json();
    const { action, source_type, data, mapping, name, mapping_json, spreadsheet_id, sheet_name } = body;

    // List saved mappings
    if (action === 'list_mappings') {
      const profiles = await base44.asServiceRole.entities.LeadMappingProfile.filter({ org_id: orgId });
      return Response.json({ profiles });
    }

    // Save mapping
    if (action === 'save_mapping') {
      const profile = await base44.asServiceRole.entities.LeadMappingProfile.create({
        org_id: orgId,
        name,
        mapping_json,
      });
      return Response.json({ profile });
    }

    // Preview CSV data
    if (action === 'preview' && source_type === 'csv' && data) {
      const { headers, rows } = parseCSV(data);
      const suggestedMapping = autoMapHeaders(headers);
      return Response.json({
        headers,
        rows: rows.slice(0, 25),
        total_rows: rows.length,
        suggested_mapping: suggestedMapping,
        lead_fields: LEAD_FIELDS.map(f => ({ value: f.value, label: f.label })),
      });
    }

    // Preview Google Sheets data
    if (action === 'preview' && source_type === 'google_sheets' && spreadsheet_id) {
      let accessToken;
      try {
        accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
      } catch (e) {
        return Response.json({ 
          error: 'Google Sheets not authorized. Please connect in Admin → Integrations.',
          needs_reconnect: true 
        }, { status: 403 });
      }

      const sheetTitle = sheet_name || 'Sheet1';
      const range = `'${sheetTitle}'!A1:ZZ`;
      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}`;
      
      const response = await fetch(sheetsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 401 || response.status === 403) {
          return Response.json({ 
            error: 'Google Sheets authorization expired. Please re-authorize in Admin → Integrations.',
            needs_reconnect: true 
          }, { status: 403 });
        }
        return Response.json({ error: `Failed to read sheet: ${errText}` }, { status: response.status });
      }

      const sheetData = await response.json();
      const values = sheetData.values || [];
      if (values.length === 0) {
        return Response.json({ headers: [], rows: [], total_rows: 0, suggested_mapping: {}, lead_fields: LEAD_FIELDS.map(f => ({ value: f.value, label: f.label })) });
      }

      const headers = values[0];
      const rows = values.slice(1).map((row, idx) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        obj._rowIndex = idx + 2;
        return obj;
      });

      return Response.json({
        headers,
        rows: rows.slice(0, 25),
        total_rows: rows.length,
        suggested_mapping: autoMapHeaders(headers),
        lead_fields: LEAD_FIELDS.map(f => ({ value: f.value, label: f.label })),
      });
    }

    // Import CSV data
    if (action === 'import' && source_type === 'csv' && data && mapping) {
      const { rows } = parseCSV(data);
      let imported = 0, updated = 0, skipped = 0, errors = 0;
      const errorDetails = [];

      for (const row of rows) {
        try {
          const leadData = { 
            org_id: orgId, 
            status: 'new',
            is_deleted: false  // CRITICAL: Always set this
          };
          
          for (const [header, field] of Object.entries(mapping)) {
            if (field && row[header]) {
              let value = row[header].trim();
              
              if (field.includes('email')) {
                value = value.toLowerCase();
              }
              if (field.includes('phone')) {
                value = value.replace(/[^\d+]/g, '');
              }
              if (['estimated_value', 'loan_amount', 'fico_score', 'property_taxes', 'monthly_rental_income'].includes(field)) {
                const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num)) value = num;
                else continue; // Skip invalid numbers
              }
              
              leadData[field] = value;
            }
          }

          // Skip if no identifying info
          if (!leadData.first_name && !leadData.last_name && !leadData.home_email && !leadData.mobile_phone) {
            skipped++;
            continue;
          }

          // Use asServiceRole for all writes
          await base44.asServiceRole.entities.Lead.create(leadData);
          imported++;
        } catch (e) {
          errors++;
          if (errorDetails.length < 50) {
            errorDetails.push({ row: row._rowIndex, errors: [e.message] });
          }
        }
      }

      // Log import run
      try {
        await base44.asServiceRole.entities.ImportRun.create({
          org_id: orgId,
          source_type: 'csv',
          source_ref: 'CSV Upload',
          mapping_json: mapping,
          status: 'completed',
          total_rows: rows.length,
          imported_count: imported,
          updated_count: updated,
          skipped_count: skipped,
          error_count: errors,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
      } catch (e) {
        // Log failure is non-critical
      }

      return Response.json({ imported, updated, skipped, errors, error_details: errorDetails });
    }

    // Import Google Sheets data
    if (action === 'import' && source_type === 'google_sheets' && spreadsheet_id && mapping) {
      let accessToken;
      try {
        accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
      } catch (e) {
        return Response.json({ 
          error: 'Google Sheets not authorized.',
          needs_reconnect: true 
        }, { status: 403 });
      }

      const sheetTitle = sheet_name || 'Sheet1';
      const range = `'${sheetTitle}'!A1:ZZ`;
      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}`;
      
      const response = await fetch(sheetsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        return Response.json({ error: 'Failed to read sheet' }, { status: response.status });
      }

      const sheetData = await response.json();
      const values = sheetData.values || [];
      if (values.length < 2) {
        return Response.json({ imported: 0, updated: 0, skipped: 0, errors: 0, error_details: [] });
      }

      const headers = values[0];
      let imported = 0, updated = 0, skipped = 0, errors = 0;
      const errorDetails = [];

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        try {
          const leadData = { 
            org_id: orgId, 
            status: 'new',
            is_deleted: false
          };

          headers.forEach((header, idx) => {
            const field = mapping[header];
            if (field && row[idx]) {
              let value = row[idx].trim();
              
              if (field.includes('email')) value = value.toLowerCase();
              if (field.includes('phone')) value = value.replace(/[^\d+]/g, '');
              if (['estimated_value', 'loan_amount', 'fico_score'].includes(field)) {
                const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num)) value = num;
                else return;
              }
              
              leadData[field] = value;
            }
          });

          if (!leadData.first_name && !leadData.last_name && !leadData.home_email && !leadData.mobile_phone) {
            skipped++;
            continue;
          }

          await base44.asServiceRole.entities.Lead.create(leadData);
          imported++;
        } catch (e) {
          errors++;
          if (errorDetails.length < 50) {
            errorDetails.push({ row: i + 1, errors: [e.message] });
          }
        }
      }

      // Log import
      try {
        await base44.asServiceRole.entities.ImportRun.create({
          org_id: orgId,
          source_type: 'google_sheets',
          source_ref: `${spreadsheet_id}/${sheetTitle}`,
          mapping_json: mapping,
          status: 'completed',
          total_rows: values.length - 1,
          imported_count: imported,
          updated_count: updated,
          skipped_count: skipped,
          error_count: errors,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
      } catch (e) {}

      return Response.json({ imported, updated, skipped, errors, error_details: errorDetails });
    }

    return Response.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    // Safe logging - don't expose full error details
    console.error('leadImport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});