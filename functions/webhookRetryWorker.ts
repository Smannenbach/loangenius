/**
 * Webhook Retry Worker
 * Runs periodically to retry failed webhook deliveries
 * Implements exponential backoff + deduplication
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const org_id = new URL(req.url).searchParams.get('org_id');
    if (!org_id) {
      return Response.json({ error: 'Missing org_id' }, { status: 400 });
    }

    // Find deliveries ready for retry
    const failedDeliveries = await base44.asServiceRole.entities.WebhookDelivery.filter({
      org_id,
      status: 'failed'
    });

    const retries = [];

    for (const delivery of failedDeliveries) {
      if (delivery.retry_count >= 5) {
        // Max retries exceeded
        await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, {
          status: 'failed',
          retry_count: 5
        });
        continue;
      }

      // Check if retry is due
      if (delivery.next_retry_at && new Date(delivery.next_retry_at) > new Date()) {
        continue;
      }

      // Get subscription
      const subs = await base44.asServiceRole.entities.WebhookSubscription.filter({
        id: delivery.subscription_id
      });

      if (!subs.length) continue;
      const sub = subs[0];

      // Retry send
      const sendResult = await sendWebhook(sub, delivery.payload_json, delivery.id);

      const nextRetry = calculateBackoff(delivery.retry_count);
      const nextRetryAt = new Date(Date.now() + nextRetry).toISOString();

      await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, {
        status: sendResult.success ? 'delivered' : 'retrying',
        response_status: sendResult.status,
        response_body: sendResult.body,
        retry_count: delivery.retry_count + 1,
        next_retry_at: nextRetryAt,
        delivered_at: sendResult.success ? new Date().toISOString() : null
      });

      retries.push({
        delivery_id: delivery.id,
        success: sendResult.success,
        retry_count: delivery.retry_count + 1
      });
    }

    return Response.json({
      success: true,
      retries_attempted: retries.length,
      successful: retries.filter(r => r.success).length,
      results: retries
    });
  } catch (error) {
    console.error('Error in webhookRetryWorker:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendWebhook(subscription, payload, deliveryId) {
  try {
    const body = JSON.stringify({
      event_type: subscription.event_type,
      delivery_id: deliveryId,
      data: payload,
      timestamp: new Date().toISOString()
    });

    const signature = await createHmacSignature(body, subscription.hmac_secret);

    const response = await fetch(subscription.target_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zapier-Signature': signature,
        'User-Agent': 'LoanGenius/1.0'
      },
      body,
      signal: AbortSignal.timeout(subscription.timeout_seconds * 1000)
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      status: response.status,
      body: responseBody
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      body: error.message
    };
  }
}

async function createHmacSignature(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sigArray = Array.from(new Uint8Array(sig));
  return sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateBackoff(retryCount) {
  // Exponential backoff: 1min, 5min, 15min, 30min, 60min
  const intervals = [60, 300, 900, 1800, 3600];
  return (intervals[retryCount] || 3600) * 1000;
}