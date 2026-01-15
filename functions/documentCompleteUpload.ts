import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const { requirement_id, file_key, file_name, mime_type, size_bytes, hash_sha256 } = await req.json();

    if (!requirement_id || !file_key || !file_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get requirement and deal
    const requirements = await base44.entities.DealDocumentRequirement.filter({
      id: requirement_id
    });

    if (requirements.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const requirement = requirements[0];
    const deal = await base44.entities.Deal.get(requirement.deal_id);

    // Create document record
    const document = await base44.entities.Document.create({
      org_id: requirement.org_id,
      deal_id: requirement.deal_id,
      document_requirement_id: requirement_id,
      source: 'uploaded',
      file_key,
      file_name,
      mime_type,
      size_bytes,
      hash_sha256,
      status: 'uploaded',
      metadata_json: {}
    });

    // Update requirement status
    await base44.entities.DealDocumentRequirement.update(requirement_id, {
      status: 'uploaded'
    });

    // Create/update condition if linked
    const conditions = await base44.entities.Condition.filter({
      document_requirement_id: requirement_id
    });

    if (conditions.length > 0) {
      await base44.entities.Condition.update(conditions[0].id, {
        status: 'received'
      });
    }

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: requirement.org_id,
      user_id: user.id,
      action_type: 'Create',
      entity_type: 'Document',
      entity_id: document.id,
      parent_entity_type: 'Deal',
      parent_entity_id: requirement.deal_id,
      description: `Document uploaded: ${file_name}`,
      severity: 'Info'
    });

    // Send internal notification (mock)
    await base44.asServiceRole.entities.Notification.create({
      org_id: requirement.org_id,
      deal_id: requirement.deal_id,
      type: 'document_uploaded',
      title: 'Document Uploaded',
      message: `${file_name} uploaded for ${requirement.name}`,
      is_read: false
    });

    return Response.json({
      document_id: document.id,
      requirement_status: 'uploaded'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});