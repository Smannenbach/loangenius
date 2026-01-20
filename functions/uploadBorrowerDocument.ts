/**
 * Upload Borrower Document (Portal)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id, requirement_id, file, file_name, borrower_email } = body;

    if (!deal_id || !file) {
      return Response.json({ error: 'Missing deal_id or file' }, { status: 400 });
    }

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Create document record
    const deal = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    if (deal.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const document = await base44.asServiceRole.entities.Document.create({
      org_id: deal[0].org_id,
      deal_id: deal_id,
      document_name: file_name || 'Uploaded Document',
      document_type: 'borrower_upload',
      file_url: file_url,
      uploaded_by: borrower_email || 'borrower',
      status: 'uploaded',
    });

    // If linked to requirement, update it
    if (requirement_id) {
      await base44.asServiceRole.entities.DealDocumentRequirement.update(requirement_id, {
        document_id: document.id,
        status: 'uploaded',
      });
    }

    return Response.json({
      success: true,
      document_id: document.id,
      file_url: file_url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});