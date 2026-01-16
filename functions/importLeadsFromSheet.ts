import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SPREADSHEET_ID = '1bArzqISX3za6l2Vg5LIr6b1nyuYQSVzlZeN-cfOHuoQ';
const SHEET_NAME = 'All Leads';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org_id = user.org_id || 'default';

    // Get Google Sheets access token from connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'Google Sheets not authorized. Please authorize in Settings.' 
      }, { status: 403 });
    }

    // Fetch data from Google Sheet
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`;
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!sheetsResponse.ok) {
      const error = await sheetsResponse.text();
      console.error('Google Sheets API error:', error);
      return Response.json({ 
        error: 'Failed to fetch Google Sheet', 
        details: error 
      }, { status: sheetsResponse.status });
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length === 0) {
      return Response.json({ message: 'No data found in sheet', imported: 0 });
    }

    // First row is headers
    const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    const results = {
      total: dataRows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const leadData = {};

      // Map row data to lead fields
      headers.forEach((header, index) => {
        if (row[index]) {
          leadData[header] = row[index];
        }
      });

      try {
        // Convert field names to match Lead entity schema
        const lead = {
          org_id: org_id,
          first_name: leadData.first_name || leadData.firstname || leadData['first name'] || '',
          last_name: leadData.last_name || leadData.lastname || leadData['last name'] || '',
          home_email: leadData.email || leadData.home_email || '',
          work_email: leadData.work_email || '',
          mobile_phone: leadData.phone || leadData.mobile_phone || leadData.mobile || '',
          home_phone: leadData.home_phone || '',
          work_phone: leadData.work_phone || '',
          property_street: leadData.property_address || leadData.address || leadData.property_street || '',
          property_city: leadData.city || leadData.property_city || '',
          property_state: leadData.state || leadData.property_state || '',
          property_zip: leadData.zip || leadData.zipcode || leadData.property_zip || '',
          property_county: leadData.county || leadData.property_county || '',
          property_type: leadData.property_type || '',
          occupancy: leadData.occupancy || '',
          estimated_value: leadData.property_value || leadData.estimated_value || null,
          loan_amount: leadData.loan_amount || null,
          loan_type: leadData.loan_type || 'DSCR',
          loan_purpose: leadData.loan_purpose || leadData.purpose || '',
          current_rate: leadData.current_rate || null,
          current_balance: leadData.current_balance || null,
          fico_score: leadData.fico_score || leadData.credit_score || null,
          source: leadData.source || 'Google Sheets Import',
          status: 'new',
          notes: leadData.notes || '',
        };

        // Convert numeric fields
        if (lead.estimated_value) lead.estimated_value = parseFloat(String(lead.estimated_value).replace(/[^0-9.]/g, '')) || null;
        if (lead.loan_amount) lead.loan_amount = parseFloat(String(lead.loan_amount).replace(/[^0-9.]/g, '')) || null;
        if (lead.current_rate) lead.current_rate = parseFloat(String(lead.current_rate).replace(/[^0-9.]/g, '')) || null;
        if (lead.current_balance) lead.current_balance = parseFloat(String(lead.current_balance).replace(/[^0-9.]/g, '')) || null;
        if (lead.fico_score) lead.fico_score = parseInt(String(lead.fico_score).replace(/[^0-9]/g, '')) || null;

        // Skip if no name or email
        if (!lead.first_name && !lead.last_name && !lead.home_email) {
          results.skipped++;
          continue;
        }

        // Check for existing lead by email
        let existingLead = null;
        if (lead.home_email) {
          const existing = await base44.asServiceRole.entities.Lead.filter({
            org_id: org_id,
            home_email: lead.home_email,
            is_deleted: false
          });
          existingLead = existing[0];
        }

        if (existingLead) {
          // Update existing lead (only non-empty fields)
          const updateData = {};
          Object.keys(lead).forEach(key => {
            if (lead[key] && lead[key] !== '') {
              updateData[key] = lead[key];
            }
          });
          await base44.asServiceRole.entities.Lead.update(existingLead.id, updateData);
          results.updated++;
        } else {
          // Create new lead
          await base44.asServiceRole.entities.Lead.create(lead);
          results.imported++;
        }

      } catch (error) {
        console.error(`Row ${i + 2} error:`, error.message);
        results.errors.push({
          row: i + 2,
          error: error.message
        });
        results.skipped++;
      }
    }

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: org_id,
        activity_type: 'LEAD_IMPORTED',
        description: `Imported ${results.imported} leads, updated ${results.updated} leads from Google Sheets`,
        source: 'system',
        user_id: user.email,
        metadata: results
      });
    } catch (e) {
      console.log('Activity log failed:', e.message);
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});