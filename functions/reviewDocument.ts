import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'PATCH') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const documentId = url.pathname.split('/')[3];
    const { status, reviewer_notes } = await req.json();

    if (!documentId || !['approved', 'rejected'].includes(status)) {
      return Response.json({
        error: 'Missing document ID or invalid status'
      }, { status: 400 });
    }

    // Get document
    const doc = await base44.asServiceRole.entities.Document.get(documentId);
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update document
    await base44.asServiceRole.entities.Document.update(documentId, {
      status,
      metadata_json: {
        ...doc.metadata_json,
        reviewer_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      }
    });

    // Update related requirement
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      id: doc.document_requirement_id
    });

    if (requirements.length > 0) {
      const requirement = requirements[0];
      let newReqStatus = 'uploaded';

      if (status === 'approved') {
        newReqStatus = 'approved';
      } else if (status === 'rejected') {
        newReqStatus = 'rejected';
      }

      await base44.asServiceRole.entities.DealDocumentRequirement.update(requirement.id, {
        status: newReqStatus,
        reviewer_notes
      });

      // Update related condition
      const conditions = await base44.asServiceRole.entities.Condition.filter({
        document_requirement_id: requirement.id
      });

      if (conditions.length > 0) {
        const conditionStatus = status === 'approved' ? 'approved' : 'requested';
        await base44.asServiceRole.entities.Condition.update(conditions[0].id, {
          status: conditionStatus,
          resolved_at: status === 'approved' ? new Date().toISOString() : null
        });
      }
    }

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id || 'default',
      user_id: user.id,
      action_type: 'Update',
      entity_type: 'Document',
      entity_id: documentId,
      parent_entity_type: 'Deal',
      parent_entity_id: doc.deal_id,
      description: `Document ${status}: ${doc.file_name}`,
      severity: 'Info'
    });

    return Response.json({
      document_id: documentId,
      status,
      reviewer_notes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});