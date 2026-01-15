import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, documents = [] } = body;

    if (action === 'get_document_status') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      const requiredDocs = ['lease', 'rent_roll', 'schedule_e', 'bank_statement', 'property_tax', 'insurance_quote'];
      const checklist = requiredDocs.map(docType => ({
        document_type: docType,
        status: documents.some(d => d.type === docType) ? 'received' : 'pending',
        received_at: documents.find(d => d.type === docType)?.received_at || null
      }));

      const completionPct = (checklist.filter(c => c.status === 'received').length / checklist.length) * 100;

      return Response.json({
        deal_id,
        checklist,
        completion_percentage: Math.round(completionPct)
      });
    }

    if (action === 'run_presubmission_check') {
      if (!deal_id) return Response.json({ error: 'deal_id required' }, { status: 400 });

      const missingItems = [];
      const requiredForDSCR = ['lease', 'rent_roll', 'schedule_e', 'bank_statement'];

      requiredForDSCR.forEach(doc => {
        if (!documents.some(d => d.type === doc)) {
          missingItems.push(`Missing required document: ${doc}`);
        }
      });

      return Response.json({
        ready: missingItems.length === 0,
        missing_items: missingItems,
        checked_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});