import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, broker_id, deal_id, filters = {} } = body;

    if (action === 'get_rate_sheet') {
      if (!broker_id) return Response.json({ error: 'broker_id required' }, { status: 400 });

      // Simulate broker rate card
      const rateCard = [
        {
          dscr_band: '1.25+',
          pi_coupon: 0.064,
          io_coupon: 0.062,
          origination_fee: '0.75%'
        },
        {
          dscr_band: '1.10-1.24',
          pi_coupon: 0.0655,
          io_coupon: 0.0635,
          origination_fee: '0.85%'
        },
        {
          dscr_band: '1.00-1.09',
          pi_coupon: 0.067,
          io_coupon: 'N/A',
          origination_fee: '1.0%'
        }
      ];

      return Response.json({
        broker_id,
        rate_card: rateCard,
        effective_date: new Date().toISOString(),
        disclosures: ['Anti-steering', 'Loan Estimate', 'Closing Disclosure']
      });
    }

    if (action === 'create_broker_term_sheet') {
      if (!broker_id || !deal_id) return Response.json({ error: 'broker_id and deal_id required' }, { status: 400 });

      return Response.json({
        term_sheet_id: crypto.randomUUID(),
        broker_id,
        deal_id,
        white_label: true,
        created_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});