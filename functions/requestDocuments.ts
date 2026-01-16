import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const dealId = body.deal_id;
    const requirement_ids = body.requirement_ids || body.document_types || [];
    const due_at = body.due_at || body.due_date;
    const instructions_text = body.instructions_text || body.instructions;
    const visible_to_borrower = body.visible_to_borrower !== false;
    const notify = body.notify !== false;

    if (!dealId) {
      return Response.json({
        error: 'Missing deal_id'
      }, { status: 400 });
    }

    // If document_types provided instead of requirement_ids, create requirements
    if (body.document_types && Array.isArray(body.document_types)) {
      const deal = await base44.asServiceRole.entities.Deal.get(dealId);
      for (const docType of body.document_types) {
        const newReq = await base44.asServiceRole.entities.DealDocumentRequirement.create({
          org_id: deal.org_id || 'default',
          deal_id: dealId,
          document_type: docType,
          display_name: docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'requested',
          is_required: true,
          is_visible_to_borrower: visible_to_borrower,
          requested_at: new Date().toISOString(),
          due_date: due_at
        });
        requirement_ids.push(newReq.id);
      }
    }

    if (requirement_ids.length === 0) {
      return Response.json({
        error: 'No requirement_ids or document_types provided'
      }, { status: 400 });
    }

    let updated_count = 0;
    let created_conditions = 0;

    for (const reqId of requirement_ids) {
      // Update requirement
      await base44.asServiceRole.entities.DealDocumentRequirement.update(reqId, {
        status: 'requested',
        requested_at: new Date().toISOString(),
        due_at,
        instructions_text,
        visible_to_borrower
      });

      // Create or update condition
      const conditions = await base44.asServiceRole.entities.Condition.filter({
        document_requirement_id: reqId
      });

      if (conditions.length === 0) {
        await base44.asServiceRole.entities.Condition.create({
          org_id: user.org_id || 'default',
          deal_id: dealId,
          document_requirement_id: reqId,
          title: `Condition for requirement`,
          description: instructions_text,
          condition_type: 'PTD',
          status: 'requested',
          due_at
        });
        created_conditions++;
      } else {
        await base44.asServiceRole.entities.Condition.update(conditions[0].id, {
          status: 'requested',
          due_at
        });
      }

      updated_count++;
    }

    // Send notification to borrower if enabled
    if (notify) {
      const deal = await base44.asServiceRole.entities.Deal.get(dealId);
      const borrowers = await base44.asServiceRole.entities.Borrower.filter({ deal_id: dealId });

      if (borrowers.length > 0) {
        const borrower = borrowers[0];
        await base44.asServiceRole.entities.Communication.create({
          org_id: user.org_id || 'default',
          deal_id: dealId,
          channel: 'Email',
          direction: 'Outbound',
          from_address: 'noreply@loangenius.local',
          to_address: borrower.email,
          subject: 'Documents Requested - Your Loan Application',
          body: `We need the following documents to move forward: ${requirement_ids.length} items. Please visit your portal to upload.`,
          status: 'Queued'
        });

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          org_id: user.org_id || 'default',
          deal_id: dealId,
          borrower_id: borrower.id,
          activity_type: 'DOCUMENT_UPLOADED',
          description: `LO requested ${requirement_ids.length} documents`,
          source: 'admin',
          metadata: { requirement_ids }
        });
      }
    }

    return Response.json({
      created_count: 0,
      updated_count,
      created_conditions
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});