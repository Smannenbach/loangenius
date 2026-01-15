import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validate portal session and return borrower/deal info
 */
async function validateSession(base44, sessionId) {
  const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
  if (!session) {
    throw new Error('Invalid session');
  }

  if (session.is_revoked) {
    throw new Error('Session revoked');
  }

  if (new Date(session.expires_at) < new Date()) {
    throw new Error('Session expired');
  }

  return session;
}

/**
 * Portal documents endpoint
 */
Deno.serve(async (req) => {
  try {
    if (req.method === 'GET') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const { action, sessionId } = await req.json();

    // Validate session exists and is valid
    const session = await validateSession(base44, sessionId);

    if (action === 'getRequirements') {
      // Get requirements for this deal, organized by status
      const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
        org_id: session.org_id,
        deal_id: session.deal_id,
        is_visible_to_borrower: true,
      });

      // Get documents linked to these requirements
      const documents = await base44.asServiceRole.entities.Document.filter({
        org_id: session.org_id,
        deal_id: session.deal_id,
      });

      // Group requirements by status
      const groupedByStatus = {};
      requirements.forEach((req) => {
        if (!groupedByStatus[req.status]) {
          groupedByStatus[req.status] = [];
        }
        
        const linkedDocs = documents.filter(
          (doc) => doc.requirement_id === req.id
        );

        groupedByStatus[req.status].push({
          id: req.id,
          display_name: req.display_name,
          document_type: req.document_type,
          instructions: req.instructions,
          status: req.status,
          is_required: req.is_required,
          due_date: req.due_date,
          documents: linkedDocs,
        });
      });

      return Response.json({
        requirements: groupedByStatus,
        total: requirements.length,
        completed: requirements.filter((r) => r.status === 'approved').length,
      });
    }

    if (action === 'presignUpload') {
      const { requirementId, fileName, mimeType, fileSize } = await req.json();

      if (!requirementId || !fileName || !mimeType) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Verify requirement belongs to this session's deal
      const requirement = await base44.asServiceRole.entities.DealDocumentRequirement.get(
        requirementId
      );
      if (!requirement || requirement.deal_id !== session.deal_id || requirement.org_id !== session.org_id) {
        return Response.json({ error: 'Requirement not found' }, { status: 404 });
      }

      // In production, generate signed S3/GCS URL here
      // For now, return a mock presigned URL
      const fileKey = `${session.org_id}/${session.deal_id}/${requirementId}/${Date.now()}-${fileName}`;
      const uploadUrl = `https://upload.example.com/presigned?key=${encodeURIComponent(fileKey)}`;

      return Response.json({
        uploadUrl,
        fileKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (action === 'completeUpload') {
      const { requirementId, fileKey, fileName, mimeType, fileSize, hash } = await req.json();

      if (!requirementId || !fileKey || !fileName) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Verify requirement belongs to this session's deal
      const requirement = await base44.asServiceRole.entities.DealDocumentRequirement.get(
        requirementId
      );
      if (!requirement || requirement.deal_id !== session.deal_id) {
        return Response.json({ error: 'Requirement not found' }, { status: 404 });
      }

      // Check idempotency: if a document with this fileKey already exists, return it
      const existingDocs = await base44.asServiceRole.entities.Document.filter({
        org_id: session.org_id,
        deal_id: session.deal_id,
        file_key: fileKey,
      });

      if (existingDocs.length > 0) {
        return Response.json({
          success: true,
          document: existingDocs[0],
          idempotent: true,
        });
      }

      // Create document record
      const document = await base44.asServiceRole.entities.Document.create({
        org_id: session.org_id,
        deal_id: session.deal_id,
        borrower_id: session.borrower_id,
        requirement_id: requirementId,
        document_type: requirement.document_type,
        source: 'uploaded',
        file_key: fileKey,
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: fileSize,
        hash_sha256: hash,
        status: 'uploaded',
      });

      // Update requirement status to "uploaded"
      await base44.asServiceRole.entities.DealDocumentRequirement.update(requirementId, {
        status: 'uploaded',
      });

      // Create notification for internal users
      const deal = await base44.asServiceRole.entities.Deal.get(session.deal_id);
      if (deal?.assigned_to_user_id) {
        await base44.asServiceRole.entities.CommunicationsLog.create({
          org_id: session.org_id,
          deal_id: session.deal_id,
          channel: 'in_app',
          direction: 'inbound',
          from: session.borrower_id,
          to: deal.assigned_to_user_id,
          subject: `Document Uploaded: ${requirement.display_name}`,
          body: `Borrower uploaded ${fileName} for ${requirement.display_name}`,
          status: 'delivered',
        });
      }

      return Response.json({
        success: true,
        document,
        idempotent: false,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal documents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});