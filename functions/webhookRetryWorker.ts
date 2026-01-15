/**
 * Webhook Retry Worker - runs every minute
 * Retries failed/pending webhooks with exponential backoff
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find deliveries that need retry
    const deliveries = await base44.asServiceRole.entities.WebhookDelivery.filter({
      status: 'Retrying'
    });

    let processedCount = 0;

    for (const delivery of deliveries) {
      // Check if next_retry_at has passed
      if (new Date(delivery.next_retry_at) > new Date()) {
        continue;
      }

      // Get subscription
      const subs = await base44.asServiceRole.entities.WebhookSubscription.filter({
        id: delivery.subscription_id
      });

      if (!subs.length) continue;

      const subscription = subs[0];

      // Check attempt limit
      if (delivery.attempt_number >= subscription.retry_count) {
        await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, {
          status: 'Failed'
        });
        continue;
      }

      // Resend
      const startTime = Date.now();
      const payloadStr = JSON.stringify(delivery.payload);

      try {
        const response = await fetch(subscription.target_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          timeout: 30000
        });

        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();

        const updateData = {
          attempt_number: delivery.attempt_number + 1,
          response_status: response.status,
          response_body: responseBody.slice(0, 500),
          response_time_ms: responseTime
        };

        if (response.ok) {
          updateData.status = 'Delivered';
          updateData.delivered_at = new Date().toISOString();
        } else if (response.status >= 500) {
          updateData.status = 'Retrying';
          const backoffMs = subscription.retry_delay_seconds * 1000 * Math.pow(2, delivery.attempt_number);
          updateData.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
        } else {
          updateData.status = 'Failed';
          updateData.error_message = `HTTP ${response.status}`;
        }

        await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, updateData);
        processedCount++;
      } catch (error) {
        const backoffMs = subscription.retry_delay_seconds * 1000 * Math.pow(2, delivery.attempt_number);
        await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, {
          attempt_number: delivery.attempt_number + 1,
          status: 'Retrying',
          next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
          error_message: error.message
        });
        processedCount++;
      }
    }

    return Response.json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('Error in webhookRetryWorker:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});