import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Lead field definitions for mapping
const LEAD_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'home_email', label: 'Email' },
  { value: 'work_email', label: 'Work Email' },
  { value: 'mobile_phone', label: 'Phone' },
  { value: 'home_phone', label: 'Home Phone' },
  { value: 'work_phone', label: 'Work Phone' },
  { value: 'property_street', label: 'Property Street' },
  { value: 'property_city', label: 'Property City' },
  { value: 'property_state', label: 'Property State' },
  { value: 'property_zip', label: 'Property ZIP' },
  { value: 'property_county', label: 'Property County' },
  { value: 'property_type', label: 'Property Type' },
  { value: 'occupancy', label: 'Occupancy' },
  { value: 'estimated_value', label: 'Property Value' },
  { value: 'loan_amount', label: 'Loan Amount' },
  { value: 'loan_type', label: 'Loan Type' },
  { value: 'loan_purpose', label: 'Loan Purpose' },
  { value: 'fico_score', label: 'Credit Score' },
  { value: 'current_rate', label: 'Current Rate' },
  { value: 'current_balance', label: 'Current Balance' },
  { value: 'monthly_rental_income', label: 'Monthly Rent' },
  { value: 'source', label: 'Lead Source' },
  { value: 'notes', label: 'Notes' },
  { value: 'zillow_link', label: 'Zillow Link' },
];

// Auto-suggest mapping based on header names
function suggestMapping(headers) {
  const mapping = {};
  const headerLower = headers.map(h => h.toLowerCase().trim());
  
  const patterns = {
    first_name: ['first name', 'firstname', 'first', 'given name', 'forename'],
    last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
    home_email: ['email', 'e-mail', 'email address', 'contact email', 'home email'],
    work_email: ['work email', 'business email', 'office email'],
    mobile_phone: ['phone', 'mobile', 'cell', 'telephone', 'phone number', 'mobile phone', 'cell phone'],
    home_phone: ['home phone', 'home tel'],
    work_phone: ['work phone', 'office phone', 'business phone'],
    property_street: ['address', 'street', 'property address', 'street address', 'property street'],
    property_city: ['city', 'property city'],
    property_state: ['state', 'property state', 'province'],
    property_zip: ['zip', 'zipcode', 'zip code', 'postal code', 'property zip'],
    property_county: ['county', 'property county'],
    property_type: ['property type', 'type'],
    occupancy: ['occupancy', 'occupancy type'],
    estimated_value: ['value', 'property value', 'estimated value', 'est value', 'home value'],
    loan_amount: ['loan amount', 'amount', 'loan'],
    loan_type: ['loan type', 'product', 'loan product'],
    loan_purpose: ['purpose', 'loan purpose'],
    fico_score: ['credit score', 'fico', 'fico score', 'score', 'credit'],
    current_rate: ['current rate', 'rate', 'interest rate'],
    current_balance: ['current balance', 'balance', 'mortgage balance'],
    monthly_rental_income: ['rent', 'rental income', 'monthly rent', 'rental'],
    source: ['source', 'lead source', 'referral source'],
    notes: ['notes', 'comments', 'remarks'],
    zillow_link: ['zillow', 'zillow link', 'listing url', 'listing link'],
  };

  for (const [field, patternList] of Object.entries(patterns)) {
    for (let i = 0; i < headerLower.length; i++) {
      if (patternList.some(p => headerLower[i].includes(p) || p.includes(headerLower[i]))) {
        mapping[headers[i]] = field;
        break;
      }
    }
  }

  return mapping;
}

// Parse CSV text into rows
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Handle quoted fields properly
  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map((line, idx) => {
    const values = parseRow(line);
    const row = { _rowIndex: idx + 2 };
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
}

// Generate dedupe key for a lead
function getDedupeKey(lead) {
  if (lead.home_email) return `email:${lead.home_email.toLowerCase()}`;
  if (lead.mobile_phone) return `phone:${lead.mobile_phone.replace(/\D/g, '')}`;
  if (lead.first_name && lead.last_name && lead.property_street) {
    return `name_addr:${lead.first_name.toLowerCase()}_${lead.last_name.toLowerCase()}_${lead.property_street.toLowerCase()}`;
  }
  return null;
}

// Validate a lead row
function validateLead(lead, rowIndex) {
  const errors = [];
  
  // Must have at least one identifier
  if (!lead.first_name && !lead.last_name && !lead.home_email && !lead.mobile_phone) {
    errors.push({ row: rowIndex, field: 'identity', message: 'Must have name, email, or phone' });
  }

  // Validate email format if present
  if (lead.home_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.home_email)) {
    errors.push({ row: rowIndex, field: 'home_email', message: 'Invalid email format' });
  }

  return errors;
}

// Convert numeric fields
function convertNumericFields(lead) {
  const numericFields = ['estimated_value', 'loan_amount', 'current_rate', 'current_balance', 'monthly_rental_income', 'fico_score'];
  for (const field of numericFields) {
    if (lead[field]) {
      const cleaned = String(lead[field]).replace(/[^0-9.]/g, '');
      lead[field] = cleaned ? parseFloat(cleaned) : null;
    }
  }
  if (lead.fico_score) lead.fico_score = Math.round(lead.fico_score);
  return lead;
}

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

    const body = await req.json();
    const { action, source_type, data, sheet_url, spreadsheet_id, sheet_name, mapping, skip_validation } = body;

    // Determine org_id - MUST be from verified membership
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ error: 'User not part of any organization' }, { status: 403 });
    }
    const org_id = memberships[0].org_id;
    const userRole = memberships[0].role || 'user';
    
    // RBAC: Only admin and loan_officer can import leads
    const allowedImportRoles = ['admin', 'owner', 'loan_officer', 'super_admin'];
    if (!allowedImportRoles.includes(userRole)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions to import leads' }, { status: 403 });
    }

    // ACTION: preview - Parse and return preview data
    if (action === 'preview') {
      let csvText = '';

      if (source_type === 'csv' && data) {
        // Direct CSV data passed - can be string (raw CSV) or array (pre-parsed rows)
        if (typeof data === 'string') {
          csvText = data;
        } else if (Array.isArray(data)) {
          // Pre-parsed row array - convert back to CSV format
          if (data.length === 0) {
            return Response.json({ headers: [], rows: [], suggested_mapping: {} });
          }
          const headers = Object.keys(data[0]).filter(k => k !== '_rowIndex');
          const csvRows = [headers.join(',')];
          for (const row of data) {
            csvRows.push(headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','));
          }
          csvText = csvRows.join('\n');
        } else {
          return Response.json({ error: 'Invalid data format - expected string or array' }, { status: 400 });
        }
      } else if (source_type === 'google_sheets' && spreadsheet_id) {
        // Fetch from Google Sheets API
        let accessToken;
        try {
          accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
        } catch (e) {
          return Response.json({ 
            error: 'Google Sheets not connected. Go to Admin → Integrations to authorize.',
            connector_missing: true 
          }, { status: 403 });
        }
        if (!accessToken) {
          return Response.json({ 
            error: 'Google Sheets authorization expired. Please re-authorize in Admin → Integrations.',
            connector_missing: true 
          }, { status: 403 });
        }

        const range = sheet_name || 'Sheet1';
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}`;
        const sheetsResponse = await fetch(sheetsUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!sheetsResponse.ok) {
          const errorText = await sheetsResponse.text();
          return Response.json({ error: 'Failed to fetch sheet', details: errorText }, { status: sheetsResponse.status });
        }

        const sheetsData = await sheetsResponse.json();
        const rows = sheetsData.values || [];
        if (rows.length === 0) {
          return Response.json({ headers: [], rows: [], suggested_mapping: {} });
        }

        // Convert to CSV format for consistent parsing
        csvText = rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      } else if (sheet_url) {
        // Public Google Sheet URL - export as CSV
        let csvUrl = sheet_url;
        const match = sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        }
        const response = await fetch(csvUrl);
        if (!response.ok) {
          return Response.json({ error: 'Failed to fetch sheet. Make sure it is shared publicly.' }, { status: 400 });
        }
        csvText = await response.text();
      } else {
        return Response.json({ error: 'Must provide data, sheet_url, or spreadsheet_id' }, { status: 400 });
      }

      const { headers, rows } = parseCSV(csvText);
      const suggested_mapping = suggestMapping(headers);

      // Validate preview rows
      const previewRows = rows.slice(0, 25);
      const validationErrors = [];
      
      for (const row of previewRows) {
        const lead = {};
        for (const [col, field] of Object.entries(suggested_mapping)) {
          if (row[col]) lead[field] = row[col];
        }
        const rowErrors = validateLead(lead, row._rowIndex);
        validationErrors.push(...rowErrors);
      }

      return Response.json({
        headers,
        rows: previewRows,
        total_rows: rows.length,
        suggested_mapping,
        validation_errors: validationErrors,
        lead_fields: LEAD_FIELDS
      });
    }

    // ACTION: import - Actually import the leads
    if (action === 'import') {
      let csvText = '';

      if (source_type === 'csv' && data) {
        // Direct CSV data passed - can be string (raw CSV) or array (pre-parsed rows)
        if (typeof data === 'string') {
          csvText = data;
        } else if (Array.isArray(data)) {
          // Pre-parsed row array - convert back to CSV format
          if (data.length === 0) {
            return Response.json({ error: 'No data to import' }, { status: 400 });
          }
          const headers = Object.keys(data[0]).filter(k => k !== '_rowIndex');
          const csvRows = [headers.join(',')];
          for (const row of data) {
            csvRows.push(headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','));
          }
          csvText = csvRows.join('\n');
        } else {
          return Response.json({ error: 'Invalid data format - expected string or array' }, { status: 400 });
        }
      } else if (source_type === 'google_sheets' && spreadsheet_id) {
        let accessToken;
        try {
          accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
        } catch (e) {
          return Response.json({ 
            error: 'Google Sheets not connected. Go to Admin → Integrations to authorize.',
            connector_missing: true 
          }, { status: 403 });
        }
        if (!accessToken) {
          return Response.json({ 
            error: 'Google Sheets authorization expired. Please re-authorize.',
            connector_missing: true 
          }, { status: 403 });
        }

        const range = sheet_name || 'Sheet1';
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}`;
        const sheetsResponse = await fetch(sheetsUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!sheetsResponse.ok) {
          return Response.json({ error: 'Failed to fetch sheet' }, { status: sheetsResponse.status });
        }

        const sheetsData = await sheetsResponse.json();
        const rows = sheetsData.values || [];
        csvText = rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      } else if (sheet_url) {
        let csvUrl = sheet_url;
        const match = sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        }
        const response = await fetch(csvUrl);
        csvText = await response.text();
      } else {
        return Response.json({ error: 'No data source provided' }, { status: 400 });
      }

      const { headers, rows } = parseCSV(csvText);

      // Create ImportRun record
      const importRun = await base44.entities.ImportRun.create({
        org_id,
        source_type: source_type || 'csv',
        source_ref: sheet_url || spreadsheet_id || 'direct_upload',
        mapping_json: mapping,
        status: 'running',
        total_rows: rows.length,
        imported_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        started_at: new Date().toISOString()
      });

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      const seenDedupeKeys = new Set();

      for (const row of rows) {
        try {
          // Map fields
          const lead = { org_id, status: 'new' };
          for (const [col, field] of Object.entries(mapping || {})) {
            if (field && field !== 'skip' && row[col]) {
              lead[field] = row[col];
            }
          }

          // Validate
          if (!skip_validation) {
            const rowErrors = validateLead(lead, row._rowIndex);
            if (rowErrors.length > 0) {
              results.skipped++;
              results.errors.push({ row: row._rowIndex, errors: rowErrors.map(e => e.message) });
              continue;
            }
          }

          // Convert numeric fields
          convertNumericFields(lead);

          // Dedupe check
          const dedupeKey = getDedupeKey(lead);
          if (dedupeKey) {
            // Check within this import batch
            if (seenDedupeKeys.has(dedupeKey)) {
              results.skipped++;
              continue;
            }
            seenDedupeKeys.add(dedupeKey);

            // Check existing in database
            let existing = null;
            if (lead.home_email) {
              const matches = await base44.asServiceRole.entities.Lead.filter({
                org_id,
                home_email: lead.home_email,
                is_deleted: false
              });
              existing = matches[0];
            } else if (lead.mobile_phone) {
              const phone = lead.mobile_phone.replace(/\D/g, '');
              const allLeads = await base44.asServiceRole.entities.Lead.filter({ org_id, is_deleted: false });
              existing = allLeads.find(l => l.mobile_phone?.replace(/\D/g, '') === phone);
            }

            if (existing) {
              // Update existing lead
              const updateData = {};
              for (const [k, v] of Object.entries(lead)) {
                if (v !== null && v !== undefined && v !== '' && k !== 'org_id' && k !== 'status') {
                  updateData[k] = v;
                }
              }
              await base44.asServiceRole.entities.Lead.update(existing.id, updateData);
              results.updated++;
              continue;
            }
          }

          // Create new lead
          await base44.asServiceRole.entities.Lead.create(lead);
          results.imported++;

        } catch (error) {
          results.errors.push({ row: row._rowIndex, errors: [error.message] });
        }
      }

      // Update ImportRun
      await base44.entities.ImportRun.update(importRun.id, {
        status: 'completed',
        imported_count: results.imported,
        updated_count: results.updated,
        skipped_count: results.skipped,
        error_count: results.errors.length,
        error_sample_json: results.errors.slice(0, 10),
        finished_at: new Date().toISOString()
      });

      return Response.json({
        success: true,
        import_run_id: importRun.id,
        imported: results.imported,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors.length,
        error_details: results.errors.slice(0, 10)
      });
    }

    // ACTION: save_mapping - Save a mapping profile
    if (action === 'save_mapping') {
      const { name, mapping_json } = body;
      if (!name || !mapping_json) {
        return Response.json({ error: 'Name and mapping_json required' }, { status: 400 });
      }

      const profile = await base44.entities.LeadMappingProfile.create({
        org_id,
        name,
        mapping_json
      });

      return Response.json({ success: true, profile_id: profile.id });
    }

    // ACTION: list_mappings - List saved mapping profiles
    if (action === 'list_mappings') {
      const profiles = await base44.entities.LeadMappingProfile.filter({ org_id });
      return Response.json({ profiles });
    }

    return Response.json({ error: 'Invalid action. Use: preview, import, save_mapping, list_mappings' }, { status: 400 });

  } catch (error) {
    console.error('Lead import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});