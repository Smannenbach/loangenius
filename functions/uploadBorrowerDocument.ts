import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, requirement_id, file_url, file_name, notes } = await req.json();
    
    if (!deal_id || !requirement_id || !file_url) {
      return Response.json({ 
        error: 'deal_id, requirement_id, and file_url are required' 
      }, { status: 400 });
    }

    // Get the requirement
    const requirement = await base44.entities.DealDocumentRequirement.get(requirement_id);
    
    if (!requirement) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    // Create document record
    const document = await base44.entities.Document.create({
      org_id: requirement.org_id,
      deal_id,
      name: requirement.requirement_name,
      file_name,
      file_url,
      category: requirement.category,
      document_type: requirement.requirement_type,
      status: 'uploaded',
      source: 'borrower_upload',
      uploaded_by: user.email,
      notes: notes || '',
      is_required: requirement.is_required
    });

    // Update requirement status and link document
    await base44.entities.DealDocumentRequirement.update(requirement_id, {
      status: 'uploaded',
      document_id: document.id
    });

    // Log activity
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: requirement.org_id,
        deal_id,
        activity_type: 'document_uploaded',
        title: `${requirement.requirement_name} uploaded`,
        description: `Borrower uploaded ${requirement.requirement_name}`,
        created_by: user.email
      });
    } catch (e) {
      console.log('Activity log failed (non-critical):', e.message);
    }

    return Response.json({
      success: true,
      document,
      requirement: {
        ...requirement,
        status: 'uploaded',
        document_id: document.id
      }
    });

  } catch (error) {
    console.error('Error uploading borrower document:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});