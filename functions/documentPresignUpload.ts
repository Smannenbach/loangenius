/**
 * Document Presign Upload - Generate presigned URL for document uploads
 * Uses Base44's built-in file upload integration for secure storage
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requirement_id, file_name, mime_type, size_bytes, file } = await req.json();

    if (!requirement_id || !file_name || !mime_type || !size_bytes) {
      return Response.json({
        error: 'Missing required fields: requirement_id, file_name, mime_type, size_bytes'
      }, { status: 400 });
    }

    // Validate file size (max 50MB)
    if (size_bytes > 50 * 1024 * 1024) {
      return Response.json({ error: 'File exceeds 50MB limit' }, { status: 413 });
    }

    // Validate mime type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!allowedMimeTypes.includes(mime_type)) {
      return Response.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Get requirement to verify access + get deal_id
    const requirements = await base44.entities.DealDocumentRequirement.filter({
      id: requirement_id
    });

    if (requirements.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const requirement = requirements[0];

    // Generate unique file key for tracking
    const fileKey = `docs/${requirement.deal_id}/${requirement_id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file_name}`;

    // FIX: Use Base44's private file upload for secure storage with signed URLs
    // If file data is provided, upload directly
    if (file) {
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
      
      return Response.json({
        success: true,
        file_uri: uploadResult.file_uri,
        file_key: fileKey,
        storage_type: 'private',
        expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      });
    }

    // For client-side uploads, return instructions for using the upload endpoint
    // The client should use Base44's Core.UploadFile or UploadPrivateFile integration
    return Response.json({
      success: true,
      file_key: fileKey,
      upload_method: 'base44_integration',
      instructions: 'Use base44.integrations.Core.UploadPrivateFile({ file }) to upload the file, then call documentCompleteUpload with the file_uri',
      requirement_id: requirement_id,
      deal_id: requirement.deal_id,
      expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('documentPresignUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});