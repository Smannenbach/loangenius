import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper function to get presigned URL for upload
async function handlePresignUpload(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, requirementId, fileName, mimeType, fileSize } = await req.json();

    // Validate session
    const sessionResponse = await base44.functions.invoke('portalAuth', {
      action: 'getSession',
      sessionId,
    });

    const session = sessionResponse.data;
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get requirement to verify access
    const requirement = await base44.entities.DealDocumentRequirement.filter({
      id: requirementId,
      deal_id: session.dealId,
      org_id: session.orgId,
    });

    if (!requirement || requirement.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    // Generate upload key and URL (simplified - in production use S3 presigned URLs)
    const uploadKey = `portals/${session.orgId}/${session.dealId}/${Date.now()}-${fileName}`;
    const uploadUrl = `https://storage.example.com/upload?key=${uploadKey}`;

    return Response.json({
      uploadUrl,
      uploadKey,
      fileSize,
      mimeType,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to complete upload
async function handleCompleteUpload(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, requirementId, uploadKey, fileName, mimeType } = await req.json();

    // Validate session
    const sessionResponse = await base44.functions.invoke('portalAuth', {
      action: 'getSession',
      sessionId,
    });

    const session = sessionResponse.data;
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Create document record
    const document = await base44.entities.Document.create({
      org_id: session.orgId,
      deal_id: session.dealId,
      borrower_id: session.borrowerId,
      document_requirement_id: requirementId,
      document_type: 'uploaded_document',
      source: 'uploaded',
      file_key: uploadKey,
      file_name: fileName,
      mime_type: mimeType,
      status: 'uploaded',
    });

    // Update requirement status
    await base44.entities.DealDocumentRequirement.update(requirementId, {
      status: 'uploaded',
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      org_id: session.orgId,
      deal_id: session.dealId,
      borrower_id: session.borrowerId,
      activity_type: 'DOCUMENT_UPLOADED',
      description: `Borrower uploaded document: ${fileName}`,
      source: 'portal',
    });

    return Response.json({
      document_id: document.id,
      status: 'uploaded',
      fileName,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;

  if (req.method === 'POST' && path === '/functions/documentPresignUpload') {
    return handlePresignUpload(req);
  }
  if (req.method === 'POST' && path === '/functions/documentCompleteUpload') {
    return handleCompleteUpload(req);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
});