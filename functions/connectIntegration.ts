/**
 * Connect Integration - Store encrypted credentials
 * Accepts both legacy and canonical payloads for backwards compatibility
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getEncryptionKey() {
  const keyB64 = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!keyB64) return null;
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptCredentials(credentials) {
  const key = await getEncryptionKey();
  if (!key) throw new Error('Encryption key not available');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(credentials));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv_b64: btoa(String.fromCharCode(...iv)),
    ciphertext_b64: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
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
    
    // Normalize payload - accept both old and new formats
    const integration_name = body.integration_name || body.integration_key;
    const credentials = body.credentials || body.auth_payload;
    const action = body.action || 'connect';

    if (!integration_name) {
      return Response.json({ 
        ok: false, 
        status: 'error',
        message: 'Missing integration_name or integration_key' 
      }, { status: 400 });
    }

    // Check encryption key for connect action
    const encryptionKeyPresent = !!Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    if (!encryptionKeyPresent && action === 'connect') {
      return Response.json({
        ok: false,
        status: 'error',
        message: 'Integrations encryption key missing. Set INTEGRATION_ENCRYPTION_KEY in environment variables to enable credential storage.',
      });
    }

    // DISCONNECT
    if (action === 'disconnect') {
      const existing = await base44.entities.IntegrationConfig.filter({
        org_id: orgId,
        integration_name: integration_name,
      });
      
      if (existing.length > 0) {
        await base44.entities.IntegrationConfig.update(existing[0].id, {
          status: 'disconnected',
          iv_b64: null,
          ciphertext_b64: null,
        });
      }

      return Response.json({ 
        ok: true, 
        status: 'disconnected', 
        message: 'Integration disconnected successfully' 
      });
    }

    // CONNECT
    if (action === 'connect') {
      if (!credentials) {
        return Response.json({ 
          ok: false, 
          status: 'error',
          message: 'Missing credentials' 
        }, { status: 400 });
      }

      // Encrypt credentials
      const encrypted = await encryptCredentials(credentials);

      // Check for existing config
      const existing = await base44.entities.IntegrationConfig.filter({
        org_id: orgId,
        integration_name: integration_name,
      });

      if (existing.length > 0) {
        await base44.entities.IntegrationConfig.update(existing[0].id, {
          ...encrypted,
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_error: null,
        });
      } else {
        await base44.entities.IntegrationConfig.create({
          org_id: orgId,
          integration_name: integration_name,
          ...encrypted,
          status: 'connected',
          is_active: true,
          connected_at: new Date().toISOString(),
        });
      }

      return Response.json({ 
        ok: true, 
        status: 'connected', 
        message: 'Integration connected successfully' 
      });
    }

    return Response.json({ 
      ok: false, 
      status: 'error',
      message: 'Invalid action. Use "connect" or "disconnect".' 
    }, { status: 400 });
  } catch (error) {
    console.error('connectIntegration error:', error);
    return Response.json({ 
      ok: false, 
      status: 'error',
      message: error.message 
    }, { status: 500 });
  }
});