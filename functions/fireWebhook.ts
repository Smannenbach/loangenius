import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHmac } from 'node:crypto';

/**
 * Fire a webhook to external URL
 * Called by automations and entity changes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { webhook_url, webhook_secret, event_type, payload } = await req.json();

    if (!webhook_url || !event_type || !payload) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create HMAC signature if secret provided
    let signature = null;
    if (webhook_secret) {
      const payloadString = JSON.stringify(payload);
      const hmac = createHmac('sha256', webhook_secret);
      hmac.update(payloadString);
      signature = hmac.digest('hex');
    }

    // Prepare webhook headers
    const headers = {
      'Content-Type': 'application/json',
      'X-LoanGenius-Event': event_type,
      'X-LoanGenius-Timestamp': new Date().toISOString(),
    };

    if (signature) {
      headers['X-LoanGenius-Signature'] = `sha256=${signature}`;
    }

    // Send webhook
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const success = response.ok;
    const statusCode = response.status;

    return Response.json({
      success,
      status_code: statusCode,
      webhook_url,
      event_type,
    });
  } catch (error) {
    console.error('Webhook firing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});