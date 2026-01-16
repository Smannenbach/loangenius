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

    // Handle both FormData and JSON payloads
    const contentType = req.headers.get('content-type') || '';
    let file;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file');
    } else {
      // Handle raw file upload or base64
      const body = await req.json().catch(() => null);
      if (body?.file) {
        file = body.file;
      }
    }

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to array buffer if it's a File object
    let fileData;
    if (file instanceof File || file.arrayBuffer) {
      fileData = await file.arrayBuffer();
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      // Handle base64 data URL
      const base64Data = file.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    } else {
      fileData = file;
    }

    // Upload file using Base44 integration
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: fileData,
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