/**
 * Helper to create outbox events from CRUD operations
 * Call this after creating/updating any business-critical entity
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function createOutboxEvent(base44, orgId, eventType, aggregateType, aggregateId, payload) {
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
    // Don't throw - outbox failure should not block the primary operation
    // But log for monitoring
  }
}