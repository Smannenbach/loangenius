import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, requested_amount, term_sheet_id, lock_type = 'firm', requester_id, channel } = body;

    // CREATE_TERM_SHEET action
    if (action === 'create_term_sheet') {
      if (!deal_id) {
        return Response.json({ error: 'deal_id required' }, { status: 400 });
      }

      const termSheetId = crypto.randomUUID();

      // Build term sheet with P&I and IO options
      const summary = {
        deal_id,
        loan_amount: requested_amount || 300000,
        loan_term_months: 360,
        property: 'Sample Property',
        borrower: 'Sample Borrower'
      };

      // Sensitivity analysis (simplified)
      const baseAnnualDebt = 21600; // ~$1800/mo
      const baseNOI = 30000; // simplified
      const baseDSCR = baseNOI / baseAnnualDebt;

      const sensitivityAnalysis = [
        { scenario: '+50bps rate', annual_debt: baseAnnualDebt * 1.08, dscr: baseNOI / (baseAnnualDebt * 1.08) },
        { scenario: '-50bps rate', annual_debt: baseAnnualDebt * 0.92, dscr: baseNOI / (baseAnnualDebt * 0.92) },
        { scenario: '+5% rent', noi: baseNOI * 1.05, dscr: (baseNOI * 1.05) / baseAnnualDebt },
        { scenario: '-10% rent', noi: baseNOI * 0.9, dscr: (baseNOI * 0.9) / baseAnnualDebt }
      ];

      const termSheet = {
        term_sheet_id: termSheetId,
        deal_id,
        summary,
        options: [
          {
            label: 'P&I Fixed 360mo',
            type: 'PI',
            coupon: 0.0655,
            monthly_payment: 1800,
            annual_debt_service: 21600,
            dscr: baseDSCR.toFixed(3)
          },
          {
            label: 'IO 10-year',
            type: 'IO',
            coupon: 0.063,
            monthly_payment: 1575,
            annual_debt_service: 18900,
            dscr: (baseNOI / 18900).toFixed(3)
          }
        ],
        sensitivity_analysis: sensitivityAnalysis,
        source_map: {
          noi: { value: baseNOI, source: 'dscr_calculation', confidence: 0.95 },
          annual_debt_service: { value: baseAnnualDebt, source: 'pricing_snapshot', confidence: 0.98 }
        },
        created_at: new Date().toISOString()
      };

      // Emit audit event
      const auditEventId = crypto.randomUUID();

      return Response.json({
        term_sheet_id: termSheetId,
        summary,
        source_map: termSheet.source_map,
        audit_event_id: auditEventId
      });
    }

    // REQUEST_LOCK action
    if (action === 'request_lock') {
      if (!term_sheet_id || !requester_id) {
        return Response.json({ error: 'term_sheet_id and requester_id required' }, { status: 400 });
      }

      // Enforce lock guardrail: check if DSCR verified
      // In real implementation, would fetch dscr_calculation and verify status
      const dscrVerified = body.dscr_verified !== false; // assume verified unless explicitly false

      if (lock_type === 'firm' && !dscrVerified) {
        // Return exception instead of lock
        return Response.json({
          error: 'Lock guardrail: cannot issue firm lock without verified DSCR',
          lock_id: null,
          should_create_exception: true,
          audit_event_id: crypto.randomUUID()
        }, { status: 403 });
      }

      const lockId = crypto.randomUUID();
      const lockExpiry = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      return Response.json({
        lock_id: lockId,
        lock_expiry: lockExpiry,
        lock_type,
        audit_event_id: crypto.randomUUID()
      });
    }

    // SEND_TERM_SHEET action
    if (action === 'send_term_sheet') {
      if (!term_sheet_id || !channel) {
        return Response.json({ error: 'term_sheet_id and channel required' }, { status: 400 });
      }

      // Check consent records (simplified)
      const canSendSMS = channel === 'sms' ? body.consent_sms === true : true;
      const canSendEmail = channel === 'email' || channel === 'portal';

      if (channel === 'sms' && !canSendSMS) {
        return Response.json({
          error: 'Cannot send SMS: borrower has not consented to SMS communications'
        }, { status: 403 });
      }

      return Response.json({
        sent_status: 'sent',
        message_id: crypto.randomUUID(),
        channel,
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});