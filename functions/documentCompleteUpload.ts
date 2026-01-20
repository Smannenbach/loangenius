import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Allow both authenticated users and portal sessions
    let user = null;
    let isPortalSession = false;
    
    try {
      user = await base44.auth.me();
    } catch {
      // May be a portal session without full auth
      isPortalSession = true;
    }

    const { requirement_id, file_key, file_name, mime_type, size_bytes, hash_sha256, sessionId, conditionId } = await req.json();

    if (!requirement_id || !file_key || !file_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate portal session if provided
    if (sessionId && isPortalSession) {
      const session = await base44.asServiceRole.entities.PortalSession.get(sessionId);
      if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
        return Response.json({ error: 'Session invalid' }, { status: 401 });
      }
    }

    // Get requirement and deal
    const requirements = await base44.asServiceRole.entities.DealDocumentRequirement.filter({
      id: requirement_id
    });

    if (requirements.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const requirement = requirements[0];
    const deal = await base44.asServiceRole.entities.Deal.get(requirement.deal_id);

    // Create document record
    const document = await base44.asServiceRole.entities.Document.create({
      org_id: requirement.org_id,
      deal_id: requirement.deal_id,
      document_requirement_id: requirement_id,
      source: isPortalSession ? 'portal_upload' : 'uploaded',
      file_key,
      file_name,
      mime_type,
      size_bytes,
      hash_sha256,
      status: 'uploaded',
      metadata_json: {}
    });

    // Update requirement status
    await base44.asServiceRole.entities.DealDocumentRequirement.update(requirement_id, {
      status: 'uploaded',
      document_id: document.id
    });

    // Auto-update conditions linked to this requirement
    const conditions = await base44.asServiceRole.entities.Condition.filter({
      document_requirement_id: requirement_id
    });

    if (conditions.length > 0) {
      await base44.asServiceRole.entities.Condition.update(conditions[0].id, {
        status: 'received'
      });
    }

    // If a specific condition ID was provided, update it directly
    if (conditionId) {
      try {
        await base44.asServiceRole.entities.Condition.update(conditionId, {
          status: 'received'
        });
      } catch (e) {
        console.log('Direct condition update skipped:', e.message);
      }
    }

    // Also check for conditions that match by required_documents array
    const allDealConditions = await base44.asServiceRole.entities.Condition.filter({
      deal_id: requirement.deal_id
    });
    
    for (const condition of allDealConditions) {
      if (condition.required_documents?.length > 0) {
        const docName = file_name.toLowerCase();
        const reqName = (requirement.requirement_name || '').toLowerCase();
        
        // Check if uploaded doc matches any required document
        const matchesRequired = condition.required_documents.some(reqDoc => {
          const reqDocLower = reqDoc.toLowerCase();
          return docName.includes(reqDocLower) || reqName.includes(reqDocLower);
        });
        
        if (matchesRequired && condition.status === 'pending') {
          await base44.asServiceRole.entities.Condition.update(condition.id, {
            status: 'received'
          });
        }
      }
    }

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: requirement.org_id,
      user_id: user?.id || 'portal_user',
      action_type: 'Create',
      entity_type: 'Document',
      entity_id: document.id,
      parent_entity_type: 'Deal',
      parent_entity_id: requirement.deal_id,
      description: `Document uploaded: ${file_name}`,
      severity: 'Info'
    });

    // Create portal notification
    try {
      await base44.asServiceRole.entities.PortalNotification.create({
        org_id: requirement.org_id,
        deal_id: requirement.deal_id,
        notification_type: 'status_update',
        title: 'Document Received',
        message: `Your ${requirement.requirement_name || file_name} has been uploaded and is pending review.`,
        is_read: false
      });
    } catch (e) {
      console.log('Notification creation skipped:', e.message);
    }

    return Response.json({
      document_id: document.id,
      requirement_status: 'uploaded'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});