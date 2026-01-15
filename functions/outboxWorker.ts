/**
 * Outbox Worker - processes pending events and publishes to external systems
 * Should run on a schedule (every 5 minutes)
 * Handles retries, dead-letter, and idempotency
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run outbox worker
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all pending events
    const pendingEvents = await base44.asServiceRole.entities.OutboxEvent.filter({
      status: 'pending',
    });

    let processedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      try {
        // Attempt to publish event (webhook, email, etc.)
        // This is a placeholder - integrate with actual webhook dispatcher
        await publishEvent(base44, event);

        // Mark as published
        await base44.asServiceRole.entities.OutboxEvent.update(event.id, {
          status: 'published',
          published_at: new Date().toISOString(),
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to publish event ${event.id}:`, error);

        // Increment retry count
        const newRetryCount = (event.retry_count || 0) + 1;
        const maxRetries = 5;

        if (newRetryCount >= maxRetries) {
          // Move to dead-letter
          await base44.asServiceRole.entities.OutboxEvent.update(event.id, {
            status: 'failed',
            retry_count: newRetryCount,
            error_message: error.message,
          });
        } else {
          // Keep pending for retry
          await base44.asServiceRole.entities.OutboxEvent.update(event.id, {
            retry_count: newRetryCount,
            error_message: error.message,
          });
        }

        failedCount++;
      }
    }

    return Response.json({
      success: true,
      processed: processedCount,
      failed: failedCount,
      total: pendingEvents.length,
    });
  } catch (error) {
    console.error('Outbox worker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Placeholder for publishing events to external systems
 * In production, route to Zapier, email, SMS, webhooks, etc.
 */
async function publishEvent(base44, event) {
  // Example: route by event type
  if (event.event_type.startsWith('deal.')) {
    // Call deal webhook handlers
  } else if (event.event_type.startsWith('borrower.')) {
    // Call borrower webhook handlers
  }

  // For now, just acknowledge
  console.log(`Published event: ${event.event_type} for ${event.aggregate_type}/${event.aggregate_id}`);
}