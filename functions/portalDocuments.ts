import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get portal documents for borrower
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, loanFileId, sessionId } = await req.json();

    if (action === 'getDocuments') {
      if (!loanFileId || !sessionId) {
        return Response.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Verify session exists and is valid
      const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
      if (!session || session.is_revoked) {
        return Response.json({ error: 'Invalid session' }, { status: 401 });
      }

      if (new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Session expired' }, { status: 401 });
      }

      // Get required documents (templates)
      const templates = await base44.asServiceRole.entities.DocumentTemplate.filter({
        is_active: true,
      });

      // Get uploaded documents
      const documents = await base44.asServiceRole.entities.Document.filter({
        loan_file_id: loanFileId,
      });

      // Match documents with templates
      const documentStatus = {};
      templates.forEach((template) => {
        const uploaded = documents.filter(
          (doc) => doc.category === template.category && doc.document_type === template.document_type
        );
        documentStatus[template.id] = {
          template,
          uploaded: uploaded.length > 0 ? uploaded[0] : null,
          isRequired: template.is_required,
          status: uploaded.length > 0 ? uploaded[0].status : 'Pending',
        };
      });

      return Response.json({
        documents: documentStatus,
        uploadedCount: documents.filter((d) => d.source === 'Borrower_Upload').length,
      });
    }

    if (action === 'uploadDocument') {
      return Response.json({ error: 'Use direct file upload' }, { status: 400 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal documents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});