/**
 * Connect Integration - Store encrypted credentials
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getEncryptionKey() {
  const keyB64 = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!keyB64) throw new Error('INTEGRATION_ENCRYPTION_KEY not configured');
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptCredentials(credentials) {
  const key = await getEncryptionKey();
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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    const body = await req.json();
    const { action, integration_name, credentials } = body;

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

      return Response.json({ success: true, status: 'disconnected' });
    }

    if (action === 'connect') {
      if (!credentials) {
        return Response.json({ error: 'Missing credentials' }, { status: 400 });
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

      return Response.json({ success: true, status: 'connected' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});