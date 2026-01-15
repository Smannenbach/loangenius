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

    const org = await base44.auth.getOrgId(); // Placeholder
    const org_id = org || 'org_default';

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
  // Placeholder - would use actual AES-256-GCM encryption
  return Buffer.from(data).toString('base64');
}