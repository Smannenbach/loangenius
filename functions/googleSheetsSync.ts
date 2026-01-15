/**
 * Google Sheets Integration
 * Syncs deal data to Google Sheets for reporting/tracking
 * Requires Google Sheets OAuth app connector authorization
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, org_id, spreadsheet_id, range, data, deal_id } = await req.json();

    if (!action || !org_id || !spreadsheet_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Google Sheets access token via app connector
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    } catch (e) {
      return Response.json({ 
        error: 'Google Sheets not authorized. Please authorize in settings.',
        requires_oauth: true
      }, { status: 403 });
    }

    let result;

    switch (action) {
      case 'append_deal':
        result = await appendDealRow(accessToken, spreadsheet_id, deal_id);
        break;
      case 'update_deal':
        result = await updateDealRow(accessToken, spreadsheet_id, deal_id, data);
        break;
      case 'sync_deals':
        result = await syncAllDeals(base44, accessToken, org_id, spreadsheet_id);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error in googleSheetsSync:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function appendDealRow(accessToken, spreadsheetId, dealId) {
  // Build values row
  const values = [
    [
      dealId,
      new Date().toISOString().split('T')[0],
      'Pending',
      // Add more fields as needed
    ]
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:Z:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  const result = await response.json();

  return {
    success: response.ok,
    updates: result.updates,
    message: `Deal ${dealId} appended to sheet`
  };
}

async function updateDealRow(accessToken, spreadsheetId, dealId, data) {
  // Find and update row (simplified)
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:Z?key=${accessToken}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const sheetData = await response.json();
  const rows = sheetData.values || [];
  const dealRowIndex = rows.findIndex(row => row[0] === dealId);

  if (dealRowIndex === -1) {
    return { success: false, error: 'Deal not found in sheet' };
  }

  // Update specific cells
  const rangeNotation = `Sheet1!B${dealRowIndex + 1}:Z${dealRowIndex + 1}`;
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeNotation}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[data.stage, data.loan_amount, data.interest_rate, data.ltv, data.dscr]]
      })
    }
  );

  return {
    success: updateResponse.ok,
    message: `Deal ${dealId} updated in sheet`
  };
}

async function syncAllDeals(base44, accessToken, org_id, spreadsheetId) {
  // Fetch all active deals
  const deals = await base44.asServiceRole.entities.Deal.filter({
    org_id,
    is_deleted: false
  });

  // Build batch update
  const values = deals.map((deal, idx) => [
    deal.id,
    deal.deal_number,
    deal.loan_product,
    deal.stage,
    deal.loan_amount,
    deal.interest_rate,
    deal.ltv,
    deal.dscr,
    new Date(deal.updated_date).toISOString().split('T')[0]
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:I?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  return {
    success: response.ok,
    deals_synced: deals.length,
    message: `${deals.length} deals synced to Google Sheets`
  };
}