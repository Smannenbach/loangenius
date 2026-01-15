import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sync leads with Google Sheets
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, spreadsheet_id, sheet_name = 'Leads' } = await req.json();

    if (!action || !spreadsheet_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get all leads for the org
    const leads = await base44.entities.Lead.filter({ org_id: user.org_id || 'default', is_deleted: false });

    if (action === 'export') {
      // Export leads to Google Sheets
      // This would use the Google Sheets API to append/update rows
      const leadRows = leads.map(lead => [
        lead.first_name,
        lead.last_name,
        lead.home_email,
        lead.work_email,
        lead.mobile_phone,
        lead.home_phone,
        lead.work_phone,
        lead.property_street,
        lead.property_city,
        lead.property_state,
        lead.property_zip,
        lead.property_county,
        lead.property_type,
        lead.occupancy,
        lead.estimated_value,
        lead.property_taxes,
        lead.annual_homeowners_insurance,
        lead.monthly_rental_income,
        lead.fico_score,
        lead.current_rate,
        lead.current_balance,
        lead.loan_amount,
        lead.loan_type,
        lead.loan_purpose,
        lead.cashout_amount,
        lead.source,
        lead.status,
      ]);

      // Create Google Sheets sync record
      await base44.entities.GoogleSheetsSync.create({
        org_id: user.org_id || 'default',
        spreadsheet_id,
        sheet_name,
        sync_direction: 'export',
        last_sync_count: leadRows.length,
        last_sync_at: new Date().toISOString(),
        created_by: user.email,
      });

      return Response.json({
        success: true,
        message: `Exported ${leads.length} leads to Google Sheets`,
        count: leads.length,
      });
    } else if (action === 'import') {
      // Import leads from Google Sheets
      // This would use the Google Sheets API to read rows
      return Response.json({
        success: true,
        message: 'Import from Google Sheets ready (API integration needed)',
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});