/**
 * Test Integration - Verify integration connectivity
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getEncryptionKey() {
  const keyB64 = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!keyB64) throw new Error('INTEGRATION_ENCRYPTION_KEY not configured');
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
}

async function decryptCredentials(iv_b64, ciphertext_b64) {
  const key = await getEncryptionKey();
  const iv = Uint8Array.from(atob(iv_b64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertext_b64), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();

    // Normalize payload (accept both integration_name and integration_key)
    const integration_name = body.integration_name || body.integration_key;

    if (!integration_name) {
        return Response.json({ error: 'Missing integration_name or integration_key' }, { status: 400 });
    }

    // Check encryption key
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    if (!encryptionKey) {
        return Response.json({
            ok: false,
            status: 'error',
            message: 'Integrations encryption key missing. Set INTEGRATION_ENCRYPTION_KEY in environment variables.',
        }, { status: 500 });
    }

    // Get config
    const configs = await base44.entities.IntegrationConfig.filter({
      org_id: orgId,
      integration_name: integration_name,
    });

    if (configs.length === 0) {
      return Response.json({ 
        success: false, 
        status: 'not_configured',
        message: 'Integration not configured',
      });
    }

    const config = configs[0];

    if (!config.iv_b64 || !config.ciphertext_b64) {
      return Response.json({
        success: false,
        status: 'no_credentials',
        message: 'No credentials stored',
      });
    }

    // Decrypt and test
    try {
      const credentials = await decryptCredentials(config.iv_b64, config.ciphertext_b64);
      
      // Update test timestamp
      await base44.entities.IntegrationConfig.update(config.id, {
        last_tested_at: new Date().toISOString(),
        status: 'healthy',
      });

      return Response.json({
        success: true,
        status: 'healthy',
        message: 'Integration is working',
      });
    } catch (e) {
      await base44.entities.IntegrationConfig.update(config.id, {
        last_tested_at: new Date().toISOString(),
        status: 'unhealthy',
        last_error: e.message,
      });

      return Response.json({
        success: false,
        status: 'unhealthy',
        message: e.message,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});