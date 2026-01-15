import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, borrower_id, authorization, sandbox_mode = true } = body;

    if (action === 'pull_credit') {
      if (!borrower_id) return Response.json({ error: 'borrower_id required' }, { status: 400 });

      // Simulate tri-merge credit pull
      const equifax = 715 + Math.floor(Math.random() * 40);
      const experian = 720 + Math.floor(Math.random() * 35);
      const transunion = 710 + Math.floor(Math.random() * 45);

      const scores = [equifax, experian, transunion];
      const middleScore = scores.sort((a, b) => a - b)[1];

      const creditTier = middleScore >= 740 ? 'A' : middleScore >= 720 ? 'B' : middleScore >= 700 ? 'C' : 'D';

      return Response.json({
        report_id: crypto.randomUUID(),
        borrower_id,
        equifax_score: equifax,
        experian_score: experian,
        transunion_score: transunion,
        middle_score: middleScore,
        credit_tier: creditTier,
        pull_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        aus_response: {
          recommendation: middleScore >= 700 ? 'Approve' : 'Conditional',
          tier: creditTier
        }
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});