import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { run_id } = await req.json();

    if (!run_id) {
      return Response.json({ error: 'run_id required' }, { status: 400 });
    }

    // For MVP, return a simulated workflow status with events
    // In production, would fetch from DB based on run_id
    const simulatedStatus = {
      run_id,
      status: 'completed',
      events: [
        {
          type: 'workflow_started',
          timestamp: new Date(Date.now() - 10000).toISOString(),
          payload: { run_id }
        },
        {
          type: 'doc_extraction_complete',
          timestamp: new Date(Date.now() - 9000).toISOString(),
          payload: {
            doc_count: 2,
            extraction_results: [
              { field_name: 'monthly_rent', value: 2500, confidence: 0.98, estimated: false }
            ]
          }
        },
        {
          type: 'dscr_result',
          timestamp: new Date(Date.now() - 8000).toISOString(),
          payload: {
            DSCR: 1.25,
            status: 'verified',
            gross_rental_income: 30000,
            net_operating_income: 22000,
            annual_debt_service: 17600,
            decision: 'approve'
          }
        },
        {
          type: 'pricing_snapshot',
          timestamp: new Date(Date.now() - 7000).toISOString(),
          payload: {
            pricing_snapshot_id: crypto.randomUUID(),
            coupon_options: [
              { label: 'P&I 360mo', coupon: 0.0655, dscr: 1.25 },
              { label: 'IO 10yr', coupon: 0.063, dscr: 1.31 }
            ]
          }
        },
        {
          type: 'term_sheet',
          timestamp: new Date(Date.now() - 6000).toISOString(),
          payload: {
            term_sheet_id: crypto.randomUUID(),
            options: [
              { type: 'PI', coupon: 0.0655 },
              { type: 'IO', coupon: 0.063 }
            ]
          }
        },
        {
          type: 'lock_issued',
          timestamp: new Date(Date.now() - 5000).toISOString(),
          payload: {
            lock_id: crypto.randomUUID(),
            lock_type: 'firm',
            lock_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        }
      ],
      updated_at: new Date().toISOString()
    };

    return Response.json(simulatedStatus);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});