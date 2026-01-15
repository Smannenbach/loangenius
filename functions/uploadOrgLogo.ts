import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Upload organization logo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || !user.org_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: await file.arrayBuffer(),
    });

    // Get or create OrgSettings
    let orgSettings;
    try {
      const settings = await base44.entities.OrgSettings.filter({
        org_id: user.org_id,
      });
      
      if (settings && settings.length > 0) {
        orgSettings = await base44.entities.OrgSettings.update(settings[0].id, {
          logo_url: file_url,
        });
      } else {
        orgSettings = await base44.entities.OrgSettings.create({
          org_id: user.org_id,
          logo_url: file_url,
        });
      }
    } catch (e) {
      // Entity may not exist, just return the URL
      console.log('OrgSettings update skipped:', e.message);
    }

    return Response.json({ 
      success: true,
      url: file_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});