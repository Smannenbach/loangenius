import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Portal document operations: list, upload, download
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, action, requirementId, fileName, mimeType, fileSize } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Validate session
    const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Session invalid' }, { status: 401 });
    }

    if (action === 'listDocuments') {
      // Get all documents for the deal
      const documents = await base44.asServiceRole.entities.Document.filter({
        deal_id: session.deal_id,
      });

      return Response.json({
        success: true,
        documents: documents.map(d => ({
          id: d.id,
          file_name: d.file_name,
          status: d.status,
          created_date: d.created_date,
          size_bytes: d.size_bytes,
          mime_type: d.mime_type,
        })),
      });
    }

    if (action === 'completeUpload') {
      if (!requirementId || !fileName) {
        return Response.json({ error: 'Missing requirementId or fileName' }, { status: 400 });
      }

      // Get requirement
      const requirement = await base44.asServiceRole.entities.DealDocumentRequirement.get(requirementId);
      if (!requirement) {
        return Response.json({ error: 'Requirement not found' }, { status: 404 });
      }

      // Verify requirement belongs to this deal
      if (requirement.deal_id !== session.deal_id) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Upload file using Base44 integration
      const fileBuffer = await req.text(); // Would need actual file handling
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: fileBuffer,
      });

      // Create document record
      const document = await base44.asServiceRole.entities.Document.create({
        org_id: session.org_id,
        deal_id: session.deal_id,
        borrower_id: session.borrower_id,
        document_requirement_id: requirementId,
        document_type: requirement.document_type,
        source: 'uploaded',
        file_key: file_url,
        file_name: fileName,
        mime_type: mimeType || 'application/octet-stream',
        size_bytes: fileSize || 0,
        status: 'uploaded',
      });

      // Update requirement status
      await base44.asServiceRole.entities.DealDocumentRequirement.update(requirementId, {
        status: 'uploaded',
      });

      // Log activity
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: session.org_id,
        deal_id: session.deal_id,
        borrower_id: session.borrower_id,
        activity_type: 'DOCUMENT_UPLOADED',
        description: `Borrower uploaded ${fileName} for ${requirement.display_name}`,
        source: 'portal',
      });

      // Update last accessed
      await base44.asServiceRole.entities.PortalSession.update(sessionId, {
        last_accessed_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        document_id: document.id,
        file_url,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal documents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});