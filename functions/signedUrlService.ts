/**
 * Signed URL service for secure file access
 * Uses Base44's built-in signed URL service
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// HTTP handler
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { file_key, file_uri, action = 'download', expires_in = 300 } = body;

    const uri = file_uri || file_key;
    if (!uri) {
      return Response.json({ error: 'Missing file_key or file_uri' }, { status: 400 });
    }

    // Use Base44's built-in signed URL service
    const result = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: uri,
      expires_in: expires_in
    });

    return Response.json({
      success: true,
      signed_url: result.signed_url,
      expires_in,
      action
    });
  } catch (error) {
    console.error('Error in signedUrlService:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});