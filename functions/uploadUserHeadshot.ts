import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Upload user headshot photo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file using Base44 integration
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: await file.arrayBuffer(),
    });

    // Update user record
    await base44.auth.updateMe({
      headshot_url: file_url,
    });

    return Response.json({ 
      success: true,
      url: file_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});