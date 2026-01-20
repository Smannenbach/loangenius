/**
 * Google Sheets Import Leads - Import leads from a Google Sheet
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const orgId = orgData.org_id;

    const body = await req.json();
    const { spreadsheetId, sheetTitle, headerRow = 1, mapping, dedupeMode = 'skip' } = body;

    if (!spreadsheetId || !sheetTitle || !mapping) {
      return Response.json({ ok: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // Get access token
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({ ok: false, needs_reconnect: true });
    }

    // Fetch all data
    const range = `'${sheetTitle}'!A${headerRow}:ZZ`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return Response.json({ ok: false, error: 'Failed to read spreadsheet' }, { status: response.status });
    }

    const data = await response.json();
    const values = data.values || [];
    const headers = values[0] || [];
    const dataRows = values.slice(1);

    let created_count = 0;
    let updated_count = 0;
    let skipped_count = 0;
    let error_count = 0;
    const errors_sample = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + headerRow + 1;

      try {
        // Map row to lead data
        const leadData = { org_id: orgId, status: 'new' };
        
        headers.forEach((header, idx) => {
          const fieldName = mapping[header];
          if (fieldName && row[idx]) {
            let value = row[idx];
            
            // Parse numeric fields
            if (['estimated_value', 'loan_amount', 'fico_score', 'property_taxes', 'monthly_rental_income'].includes(fieldName)) {
              value = parseFloat(value.replace(/[,$]/g, '')) || null;
            }
            
            leadData[fieldName] = value;
          }
        });

        // Skip if no identifying info
        if (!leadData.home_email && !leadData.mobile_phone && !leadData.first_name) {
          skipped_count++;
          continue;
        }

        // Check for duplicates
        let existing = null;
        if (leadData.home_email) {
          const byEmail = await base44.asServiceRole.entities.Lead.filter({
            org_id: orgId,
            home_email: leadData.home_email.toLowerCase(),
          });
          if (byEmail.length > 0) existing = byEmail[0];
        }

        if (!existing && leadData.mobile_phone) {
          const byPhone = await base44.asServiceRole.entities.Lead.filter({
            org_id: orgId,
            mobile_phone: leadData.mobile_phone,
          });
          if (byPhone.length > 0) existing = byPhone[0];
        }

        if (existing) {
          if (dedupeMode === 'update') {
            await base44.asServiceRole.entities.Lead.update(existing.id, leadData);
            updated_count++;
          } else {
            skipped_count++;
          }
        } else {
          // Normalize email
          if (leadData.home_email) {
            leadData.home_email = leadData.home_email.toLowerCase();
          }
          await base44.asServiceRole.entities.Lead.create(leadData);
          created_count++;
        }
      } catch (e) {
        error_count++;
        if (errors_sample.length < 20) {
          errors_sample.push({ row: rowNum, errors: [e.message] });
        }
      }
    }

    // Log import run
    await base44.asServiceRole.entities.ImportRun.create({
      org_id: orgId,
      source_type: 'google_sheets',
      source_ref: `${spreadsheetId}/${sheetTitle}`,
      mapping_json: mapping,
      status: error_count > 0 ? 'completed' : 'completed',
      total_rows: dataRows.length,
      imported_count: created_count,
      updated_count,
      skipped_count,
      error_count,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      created_count,
      updated_count,
      skipped_count,
      error_count,
      errors_sample,
      total_processed: dataRows.length,
    });
  } catch (error) {
    console.error('googleSheetsImportLeads error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});