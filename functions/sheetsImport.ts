import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// POST /functions/sheetsPreview
async function handlePreview(req) {
  try {
    const { source_type, sheet_url, header_row = 1, max_rows = 25 } = await req.json();
    
    if (source_type === 'csv') {
      // Convert Google Sheets share URL to CSV export URL
      let csvUrl = sheet_url;
      const match = sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }

      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1, Math.min(max_rows + 1, lines.length))
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {});
        });

      // Suggest field mappings
      const suggestedMapping = {};
      const fieldMap = {
        'first_name': ['First Name', 'firstName', 'first', 'forename'],
        'last_name': ['Last Name', 'lastName', 'last', 'surname'],
        'email': ['Email', 'email_address', 'e-mail', 'contact_email'],
        'phone': ['Phone', 'phone_number', 'mobile', 'contact_phone', 'telephone'],
        'entity_name': ['Company', 'entity_name', 'organization'],
        'source': ['Source', 'lead_source', 'source_type']
      };

      for (const [targetField, possibleHeaders] of Object.entries(fieldMap)) {
        const match = headers.find(h => possibleHeaders.some(p => h.toLowerCase().includes(p.toLowerCase())));
        if (match) suggestedMapping[match] = targetField;
      }

      return Response.json({ headers, rows, suggested_mapping: suggestedMapping });
    }

    return Response.json({ error: 'Unsupported source_type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST /functions/leadsImport
async function handleImport(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.org_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      source_type,
      sheet_url,
      mapping,
      dedupe_keys = ['email'],
      assigned_to_user_id,
      lead_source,
      lead_status = 'new'
    } = await req.json();

    // Create ImportRun record
    const importRun = await base44.entities.ImportRun.create({
      org_id: user.org_id,
      source_type,
      source_ref: sheet_url,
      status: 'running',
      total_rows: 0,
      imported_count: 0,
      skipped_count: 0,
      error_count: 0,
      started_at: new Date().toISOString(),
      created_by: user.email
    });

    // Fetch CSV
    let csvUrl = sheet_url;
    const match = sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    let imported = 0, skipped = 0, errors = 0;
    const errorSamples = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowData = headers.reduce((obj, h, idx) => ({ ...obj, [h]: values[idx] }), {});

        // Map fields
        const mappedData = {};
        for (const [sourceField, targetField] of Object.entries(mapping)) {
          if (rowData[sourceField] !== undefined && rowData[sourceField] !== '') {
            mappedData[targetField] = rowData[sourceField];
          }
        }

        if (!mappedData.email && !mappedData.phone) {
          skipped++;
          continue;
        }

        // Check for duplicates
        const existingFilter = { org_id: user.org_id };
        if (mappedData.email) existingFilter.email = mappedData.email;

        const existing = await base44.entities.Contact.filter(existingFilter);
        
        if (existing.length > 0) {
          // Update existing
          await base44.entities.Contact.update(existing[0].id, {
            ...mappedData,
            is_lead: true,
            lead_status: lead_status,
            ...(assigned_to_user_id && { assigned_to: assigned_to_user_id }),
            ...(lead_source && { source: lead_source })
          });
        } else {
          // Create new
          await base44.entities.Contact.create({
            org_id: user.org_id,
            contact_type: 'individual',
            ...mappedData,
            is_lead: true,
            lead_status: lead_status,
            ...(assigned_to_user_id && { assigned_to: assigned_to_user_id }),
            ...(lead_source && { source: lead_source })
          });
        }

        imported++;
      } catch (error) {
        errors++;
        if (errorSamples.length < 5) {
          errorSamples.push({
            row: i + 1,
            error: error.message,
            data: rowData
          });
        }
      }
    }

    // Update ImportRun
    await base44.entities.ImportRun.update(importRun.id, {
      status: 'completed',
      total_rows: lines.length - 1,
      imported_count: imported,
      skipped_count: skipped,
      error_count: errors,
      error_sample_json: errorSamples,
      finished_at: new Date().toISOString()
    });

    return Response.json({
      import_run_id: importRun.id,
      status: 'completed',
      imported_count: imported,
      skipped_count: skipped,
      error_count: errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;

  if (req.method === 'POST' && path === '/functions/sheetsImportPreview') {
    return handlePreview(req);
  }
  if (req.method === 'POST' && path === '/functions/sheetsImportLeads') {
    return handleImport(req);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
});