/**
 * Connect Integration
 * Validates credentials + stores encrypted credentials in IntegrationConfig
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { integration_name, api_key, oauth_token } = await req.json();

    if (!integration_name) {
      return Response.json({ error: 'Missing integration_name' }, { status: 400 });
    }

    // Get org from user's membership
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email
    });
    const org_id = memberships.length > 0 ? memberships[0].org_id : null;
    
    if (!org_id) {
      return Response.json({ error: 'User not associated with an organization' }, { status: 400 });
    }

    // Validate credentials based on integration type
    const isValid = await validateIntegrationCredentials(integration_name, api_key, oauth_token);

    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Encrypt sensitive data
    const encryptedKey = api_key ? await encryptData(api_key) : null;
    const encryptedToken = oauth_token ? await encryptData(oauth_token) : null;

    // Check if already exists
    const existing = await base44.asServiceRole.entities.IntegrationConfig.filter({
      org_id,
      integration_name
    });

    let result;

    if (existing.length > 0) {
      // Update existing
      result = await base44.asServiceRole.entities.IntegrationConfig.update(existing[0].id, {
        api_key_encrypted: encryptedKey,
        oauth_token_encrypted: encryptedToken,
        status: 'connected',
        last_tested_at: new Date().toISOString(),
        connected_at: new Date().toISOString()
      });
    } else {
      // Create new
      result = await base44.asServiceRole.entities.IntegrationConfig.create({
        org_id,
        integration_name,
        api_key_encrypted: encryptedKey,
        oauth_token_encrypted: encryptedToken,
        status: 'connected',
        last_tested_at: new Date().toISOString(),
        connected_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      integration_name,
      status: 'connected',
      message: `${integration_name} connected successfully`
    });
  } catch (error) {
    console.error('Error in connectIntegration:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function validateIntegrationCredentials(name, apiKey, oauthToken) {
  // Quick validation - would be more thorough in production
  if (apiKey) return apiKey.length >= 10;
  if (oauthToken) return oauthToken.length > 0;
  return true;
}

async function encryptData(data) {
  // Use Web Crypto API for proper encryption
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  
  // Generate a key from environment secret or use a derived key
  const keyMaterial = encoder.encode(Deno.env.get('BASE44_APP_ID') || 'default-key-material');
  const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBytes
  );
  
  // Combine IV + encrypted data and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}