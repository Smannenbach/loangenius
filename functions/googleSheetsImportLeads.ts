/**
 * Google Sheets - Import Leads
 * Full import with dedupe, validation, and ImportRun logging
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
      const backoff = 1000 * Math.pow(2, attempt);
      console.log(`[import] Rate limited, waiting ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `API error: ${text}` };
    }
    
    return { ok: true, data: await response.json() };
  }
  return { ok: false, error: 'Rate limited - please try again later' };
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '1' + digits;
  return digits;
}

function getDedupeKey(data) {
  const email = normalizeEmail(data.home_email || data.work_email);
  if (email) return { type: 'email', value: email };
  
  const phone = normalizePhone(data.mobile_phone || data.home_phone || data.work_phone);
  if (phone && phone.length >= 10) return { type: 'phone', value: phone };
  
  return null;
}

function validateRow(data, rowIndex) {
  const errors = [];
  
  const hasEmail = data.home_email || data.work_email;
  const hasPhone = data.mobile_phone || data.home_phone || data.work_phone;
  const hasName = data.first_name || data.last_name;
  
  if (!hasEmail && !hasPhone && !hasName) {
    errors.push('No identifiable info (need name, email, or phone)');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.home_email && !emailRegex.test(data.home_email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
}

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  let importRunId = null;
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get org and verify role
    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ ok: false, error: 'No organization membership' }, { status: 403 });
    }
    
    const orgId = memberships[0].org_id;
    const role = memberships[0].role_id || 'user';
    if (!['admin', 'owner', 'manager', 'loan_officer'].includes(role) && user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Import requires admin or loan officer role' }, { status: 403 });
    }
    
    const body = await req.json();
    const {
      spreadsheetId,
      sheetTitle,
      headerRow = 1,
      startRow = null,
      endRow = null,
      mapping,
      dedupeMode = 'skip', // 'skip' or 'update'
      dryRun = false,
    } = body;
    
    if (!spreadsheetId || !sheetTitle || !mapping) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get access token
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({ ok: false, error: 'Google Sheets not connected.', needs_reconnect: true }, { status: 403 });
    }
    
    // Fetch all rows
    const dataStartRow = startRow || (headerRow + 1);
    const headerRange = `'${sheetTitle}'!${headerRow}:${headerRow}`;
    let dataRange;
    if (endRow) {
      dataRange = `'${sheetTitle}'!${dataStartRow}:${endRow}`;
    } else {
      dataRange = `'${sheetTitle}'!A${dataStartRow}:ZZ`;
    }
    
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
    
    // Create ImportRun record
    if (!dryRun) {
      const importRun = await base44.asServiceRole.entities.ImportRun.create({
        org_id: orgId,
        source_type: 'google_sheets',
        source_ref: `${spreadsheetId}/${sheetTitle}`,
        mapping_json: mapping,
        status: 'running',
        total_rows: rawRows.length,
        started_at: startedAt,
      });
      importRunId = importRun.id;
    }
    
    // Build existing leads index for deduplication
    const existingLeads = await base44.entities.Lead.filter({ org_id: orgId, is_deleted: false });
    const emailIndex = new Map();
    const phoneIndex = new Map();
    
    for (const lead of existingLeads) {
      if (lead.home_email) emailIndex.set(normalizeEmail(lead.home_email), lead);
      if (lead.work_email) emailIndex.set(normalizeEmail(lead.work_email), lead);
      if (lead.mobile_phone) phoneIndex.set(normalizePhone(lead.mobile_phone), lead);
      if (lead.home_phone) phoneIndex.set(normalizePhone(lead.home_phone), lead);
      if (lead.work_phone) phoneIndex.set(normalizePhone(lead.work_phone), lead);
    }
    
    // Process rows
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errorsSample = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIndex = dataStartRow + i;
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        skippedCount++;
        continue;
      }
      
      // Build lead data from mapping
      const leadData = { org_id: orgId, status: 'new' };
      
      for (const [headerName, fieldName] of Object.entries(mapping)) {
        if (!fieldName || fieldName === 'skip') continue;
        
        const colIndex = headers.indexOf(headerName);
        if (colIndex === -1) continue;
        
        let value = row[colIndex];
        if (value === undefined || value === null || String(value).trim() === '') continue;
        
        value = String(value).trim();
        
        // Normalize specific fields
        if (fieldName.includes('email')) {
          value = value.toLowerCase();
        } else if (fieldName.includes('phone')) {
          value = value.replace(/\D/g, '');
          if (value.length === 10) value = '1' + value;
        } else if (['estimated_value', 'loan_amount', 'current_balance', 'fico_score', 'current_rate', 'property_taxes', 'annual_homeowners_insurance', 'monthly_rental_income', 'cashout_amount'].includes(fieldName)) {
          const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) value = num;
          else continue;
        }
        
        // Validate status enum
        if (fieldName === 'status') {
          value = VALID_STATUSES.includes(value.toLowerCase()) ? value.toLowerCase() : 'new';
        }
        
        leadData[fieldName] = value;
      }
      
      // Validate
      const errors = validateRow(leadData, rowIndex);
      if (errors.length > 0) {
        errorCount++;
        if (errorsSample.length < 50) {
          errorsSample.push({ row: rowIndex, errors });
        }
        continue;
      }
      
      // Dedupe check
      const dedupeKey = getDedupeKey(leadData);
      let existingLead = null;
      
      if (dedupeKey) {
        if (dedupeKey.type === 'email') {
          existingLead = emailIndex.get(dedupeKey.value);
        } else if (dedupeKey.type === 'phone') {
          existingLead = phoneIndex.get(dedupeKey.value);
        }
      }
      
      if (dryRun) {
        if (existingLead) {
          if (dedupeMode === 'update') updatedCount++;
          else skippedCount++;
        } else {
          createdCount++;
        }
        continue;
      }
      
      // Create or update
      try {
        if (existingLead) {
          if (dedupeMode === 'update') {
            // Merge - only update empty fields
            const updates = {};
            for (const [key, value] of Object.entries(leadData)) {
              if (key === 'org_id') continue;
              if (value && !existingLead[key]) {
                updates[key] = value;
              }
            }
            
            if (Object.keys(updates).length > 0) {
              await base44.entities.Lead.update(existingLead.id, updates);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        } else {
          // Create new lead
          leadData.source = leadData.source || 'google_sheets';
          const newLead = await base44.entities.Lead.create(leadData);
          createdCount++;
          
          // Update index
          if (leadData.home_email) emailIndex.set(normalizeEmail(leadData.home_email), newLead);
          if (leadData.mobile_phone) phoneIndex.set(normalizePhone(leadData.mobile_phone), newLead);
        }
      } catch (e) {
        errorCount++;
        if (errorsSample.length < 50) {
          errorsSample.push({ row: rowIndex, errors: [e.message] });
        }
      }
    }
    
    // Update ImportRun
    if (importRunId) {
      await base44.asServiceRole.entities.ImportRun.update(importRunId, {
        status: 'completed',
        imported_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        error_sample_json: errorsSample,
        finished_at: new Date().toISOString(),
      });
    }
    
    return Response.json({
      ok: true,
      import_run_id: importRunId,
      read_count: rawRows.length,
      created_count: createdCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      errors_sample: errorsSample,
      dry_run: dryRun,
    });
    
  } catch (error) {
    console.error('[googleSheetsImportLeads] Error:', error.message);
    
    // Update ImportRun on failure
    if (importRunId) {
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.ImportRun.update(importRunId, {
          status: 'failed',
          error_sample_json: [{ row: 0, errors: [error.message] }],
          finished_at: new Date().toISOString(),
        });
      } catch {}
    }
    
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});