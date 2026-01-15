import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled function: Auto-import leads from Google Sheets
 * Called by automation on a daily schedule
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all auto-import configurations for this org
    const syncConfigs = await base44.asServiceRole.entities.GoogleSheetsSync.filter({
      org_id: user.org_id,
      is_active: true,
      sync_direction: 'import',
    });

    if (syncConfigs.length === 0) {
      return Response.json({
        success: true,
        message: 'No active auto-import configurations',
        synced_count: 0,
      });
    }

    let totalImported = 0;
    const results = [];

    for (const config of syncConfigs) {
      try {
        // Get access token from Google Sheets connector
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

        // Fetch data from Google Sheets
        const sheetName = config.sheet_name || 'Leads';
        const sheetResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/'${sheetName}'`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!sheetResponse.ok) {
          throw new Error(`Google Sheets API error: ${sheetResponse.status}`);
        }

        const sheetData = await sheetResponse.json();
        const rows = sheetData.values || [];

        if (rows.length < 2) {
          results.push({ spreadsheet_id: config.spreadsheet_id, status: 'skip', reason: 'No data' });
          continue;
        }

        // Parse headers
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const columnMap = {
          first_name: headers.indexOf('first name'),
          last_name: headers.indexOf('last name'),
          home_email: headers.indexOf('email') >= 0 ? headers.indexOf('email') : headers.indexOf('home email'),
          mobile_phone: headers.indexOf('phone') >= 0 ? headers.indexOf('phone') : headers.indexOf('mobile phone'),
          property_street: headers.indexOf('property address') >= 0 ? headers.indexOf('property address') : headers.indexOf('street'),
          property_city: headers.indexOf('city'),
          property_state: headers.indexOf('state'),
          property_zip: headers.indexOf('zip') >= 0 ? headers.indexOf('zip') : headers.indexOf('zipcode'),
          loan_amount: headers.indexOf('loan amount'),
          loan_type: headers.indexOf('loan type'),
          status: headers.indexOf('status'),
        };

        let importedCount = 0;
        
        // Process each row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          
          if (!row || row.every(cell => !cell || cell.trim() === '')) {
            continue;
          }

          try {
            const first_name = columnMap.first_name >= 0 ? row[columnMap.first_name]?.trim() : null;
            const last_name = columnMap.last_name >= 0 ? row[columnMap.last_name]?.trim() : null;

            if (!first_name || !last_name) continue;

            const leadData = {
              org_id: user.org_id,
              first_name,
              last_name,
            };

            if (columnMap.home_email >= 0) leadData.home_email = row[columnMap.home_email]?.trim();
            if (columnMap.mobile_phone >= 0) leadData.mobile_phone = row[columnMap.mobile_phone]?.trim();
            if (columnMap.property_street >= 0) leadData.property_street = row[columnMap.property_street]?.trim();
            if (columnMap.property_city >= 0) leadData.property_city = row[columnMap.property_city]?.trim();
            if (columnMap.property_state >= 0) leadData.property_state = row[columnMap.property_state]?.trim();
            if (columnMap.property_zip >= 0) leadData.property_zip = row[columnMap.property_zip]?.trim();
            if (columnMap.loan_amount >= 0 && row[columnMap.loan_amount]) {
              leadData.loan_amount = parseFloat(row[columnMap.loan_amount]);
            }
            if (columnMap.loan_type >= 0) leadData.loan_type = row[columnMap.loan_type]?.trim();
            leadData.status = columnMap.status >= 0 ? row[columnMap.status]?.trim() || 'new' : 'new';
            leadData.source = 'google_sheets';

            // Check if lead already exists (by email or name)
            let existingLead = null;
            if (leadData.home_email) {
              const existing = await base44.entities.Lead.filter({
                org_id: user.org_id,
                home_email: leadData.home_email,
              });
              existingLead = existing[0];
            }

            // Only create if doesn't exist
            if (!existingLead) {
              await base44.entities.Lead.create(leadData);
              importedCount++;
            }
          } catch (error) {
            // Skip individual row errors, continue processing
            console.error(`Row ${i} error: ${error.message}`);
          }
        }

        totalImported += importedCount;
        results.push({ spreadsheet_id: config.spreadsheet_id, status: 'success', imported: importedCount });

        // Update last sync
        await base44.asServiceRole.entities.GoogleSheetsSync.update(config.id, {
          last_sync_at: new Date().toISOString(),
          last_sync_count: importedCount,
        });
      } catch (error) {
        results.push({ spreadsheet_id: config.spreadsheet_id, status: 'error', error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `Auto-import completed: ${totalImported} leads imported`,
      synced_count: totalImported,
      results: results,
    });
  } catch (error) {
    console.error('Auto-import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});