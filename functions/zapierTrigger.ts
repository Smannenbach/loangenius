/**
 * Zapier Webhook Trigger Handler
 * Fires on entity events (deal.created, stage_changed, document.uploaded, etc.)
 * Finds matching subscriptions and sends to Zapier
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, event_type, entity_id, entity_data } = await req.json();

    if (!org_id || !event_type || !entity_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find active subscriptions matching this event
    const subscriptions = await base44.asServiceRole.entities.WebhookSubscription.filter({
      org_id,
      event_type,
      is_active: true
    });

    if (!subscriptions.length) {
      return Response.json({ success: true, message: 'No subscriptions for this event' });
    }

    const results = [];

    for (const sub of subscriptions) {
      // Check filter
      if (sub.filter_json && !matchesFilter(entity_data, sub.filter_json)) {
        continue;
      }

      // Create delivery record
      const delivery = await base44.asServiceRole.entities.WebhookDelivery.create({
        org_id,
        subscription_id: sub.id,
        event_type,
        entity_id,
        payload_json: entity_data,
        status: 'pending'
      });

      // Send webhook
      const deliveryResult = await sendWebhook(sub, entity_data, delivery.id);
      results.push(deliveryResult);

      // Update delivery record
      await base44.asServiceRole.entities.WebhookDelivery.update(delivery.id, {
        status: deliveryResult.success ? 'delivered' : 'failed',
        response_status: deliveryResult.status,
        response_body: deliveryResult.body,
        delivered_at: deliveryResult.success ? new Date().toISOString() : null,
        retry_count: 0
      });
    }

    return Response.json({
      success: true,
      event_type,
      subscriptions_triggered: results.length,
      results
    });
  } catch (error) {
    console.error('Error in zapierTrigger:', error);
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

    // Create HMAC signature
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
      body: responseBody,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      body: error.message,
      timestamp: new Date().toISOString()
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

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function matchesFilter(data, filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (data[key] !== value) {
      return false;
    }
  }
  return true;
}