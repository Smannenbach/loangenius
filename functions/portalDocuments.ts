/**
 * Portal Documents - List/upload documents for borrower portal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, deal_id, document_id, file, file_name } = body;

    if (!deal_id) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Get deal
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    const deal = deals[0];

    if (action === 'list' || !action) {
      const documents = await base44.asServiceRole.entities.Document.filter({ deal_id: deal_id });
      
      return Response.json({
        documents: documents.map(d => ({
          id: d.id,
          name: d.document_name,
          type: d.document_type,
          status: d.status,
          uploaded_at: d.created_date,
          file_url: d.file_url,
        })),
      });
    }

    if (action === 'upload') {
      if (!file) {
        return Response.json({ error: 'Missing file' }, { status: 400 });
      }

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document
      const document = await base44.asServiceRole.entities.Document.create({
        org_id: deal.org_id,
        deal_id: deal_id,
        document_name: file_name || 'Document',
        document_type: 'borrower_upload',
        file_url: file_url,
        status: 'uploaded',
      });

      return Response.json({
        success: true,
        document_id: document.id,
        file_url: file_url,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});