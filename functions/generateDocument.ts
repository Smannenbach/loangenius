import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, dealId } = req.body;
    if (!type || !dealId) return Response.json({ error: 'Missing type or dealId' }, { status: 400 });

    // Fetch deal, org, and branding info
    const deal = await base44.asServiceRole.entities.Deal.get(dealId);
    if (!deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

    // For now, return placeholder PDF response
    // In production, use pdfkit or similar library
    const docContent = `Document: ${type}\nDeal: ${deal.deal_number}\nAmount: $${deal.loan_amount}`;
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(docContent);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}_${dealId}.pdf"`
      }
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});