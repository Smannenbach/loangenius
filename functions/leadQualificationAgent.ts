import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, lead_id, credit_score = 700, dscr = 1.15, down_payment_pct = 20, properties_owned = 1 } = body;

    if (action === 'score_lead') {
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

      let score = 0;

      // Credit scoring
      if (credit_score >= 740) score += 25;
      else if (credit_score >= 720) score += 22;
      else if (credit_score >= 700) score += 18;
      else if (credit_score >= 680) score += 14;

      // DSCR scoring
      if (dscr >= 1.25) score += 25;
      else if (dscr >= 1.10) score += 20;
      else if (dscr >= 1.0) score += 15;

      // Down payment scoring
      if (down_payment_pct >= 30) score += 20;
      else if (down_payment_pct >= 25) score += 17;
      else if (down_payment_pct >= 20) score += 14;

      // Experience scoring
      if (properties_owned >= 5) score += 15;
      else if (properties_owned >= 3) score += 12;
      else if (properties_owned >= 1) score += 8;

      const bucket = score >= 80 ? 'HOT' : score >= 60 ? 'WARM' : score >= 40 ? 'NURTURE' : 'COLD';

      return Response.json({
        lead_id,
        score,
        bucket,
        reasoning: [
          `Credit score: ${credit_score}`,
          `DSCR: ${dscr}`,
          `Down payment: ${down_payment_pct}%`,
          `Properties owned: ${properties_owned}`
        ]
      });
    }

    if (action === 'route_lead') {
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

      return Response.json({
        lead_id,
        assigned_to_user_id: 'LO-' + Math.floor(Math.random() * 10),
        routing_strategy: 'round_robin_by_load',
        assigned_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});