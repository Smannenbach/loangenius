import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Manage portal webhooks for external integrations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, event_type, webhook_url, secret } = await req.json();

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    // Get user's org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    if (memberships.length === 0) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }
    const org_id = memberships[0].org_id;

    if (action === 'registerWebhook') {
      if (!event_type || !webhook_url) {
        return Response.json({ error: 'Missing event_type or webhook_url' }, { status: 400 });
      }

      // Create webhook config
      const webhook = await base44.asServiceRole.entities.WebhookConfig.create({
        org_id,
        event_type,
        webhook_url,
        secret: secret || crypto.getRandomValues(new Uint8Array(32)).toString(),
        is_active: true,
        created_by: user.email,
      });

      return Response.json({
        success: true,
        webhook_id: webhook.id,
        event_type,
        webhook_url,
      });
    }

    if (action === 'testWebhook') {
      const { webhook_id } = await req.json();
      if (!webhook_id) {
        return Response.json({ error: 'Missing webhook_id' }, { status: 400 });
      }

      const webhook = await base44.asServiceRole.entities.WebhookConfig.get(webhook_id);
      if (!webhook) {
        return Response.json({ error: 'Webhook not found' }, { status: 404 });
      }

      // Send test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Test webhook from LoanGenius',
        },
      };

      try {
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LoanGenius-Signature': await signPayload(
              JSON.stringify(testPayload),
              webhook.secret
            ),
          },
          body: JSON.stringify(testPayload),
        });

        return Response.json({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
        });
      } catch (err) {
        return Response.json({
          success: false,
          error: err.message,
        });
      }
    }

    if (action === 'listWebhooks') {
      const webhooks = await base44.asServiceRole.entities.WebhookConfig.filter({
        org_id,
      });

      return Response.json({
        webhooks: webhooks.map(w => ({
          id: w.id,
          event_type: w.event_type,
          webhook_url: w.webhook_url,
          is_active: w.is_active,
          created_at: w.created_date,
        })),
      });
    }

    if (action === 'deleteWebhook') {
      const { webhook_id } = await req.json();
      if (!webhook_id) {
        return Response.json({ error: 'Missing webhook_id' }, { status: 400 });
      }

      await base44.asServiceRole.entities.WebhookConfig.delete(webhook_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal webhooks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Sign webhook payload with HMAC
 */
async function signPayload(payload, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}