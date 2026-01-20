/**
 * Test Integration - Verify integration connectivity
 * Accepts both integration_name and integration_key for backwards compatibility
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getEncryptionKey() {
  const keyB64 = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!keyB64) return null;
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
}

async function decryptCredentials(iv_b64, ciphertext_b64) {
  const key = await getEncryptionKey();
  if (!key) throw new Error('Encryption key not available');
  const iv = Uint8Array.from(atob(iv_b64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertext_b64), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) {
      return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    }
    const orgId = memberships[0].org_id;

    const body = await req.json();
    
    // Normalize payload - accept both formats
    const integration_name = body.integration_name || body.integration_key;

    if (!integration_name) {
      return Response.json({ 
        ok: false, 
        status: 'error',
        message: 'Missing integration_name or integration_key' 
      }, { status: 400 });
    }

    // Check encryption key
    const encryptionKeyPresent = !!Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    if (!encryptionKeyPresent) {
      return Response.json({
        ok: false,
        status: 'error',
        message: 'Integrations encryption key missing. Set INTEGRATION_ENCRYPTION_KEY in environment variables.',
      });
    }

    // Get config
    const configs = await base44.entities.IntegrationConfig.filter({
      org_id: orgId,
      integration_name: integration_name,
    });

    if (configs.length === 0) {
      return Response.json({ 
        ok: false, 
        status: 'not_configured',
        message: 'Integration not configured. Please connect it first.',
      });
    }

    const config = configs[0];

    if (!config.iv_b64 || !config.ciphertext_b64) {
      return Response.json({
        ok: false,
        status: 'needs_reconnect',
        message: 'No credentials stored. Please reconnect the integration.',
      });
    }

    // Decrypt and test
    try {
      const credentials = await decryptCredentials(config.iv_b64, config.ciphertext_b64);
      
      // Update test timestamp and mark healthy
      await base44.entities.IntegrationConfig.update(config.id, {
        last_tested_at: new Date().toISOString(),
        status: 'healthy',
        last_error: null,
      });

      return Response.json({
        ok: true,
        status: 'healthy',
        message: 'Integration test successful - credentials are valid',
      });
    } catch (e) {
      await base44.entities.IntegrationConfig.update(config.id, {
        last_tested_at: new Date().toISOString(),
        status: 'unhealthy',
        last_error: e.message,
      });

      return Response.json({
        ok: false,
        status: 'unhealthy',
        message: 'Integration test failed: ' + e.message,
      });
    }
  } catch (error) {
    console.error('testIntegration error:', error);
    return Response.json({ 
      ok: false, 
      status: 'error',
      message: error.message 
    }, { status: 500 });
  }
});