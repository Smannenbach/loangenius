import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sync leads to Google Sheets
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheet_id, sync_direction = 'export' } = await req.json();

    if (!spreadsheet_id) {
      return Response.json({ error: 'Missing spreadsheet_id' }, { status: 400 });
    }

    // Get access token from Google Sheets connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all leads for the organization
    const leads = await base44.entities.Lead.filter({
      org_id: user.org_id,
      is_deleted: false
    });

    if (sync_direction === 'export') {
      // Prepare data for export
      const values = [
        ['First Name', 'Last Name', 'Home Email', 'Mobile Phone', 'Property Address', 'Property City', 'Property State', 'Loan Amount', 'Loan Type', 'Status', 'Created Date']
      ];

      leads.forEach(lead => {
        values.push([
          lead.first_name || '',
          lead.last_name || '',
          lead.home_email || '',
          lead.mobile_phone || '',
          lead.property_street || '',
          lead.property_city || '',
          lead.property_state || '',
          lead.loan_amount || '',
          lead.loan_type || '',
          lead.status || '',
          new Date(lead.created_date).toLocaleDateString()
        ]);
      });

      // Write to Google Sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/'Leads'?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Sheets API error: ${error}`);
      }

      // Update sync log
      const syncConfig = await base44.asServiceRole.entities.GoogleSheetsSync.filter({
        org_id: user.org_id,
        spreadsheet_id: spreadsheet_id
      });

      if (syncConfig.length > 0) {
        await base44.asServiceRole.entities.GoogleSheetsSync.update(syncConfig[0].id, {
          last_sync_at: new Date().toISOString(),
          last_sync_count: leads.length
        });
      }

      return Response.json({
        success: true,
        message: `Synced ${leads.length} leads to Google Sheets`,
        synced_count: leads.length
      });
    }

    return Response.json({ error: 'Invalid sync direction' }, { status: 400 });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});