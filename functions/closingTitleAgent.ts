import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, vendor_id, wire_reference } = body;

    if (action === 'order_title') {
      if (!deal_id || !vendor_id) return Response.json({ error: 'deal_id and vendor_id required' }, { status: 400 });

      return Response.json({
        order_id: crypto.randomUUID(),
        deal_id,
        vendor_id,
        status: 'pending_prelim_report',
        created_at: new Date().toISOString()
      });
    }

    if (action === 'prepare_closing_package') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      return Response.json({
        package_id: crypto.randomUUID(),
        deal_id,
        documents: ['Note', 'Mortgage', 'Disclosure', 'eSign Envelope'],
        status: 'ready_for_esign'
      });
    }

    if (action === 'confirm_wire') {
      if (!deal_id || !wire_reference) return Response.json({ error: 'deal_id and wire_reference required' }, { status: 400 });

      return Response.json({
        deal_id,
        wire_reference,
        status: 'verified',
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});