import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Import leads from Google Sheets to LoanGenius
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheet_id, sheet_name = 'Leads' } = await req.json();

    if (!spreadsheet_id) {
      return Response.json({ error: 'Missing spreadsheet_id' }, { status: 400 });
    }

    // Get access token from Google Sheets connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch data from Google Sheets
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/'${sheet_name}'`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetResponse.ok) {
      const error = await sheetResponse.text();
      throw new Error(`Google Sheets API error: ${error}`);
    }

    const sheetData = await sheetResponse.json();
    const rows = sheetData.values || [];

    if (rows.length < 2) {
      return Response.json({ error: 'No data found in spreadsheet' }, { status: 400 });
    }

    // Headers are in first row
    const headers = rows[0].map(h => h.toLowerCase().trim());
    
    // Map column indices
    const columnMap = {
      first_name: headers.indexOf('first name'),
      last_name: headers.indexOf('last name'),
      home_email: headers.indexOf('email') >= 0 ? headers.indexOf('email') : headers.indexOf('home email'),
      work_email: headers.indexOf('work email'),
      mobile_phone: headers.indexOf('phone') >= 0 ? headers.indexOf('phone') : headers.indexOf('mobile phone'),
      home_phone: headers.indexOf('home phone'),
      work_phone: headers.indexOf('work phone'),
      property_street: headers.indexOf('property address') >= 0 ? headers.indexOf('property address') : headers.indexOf('street'),
      property_city: headers.indexOf('city'),
      property_state: headers.indexOf('state'),
      property_zip: headers.indexOf('zip') >= 0 ? headers.indexOf('zip') : headers.indexOf('zipcode'),
      property_county: headers.indexOf('county'),
      estimated_value: headers.indexOf('property value') >= 0 ? headers.indexOf('property value') : headers.indexOf('estimated value'),
      loan_amount: headers.indexOf('loan amount'),
      loan_type: headers.indexOf('loan type'),
      loan_purpose: headers.indexOf('loan purpose'),
      status: headers.indexOf('status'),
      source: headers.indexOf('source'),
      notes: headers.indexOf('notes'),
    };

    const createdLeads = [];
    const errors = [];

    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        continue;
      }

      try {
        const leadData = {
          org_id: user.org_id,
        };

        // Map values from spreadsheet
        if (columnMap.first_name >= 0) leadData.first_name = row[columnMap.first_name]?.trim();
        if (columnMap.last_name >= 0) leadData.last_name = row[columnMap.last_name]?.trim();
        if (columnMap.home_email >= 0) leadData.home_email = row[columnMap.home_email]?.trim();
        if (columnMap.work_email >= 0) leadData.work_email = row[columnMap.work_email]?.trim();
        if (columnMap.mobile_phone >= 0) leadData.mobile_phone = row[columnMap.mobile_phone]?.trim();
        if (columnMap.home_phone >= 0) leadData.home_phone = row[columnMap.home_phone]?.trim();
        if (columnMap.work_phone >= 0) leadData.work_phone = row[columnMap.work_phone]?.trim();
        if (columnMap.property_street >= 0) leadData.property_street = row[columnMap.property_street]?.trim();
        if (columnMap.property_city >= 0) leadData.property_city = row[columnMap.property_city]?.trim();
        if (columnMap.property_state >= 0) leadData.property_state = row[columnMap.property_state]?.trim();
        if (columnMap.property_zip >= 0) leadData.property_zip = row[columnMap.property_zip]?.trim();
        if (columnMap.property_county >= 0) leadData.property_county = row[columnMap.property_county]?.trim();
        
        // Handle numeric fields
        if (columnMap.estimated_value >= 0 && row[columnMap.estimated_value]) {
          leadData.estimated_value = parseFloat(row[columnMap.estimated_value]);
        }
        if (columnMap.loan_amount >= 0 && row[columnMap.loan_amount]) {
          leadData.loan_amount = parseFloat(row[columnMap.loan_amount]);
        }
        
        if (columnMap.loan_type >= 0) leadData.loan_type = row[columnMap.loan_type]?.trim();
        if (columnMap.loan_purpose >= 0) leadData.loan_purpose = row[columnMap.loan_purpose]?.trim();
        if (columnMap.status >= 0) leadData.status = row[columnMap.status]?.trim() || 'new';
        if (columnMap.source >= 0) leadData.source = row[columnMap.source]?.trim() || 'google_sheets';
        if (columnMap.notes >= 0) leadData.notes = row[columnMap.notes]?.trim();

        // Require at least first name and last name
        if (!leadData.first_name || !leadData.last_name) {
          errors.push(`Row ${i + 1}: Missing first name or last name`);
          continue;
        }

        // Create lead
        const created = await base44.entities.Lead.create(leadData);
        createdLeads.push(created);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Update sync log
    const syncConfigs = await base44.asServiceRole.entities.GoogleSheetsSync.filter({
      org_id: user.org_id,
      spreadsheet_id: spreadsheet_id,
    });

    if (syncConfigs.length > 0) {
      await base44.asServiceRole.entities.GoogleSheetsSync.update(syncConfigs[0].id, {
        last_sync_at: new Date().toISOString(),
        last_sync_count: createdLeads.length,
        sync_direction: 'import',
      });
    }

    return Response.json({
      success: true,
      message: `Imported ${createdLeads.length} leads from Google Sheets`,
      imported_count: createdLeads.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Google Sheets import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});