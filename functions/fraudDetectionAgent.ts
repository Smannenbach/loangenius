import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, borrower_id, documents = [] } = body;

    if (action === 'run_kyc') {
      if (!borrower_id) return Response.json({ error: 'borrower_id required' }, { status: 400 });

      // Simulate KYC check
      return Response.json({
        kyc_status: 'passed',
        borrower_id,
        verified_at: new Date().toISOString()
      });
    }

    if (action === 'run_rent_fraud_checks') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      const flags = [];

      // Check for round deposits
      documents.forEach(doc => {
        if (doc.type === 'bank_statement' && doc.deposits) {
          doc.deposits.forEach(amt => {
            if (amt % 500 === 0 && amt > 3000) {
              flags.push(`Suspicious round deposit: $${amt}`);
            }
          });
        }
      });

      // Check for duplicate tenant names
      const rentRoll = documents.find(d => d.type === 'rent_roll');
      if (rentRoll?.rows) {
        const names = rentRoll.rows.map(r => r.tenant_name);
        const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
        if (duplicates.length > 0) {
          flags.push(`Duplicate tenant names detected: ${duplicates.join(', ')}`);
        }
      }

      return Response.json({
        fraud_case_id: flags.length > 0 ? crypto.randomUUID() : null,
        flags,
        risk_level: flags.length > 2 ? 'high' : flags.length > 0 ? 'medium' : 'low'
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});