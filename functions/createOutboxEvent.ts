/**
 * Helper to create outbox events from CRUD operations
 * Call this after creating/updating any business-critical entity
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function createOutboxEventHelper(base44, orgId, eventType, aggregateType, aggregateId, payload) {
  try {
    await base44.asServiceRole.entities.OutboxEvent.create({
      org_id: orgId,
      event_type: eventType,
      aggregate_type: aggregateType,
      aggregate_id: aggregateId,
      payload,
      status: 'pending',
    });
  } catch (error) {
    console.error('Failed to create outbox event:', error);
  }
}

// HTTP handler
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { event_type, aggregate_type, aggregate_id, payload } = body;

    if (!event_type) {
      return Response.json({ error: 'Missing event_type' }, { status: 400 });
    }

    // Get org_id from membership
    let org_id = body.org_id;
    if (!org_id) {
      try {
        const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
          user_id: user.email
        });
        if (memberships.length > 0) {
          org_id = memberships[0].org_id;
        }
      } catch (e) {
        org_id = 'default';
      }
    }

    await createOutboxEventHelper(
      base44,
      org_id,
      event_type,
      aggregate_type || 'unknown',
      aggregate_id || 'unknown',
      payload || {}
    );

    return Response.json({
      success: true,
      event_type,
      message: 'Outbox event created'
    });
  } catch (error) {
    console.error('Error in createOutboxEvent:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});