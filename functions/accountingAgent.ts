import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, loan_amount = 300000, fee_items = [] } = body;

    if (action === 'create_settlement_statement') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      // Calculate fees
      const originationFee = loan_amount * 0.01; // 1% origination
      const appraisalFee = 500;
      const processingFee = 750;

      const totalFees = originationFee + appraisalFee + processingFee;

      return Response.json({
        settlement_id: crypto.randomUUID(),
        deal_id,
        document: {
          loan_amount,
          fees: { origination: originationFee, appraisal: appraisalFee, processing: processingFee },
          total_fees: totalFees,
          net_to_borrower: loan_amount - totalFees
        },
        created_at: new Date().toISOString()
      });
    }

    if (action === 'generate_accounting_entries') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      return Response.json({
        deal_id,
        entries: [
          { account: 'Loans Receivable', debit: loan_amount, credit: 0 },
          { account: 'Funded Liability', debit: 0, credit: loan_amount },
          { account: 'Fee Revenue', debit: 0, credit: loan_amount * 0.01 }
        ],
        created_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});