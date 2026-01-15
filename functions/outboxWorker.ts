/**
 * Outbox event worker - publishes pending events to webhooks/integrations
 * Runs periodically to ensure reliable event delivery
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Process pending outbox events
 * Called by scheduled automation (every 5 minutes)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all pending events
    const pendingEvents = await base44.asServiceRole.entities.OutboxEvent.filter({
      status: 'Pending'
    });

    let published = 0;
    let failed = 0;

    for (const event of pendingEvents) {
      try {
        // Fire webhooks for this event
        await fireWebhooksForEvent(base44, event);

        // Mark as published
        await base44.asServiceRole.entities.OutboxEvent.update(event.id, {
          status: 'Published',
          published_at: new Date().toISOString()
        });

        published++;
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        
        // Increment retry count
        const nextRetry = new Date(Date.now() + 300000); // 5 min delay
        await base44.asServiceRole.entities.OutboxEvent.update(event.id, {
          retry_count: (event.retry_count || 0) + 1,
          status: event.retry_count >= 3 ? 'Failed' : 'Pending'
        });

        failed++;
      }
    }

    return Response.json({
      success: true,
      published,
      failed,
      message: `Processed ${published} events, ${failed} failed`
    });
  } catch (error) {
    console.error('Outbox worker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Fire webhooks for an event
 * @param {Object} base44 - SDK client
 * @param {Object} event - Outbox event
 */
async function fireWebhooksForEvent(base44, event) {
  // Find all webhook subscriptions for this event type
  const subscriptions = await base44.asServiceRole.entities.WebhookSubscription.filter({
    org_id: event.org_id,
    is_active: true
  });

  for (const sub of subscriptions) {
    // Check if subscription includes this event type
    if (!sub.events.includes(event.event_type)) continue;

    // Check filters
    if (sub.filters && !matchesFilters(event.payload, sub.filters)) {
      continue;
    }

    // Send webhook
    try {
      const response = await sendWebhook(sub, event);
      
      // Log delivery
      await base44.asServiceRole.entities.WebhookDelivery.create({
        subscription_id: sub.id,
        event_type: event.event_type,
        event_id: event.id,
        payload: event.payload,
        response_status: response.status,
        response_body: response.body,
        response_time_ms: response.timeMs,
        status: response.status >= 200 && response.status < 300 ? 'Delivered' : 'Failed'
      });
    } catch (error) {
      console.error(`Webhook delivery failed for subscription ${sub.id}:`, error);
      
      // Log failed delivery
      await base44.asServiceRole.entities.WebhookDelivery.create({
        subscription_id: sub.id,
        event_type: event.event_type,
        event_id: event.id,
        payload: event.payload,
        status: 'Failed',
        error_message: error.message,
        next_retry_at: new Date(Date.now() + 300000)
      });
    }
  }
}

/**
 * Send HTTP webhook
 * @param {Object} subscription
 * @param {Object} event
 * @returns {Promise<Object>}
 */
async function sendWebhook(subscription, event) {
  const startTime = Date.now();
  
  // Build payload
  const payload = {
    event: event.event_type,
    event_id: event.id,
    timestamp: new Date().toISOString(),
    org_id: event.org_id,
    data: event.payload,
    meta: {
      source: 'LoanGenius',
      version: '1.0'
    }
  };

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...(subscription.headers || {})
  };

  // Add HMAC signature if secret configured
  if (subscription.secret) {
    const signature = crypto
      .createHmac('sha256', subscription.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['X-LoanGenius-Signature'] = `sha256=${signature}`;
  }

  // Send POST
  const response = await fetch(subscription.target_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    timeout: 30000
  });

  const body = await response.text();
  const timeMs = Date.now() - startTime;

  return {
    status: response.status,
    body,
    timeMs
  };
}

/**
 * Check if event data matches subscription filters
 * @param {Object} data
 * @param {Object} filters
 * @returns {boolean}
 */
function matchesFilters(data, filters) {
  if (!filters || Object.keys(filters).length === 0) return true;

  for (const [key, value] of Object.entries(filters)) {
    if (data[key] !== value) return false;
  }

  return true;
}