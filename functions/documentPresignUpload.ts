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

    const { requirement_id, file_name, mime_type, size_bytes } = await req.json();

    if (!requirement_id || !file_name || !mime_type || !size_bytes) {
      return Response.json({
        error: 'Missing required fields: requirement_id, file_name, mime_type, size_bytes'
      }, { status: 400 });
    }

    // Validate file size (max 50MB)
    if (size_bytes > 50 * 1024 * 1024) {
      return Response.json({ error: 'File exceeds 50MB limit' }, { status: 413 });
    }

    // Get requirement to verify access + get deal_id
    const requirements = await base44.entities.DealDocumentRequirement.filter({
      id: requirement_id
    });

    if (requirements.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const requirement = requirements[0];

    // Generate unique file key
    const fileKey = `${requirement.deal_id}/${requirement_id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // Return presigned URL (mock; in production use S3/GCS SDK)
    const uploadUrl = `https://storage.example.com/upload?key=${encodeURIComponent(fileKey)}&contentType=${encodeURIComponent(mime_type)}`;

    return Response.json({
      upload_url: uploadUrl,
      file_key: fileKey,
      expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});