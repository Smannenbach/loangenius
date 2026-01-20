/**
 * Connect Integration
 * Validates and stores encrypted credentials in IntegrationConfig
 * Uses AES-GCM encryption
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============ Inline Crypto Helpers ============
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

async function getEncryptionKey() {
  const rawKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!rawKey) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY not configured in Secrets.');
  }
  
  let keyBytes;
  
  // Try base64 decode
  try {
    const decoded = atob(rawKey);
    if (decoded.length === KEY_LENGTH) {
      keyBytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
    }
  } catch (e) { /* not base64 */ }

  // Try hex decode
  if (!keyBytes && rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(rawKey.substr(i * 2, 2), 16);
    }
  }

  // Fallback: derive from string
  if (!keyBytes) {
    const encoder = new TextEncoder();
    const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    keyBytes = new Uint8Array(keyHash);
  }

  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptJson(plaintextObj) {
  const cryptoKey = await getEncryptionKey();
  const plaintext = JSON.stringify(plaintextObj);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintextBytes);
  return {
    iv_b64: btoa(String.fromCharCode(...iv)),
    ciphertext_b64: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
}

// ============ Inline Org Helpers ============
async function resolveOrgId(base44, user) {
  if (!user?.email) throw new Error('User not authenticated');
  const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
  if (memberships.length === 0) throw new Error('User not associated with any organization');
  return { orgId: memberships[0].org_id, membership: memberships[0] };
}

function isOrgAdmin(membership) {
  const role = membership?.role_id || membership?.role || 'user';
  return ['admin', 'owner', 'super_admin'].includes(role);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve org and check admin
    const { orgId, membership } = await resolveOrgId(base44, user);
    
    if (!isOrgAdmin(membership)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { integration_key, auth_payload, action } = body;

    // Legacy support: map old field names
    const integrationKey = integration_key || body.integration_name;
    
    if (!integrationKey) {
      return Response.json({ error: 'Missing integration_key' }, { status: 400 });
    }

    // Handle disconnect action
    if (action === 'disconnect') {
      return await handleDisconnect(base44, orgId, integrationKey);
    }

    // Build auth payload from various input formats
    let credentialsPayload = auth_payload;
    
    // Legacy support: accept api_key or oauth_token directly
    if (!credentialsPayload && (body.api_key || body.oauth_token)) {
      credentialsPayload = {};
      if (body.api_key) credentialsPayload.api_key = body.api_key;
      if (body.oauth_token) credentialsPayload.oauth_token = body.oauth_token;
      if (body.refresh_token) credentialsPayload.refresh_token = body.refresh_token;
    }

    if (!credentialsPayload || Object.keys(credentialsPayload).length === 0) {
      return Response.json({ error: 'Missing auth_payload with credentials' }, { status: 400 });
    }

    // Validate credentials format
    const validation = validateCredentials(integrationKey, credentialsPayload);
    if (!validation.valid) {
      return Response.json({ 
        error: validation.error,
        status: 'error'
      }, { status: 400 });
    }

    // Encrypt the auth payload
    const encrypted = await encryptJson(credentialsPayload);

    // Check for existing config
    const existing = await base44.asServiceRole.entities.IntegrationConfig.filter({
      org_id: orgId,
      integration_name: integrationKey
    });

    const now = new Date().toISOString();
    
    // Extract non-sensitive metadata (safe to store unencrypted)
    const metadata = {
      scopes: credentialsPayload.scopes || null,
      account_email: credentialsPayload.account_email || credentialsPayload.email || null,
      token_type: credentialsPayload.token_type || null
    };

    const configData = {
      iv_b64: encrypted.iv_b64,
      ciphertext_b64: encrypted.ciphertext_b64,
      status: 'connected',
      last_tested_at: now,
      last_error: null,
      is_active: true,
      // Store non-sensitive metadata
      scopes: metadata.scopes,
      account_email: metadata.account_email
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.IntegrationConfig.update(existing[0].id, {
        ...configData,
        connected_at: existing[0].connected_at || now,
        updated_at: now
      });
    } else {
      await base44.asServiceRole.entities.IntegrationConfig.create({
        org_id: orgId,
        integration_name: integrationKey,
        ...configData,
        connected_at: now,
        created_at: now
      });
    }

    return Response.json({
      ok: true,
      integration_key: integrationKey,
      status: 'connected',
      message: `${integrationKey.replace(/_/g, ' ')} connected successfully`
    });
  } catch (error) {
    console.error('Error in connectIntegration:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleDisconnect(base44, orgId, integrationKey) {
  const existing = await base44.asServiceRole.entities.IntegrationConfig.filter({
    org_id: orgId,
    integration_name: integrationKey
  });

  if (existing.length === 0) {
    return Response.json({ error: 'Integration not found' }, { status: 404 });
  }

  // Clear sensitive data and mark as disconnected
  await base44.asServiceRole.entities.IntegrationConfig.update(existing[0].id, {
    iv_b64: null,
    ciphertext_b64: null,
    status: 'disconnected',
    is_active: false,
    last_error: null,
    updated_at: new Date().toISOString()
  });

  return Response.json({
    ok: true,
    integration_key: integrationKey,
    status: 'disconnected',
    message: `${integrationKey.replace(/_/g, ' ')} disconnected`
  });
}

function validateCredentials(integrationKey, payload) {
  // Check minimum credential length
  const apiKey = payload.api_key;
  const oauthToken = payload.oauth_token || payload.access_token;

  if (apiKey) {
    if (apiKey.length < 10) {
      return { valid: false, error: 'API key too short (minimum 10 characters)' };
    }
    
    // Integration-specific validation
    if (integrationKey === 'Claude' && !apiKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Invalid Anthropic API key format (should start with sk-ant-)' };
    }
    if (integrationKey === 'Stripe' && !apiKey.startsWith('sk_')) {
      return { valid: false, error: 'Invalid Stripe API key format (should start with sk_)' };
    }
    if (integrationKey === 'OpenAI' && !apiKey.startsWith('sk-')) {
      return { valid: false, error: 'Invalid OpenAI API key format (should start with sk-)' };
    }
  }

  if (oauthToken && oauthToken.length < 10) {
    return { valid: false, error: 'OAuth token too short' };
  }

  if (!apiKey && !oauthToken) {
    return { valid: false, error: 'Either api_key or oauth_token/access_token is required' };
  }

  return { valid: true };
}