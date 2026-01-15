import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, dscr_calc_id, dscr, credit_score = 700, loan_amount, pricing_snapshot_id, lock_type = 'firm', requester, ttl_min = 120 } = body;

    // PRICING action
    if (action === 'price') {
      if (!dscr_calc_id || dscr === undefined) {
        return Response.json({ error: 'dscr_calc_id and dscr required' }, { status: 400 });
      }

      // Pricing bands
      let baseCoupon = 0.065; // 6.5% base
      let dscrAdj = 0;
      let creditAdj = 0;

      // DSCR adjustment
      if (dscr >= 1.25) dscrAdj = -0.0015; // -15bps
      else if (dscr >= 1.10) dscrAdj = -0.001; // -10bps
      else if (dscr >= 1.0) dscrAdj = 0;
      else dscrAdj = 0.002; // +20bps

      // Credit adjustment
      if (credit_score >= 740) creditAdj = -0.002; // -20bps
      else if (credit_score >= 720) creditAdj = -0.001; // -10bps
      else if (credit_score >= 700) creditAdj = 0;
      else if (credit_score >= 680) creditAdj = 0.0025; // +25bps
      else creditAdj = 0.005; // +50bps

      const piCoupon = baseCoupon + dscrAdj + creditAdj;
      const ioCoupon = piCoupon - 0.0025; // IO typically 25bps cheaper

      const pricingSnapshot = {
        pricing_snapshot_id: crypto.randomUUID(),
        dscr_calc_id,
        coupon_options: [
          {
            label: 'P&I 360-month',
            type: 'PI',
            coupon: parseFloat(piCoupon.toFixed(4)),
            loan_amount: loan_amount || 300000,
            monthly_pi: 1800, // simplified
            annual_debt_service: 21600,
            dscr_at_coupon: dscr,
            lockable: true
          },
          {
            label: 'IO 10-year',
            type: 'IO',
            coupon: parseFloat(ioCoupon.toFixed(4)),
            loan_amount: loan_amount || 300000,
            monthly_payment: (loan_amount || 300000) * (ioCoupon / 12),
            annual_debt_service: (loan_amount || 300000) * ioCoupon,
            dscr_at_coupon: dscr >= 1.25 ? dscr : undefined, // IO requires higher DSCR
            lockable: dscr >= 1.25 // only lock IO if DSCR >= 1.25
          }
        ],
        pricing_methodology: `Base ${(baseCoupon * 100).toFixed(2)}% + DSCR adj (${(dscrAdj * 10000).toFixed(0)}bps) + Credit adj (${(creditAdj * 10000).toFixed(0)}bps)`,
        created_at: new Date().toISOString()
      };

      return Response.json(pricingSnapshot);
    }

    // LOCK action
    if (action === 'lock') {
      if (!pricing_snapshot_id || !requester) {
        return Response.json({ error: 'pricing_snapshot_id and requester required' }, { status: 400 });
      }

      // Guardrail: firm lock requires verified DSCR
      if (lock_type === 'firm' && !body.dscr_verified) {
        return Response.json({
          error: 'Guardrail violation: firm lock requires dscr_verified === true',
          suggestion: 'Use lock_type="provisional" with explicit TTL and conditions'
        }, { status: 403 });
      }

      const lockId = crypto.randomUUID();
      const lockExpiryMs = Date.now() + (ttl_min * 60 * 1000);
      const lockExpiry = new Date(lockExpiryMs).toISOString();

      const lockRecord = {
        lock_id: lockId,
        pricing_snapshot_id,
        lock_type,
        lock_expiry: lockExpiry,
        conditions: lock_type === 'provisional' ? ['Full DSCR verification required', 'Clear all conditions'] : [],
        audit_event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      return Response.json(lockRecord);
    }

    // CANCEL_LOCK action
    if (action === 'cancel_lock') {
      if (!body.lock_id) {
        return Response.json({ error: 'lock_id required' }, { status: 400 });
      }

      return Response.json({
        status: 'cancelled',
        lock_id: body.lock_id,
        reason: body.reason || 'Cancelled by system',
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});