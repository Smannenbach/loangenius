/**
 * Lead Import Handler - Unified handler for CSV and preview operations
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LEAD_FIELDS = [
  { value: 'first_name', label: 'First Name', aliases: ['first name', 'firstname', 'first', 'fname'] },
  { value: 'last_name', label: 'Last Name', aliases: ['last name', 'lastname', 'last', 'lname'] },
  { value: 'home_email', label: 'Email', aliases: ['email', 'home email', 'e-mail'] },
  { value: 'work_email', label: 'Work Email', aliases: ['work email', 'business email'] },
  { value: 'mobile_phone', label: 'Mobile Phone', aliases: ['phone', 'mobile', 'cell'] },
  { value: 'home_phone', label: 'Home Phone', aliases: ['home phone'] },
  { value: 'work_phone', label: 'Work Phone', aliases: ['work phone'] },
  { value: 'property_street', label: 'Property Address', aliases: ['address', 'street'] },
  { value: 'property_city', label: 'City', aliases: ['city'] },
  { value: 'property_state', label: 'State', aliases: ['state'] },
  { value: 'property_zip', label: 'ZIP Code', aliases: ['zip', 'zipcode'] },
  { value: 'estimated_value', label: 'Property Value', aliases: ['value', 'property value'] },
  { value: 'loan_amount', label: 'Loan Amount', aliases: ['loan amount', 'amount'] },
  { value: 'loan_type', label: 'Loan Type', aliases: ['loan type', 'type'] },
  { value: 'loan_purpose', label: 'Loan Purpose', aliases: ['loan purpose', 'purpose'] },
  { value: 'fico_score', label: 'Credit Score', aliases: ['fico', 'credit score'] },
  { value: 'source', label: 'Lead Source', aliases: ['source'] },
  { value: 'status', label: 'Status', aliases: ['status'] },
  { value: 'notes', label: 'Notes', aliases: ['notes'] },
];

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    row._rowIndex = i + 1;
    rows.push(row);
  }
  
  return { headers, rows };
}

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { action, source_type, data, mapping, name, mapping_json } = body;

    // List saved mappings
    if (action === 'list_mappings') {
      const profiles = await base44.entities.LeadMappingProfile.filter({ org_id: orgId });
      return Response.json({ profiles });
    }

    // Save mapping
    if (action === 'save_mapping') {
      const profile = await base44.entities.LeadMappingProfile.create({
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

    // Import CSV data
    if (action === 'import' && source_type === 'csv' && data && mapping) {
      const { rows } = parseCSV(data);
      let imported = 0, updated = 0, skipped = 0, errors = 0;
      const errorDetails = [];

      for (const row of rows) {
        try {
          const leadData = { org_id: orgId, status: 'new' };
          for (const [header, field] of Object.entries(mapping)) {
            if (field && row[header]) {
              let value = row[header].trim();
              if (field.includes('email')) value = value.toLowerCase();
              if (field.includes('phone')) value = value.replace(/\D/g, '');
              if (['estimated_value', 'loan_amount', 'fico_score'].includes(field)) {
                const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num)) value = num;
              }
              leadData[field] = value;
            }
          }
          
          if (!leadData.first_name && !leadData.last_name && !leadData.home_email) {
            skipped++;
            continue;
          }
          
          await base44.entities.Lead.create(leadData);
          imported++;
        } catch (e) {
          errors++;
          if (errorDetails.length < 50) {
            errorDetails.push({ row: row._rowIndex, errors: [e.message] });
          }
        }
      }

      return Response.json({ imported, updated, skipped, errors, error_details: errorDetails });
    }

    return Response.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});