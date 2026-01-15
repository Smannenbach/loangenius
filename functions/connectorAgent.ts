import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { provider, method, payload, idempotency_key, sandbox_mode = true } = body;

    if (!provider || !method || !idempotency_key) {
      return Response.json({ error: 'provider, method, and idempotency_key required' }, { status: 400 });
    }

    // MARKET RENT provider (Zillow/Rentometer fallback)
    if (provider === 'market_rent') {
      if (method === 'estimate_rent') {
        // Simulate market rent lookup
        const address = payload.address || 'Unknown';
        const propertyType = payload.property_type || 'SFR';
        const units = payload.units || 1;

        let marketRent = 0;
        if (propertyType === 'SFR' && units === 1) {
          marketRent = 2300; // ~$2300/mo for SFR
        } else if (propertyType === '2-4 unit') {
          marketRent = 1300 * units; // $1300/unit
        }

        return Response.json({
          status: 'success',
          data: {
            address,
            market_rent: marketRent,
            confidence: 0.68,
            estimated: true,
            source: 'market_estimate'
          },
          code: 'MARKET_RENT_SUCCESS',
          retry_eligible: false
        });
      }
    }

    // PLAID provider (bank verification sandbox)
    if (provider === 'plaid') {
      if (method === 'verify_account') {
        // Simulate Plaid account verification
        const accountName = payload.account_holder || 'Test Account';

        // Mock sandbox mode
        if (sandbox_mode) {
          return Response.json({
            status: 'success',
            data: {
              account_id: 'account_' + crypto.randomUUID(),
              account_holder: accountName,
              account_type: 'checking',
              verified: true,
              last_4: '1234'
            },
            code: 'PLAID_VERIFIED',
            retry_eligible: false
          });
        }
      } else if (method === 'get_transactions') {
        // Simulate fetching transactions
        const transactions = payload.months || 3;
        const mockTransactions = [
          { date: '2025-01-01', description: 'Rent Deposit', amount: 2500, type: 'credit' },
          { date: '2025-01-01', description: 'Utilities', amount: 150, type: 'debit' },
          { date: '2025-02-01', description: 'Rent Deposit', amount: 2500, type: 'credit' },
          { date: '2025-02-01', description: 'Utilities', amount: 155, type: 'debit' },
          { date: '2025-03-01', description: 'Rent Deposit', amount: 2500, type: 'credit' }
        ];

        return Response.json({
          status: 'success',
          data: {
            transactions: mockTransactions.slice(0, transactions * 2),
            recurring_deposits: [
              { amount: 2500, frequency: 'monthly', confidence: 0.95 }
            ]
          },
          code: 'PLAID_TRANSACTIONS_SUCCESS',
          retry_eligible: false
        });
      }
    }

    // OFAC provider (sanctions screening sandbox)
    if (provider === 'ofac') {
      if (method === 'screen') {
        const borrowerName = payload.borrower_name || 'John Doe';

        // Simulate OFAC screening
        const isBlocked = borrowerName.toLowerCase().includes('evil') || borrowerName.toLowerCase().includes('fraud');

        return Response.json({
          status: 'success',
          data: {
            borrower_name: borrowerName,
            match_found: isBlocked,
            matches: isBlocked ? [
              { name: borrowerName, score: 0.98, list: 'SDN' }
            ] : [],
            recommendation: isBlocked ? 'BLOCK' : 'CLEAR'
          },
          code: 'OFAC_SCREENED',
          retry_eligible: false
        });
      }
    }

    return Response.json({
      error: 'Unknown provider or method',
      status: 'failed',
      code: 'UNKNOWN_PROVIDER'
    }, { status: 400 });
  } catch (error) {
    return Response.json({
      status: 'failed',
      error: error.message,
      code: 'CONNECTOR_ERROR',
      retry_eligible: true
    }, { status: 500 });
  }
});