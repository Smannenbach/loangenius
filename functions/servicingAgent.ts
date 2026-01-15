import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, funding_amount, payment, period } = body;

    if (action === 'register_funding') {
      if (!deal_id || !funding_amount) return Response.json({ error: 'deal_id and funding_amount required' }, { status: 400 });

      return Response.json({
        servicing_record_id: crypto.randomUUID(),
        deal_id,
        funded_amount: funding_amount,
        status: 'funded',
        payment_schedule: 'monthly',
        funded_at: new Date().toISOString()
      });
    }

    if (action === 'process_payment') {
      if (!deal_id || !payment) return Response.json({ error: 'deal_id and payment required' }, { status: 400 });

      return Response.json({
        payment_id: crypto.randomUUID(),
        deal_id,
        amount: payment.amount,
        status: 'posted',
        posted_at: new Date().toISOString()
      });
    }

    if (action === 'generate_investor_remit') {
      if (!period) return Response.json({ error: 'period required' }, { status: 400 });

      return Response.json({
        remit_report_id: crypto.randomUUID(),
        period,
        total_collections: 45000,
        investor_share: 40000,
        status: 'ready_for_transmission'
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});