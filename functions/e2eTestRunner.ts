/**
 * E2E Smoke Test Runner
 * Runs comprehensive end-to-end tests for core app flows
 * Admin-only, safe (cleans up any test data created)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============ Inline Crypto Helpers ============
const KEY_LENGTH = 32;

async function getEncryptionKey() {
  const rawKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  if (!rawKey) throw new Error('Missing required secret: INTEGRATION_ENCRYPTION_KEY');
  
  let keyBytes;
  try {
    const decoded = atob(rawKey);
    if (decoded.length === KEY_LENGTH) {
      keyBytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
    }
  } catch (e) { /* not base64 */ }

  if (!keyBytes && rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(rawKey.substr(i * 2, 2), 16);
  }

  if (!keyBytes) {
    const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
    keyBytes = new Uint8Array(keyHash);
  }

  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function decryptJson(encryptedData) {
  if (!encryptedData?.iv_b64 || !encryptedData?.ciphertext_b64) {
    throw new Error('Invalid encrypted data');
  }
  const cryptoKey = await getEncryptionKey();
  const iv = Uint8Array.from(atob(encryptedData.iv_b64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext_b64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
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
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const started_at = new Date().toISOString();
  const startTime = Date.now();
  const results = [];

  // Helper to run a test and capture result
  const runTest = async (id, name, testFn) => {
    const testStart = Date.now();
    try {
      const result = await testFn();
      results.push({
        id,
        name,
        status: result.status || 'PASS',
        message: result.message || 'Test passed',
        details: result.details || null,
        duration_ms: Date.now() - testStart
      });
    } catch (err) {
      results.push({
        id,
        name,
        status: 'FAIL',
        message: err.message || 'Unknown error',
        details: err.stack || null,
        duration_ms: Date.now() - testStart
      });
    }
  };

  let base44;
  try {
    base44 = createClientFromRequest(req);
    
    // ========== TEST 1: Auth Test ==========
    let user = null;
    await runTest('auth', 'Authentication Check', async () => {
      user = await base44.auth.me();
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }
      if (user.role !== 'admin') {
        throw new Error('Admin access required');
      }
      return { message: `Authenticated as ${user.email} (role: ${user.role})` };
    });

    // If auth failed, return early
    if (results[0]?.status === 'FAIL') {
      return Response.json({
        ok: false,
        started_at,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        results
      }, { status: 403 });
    }

    // ========== TEST 2: Org Resolver Test ==========
    let orgId = null;
    let membership = null;
    await runTest('org_resolver', 'Organization Resolver', async () => {
      const resolved = await resolveOrgId(base44, user);
      orgId = resolved.orgId;
      membership = resolved.membership;
      if (!orgId) throw new Error('Could not resolve org_id');
      return { 
        message: `Resolved org_id: ${orgId}`,
        details: { org_id: orgId, role: membership.role_id }
      };
    });

    // ========== TEST 3: Leads Read Test ==========
    await runTest('leads_read', 'Leads Read Access', async () => {
      if (!orgId) throw new Error('No org_id available from previous test');
      const leads = await base44.entities.Lead.filter({ org_id: orgId });
      return { 
        message: `Successfully queried leads (found ${leads.length})`,
        details: { count: leads.length }
      };
    });

    // ========== TEST 4: Leads Write/Delete Test (Safe) ==========
    let testLeadId = null;
    let cleanupFailed = false;
    await runTest('leads_write_delete', 'Leads Write/Delete (Safe)', async () => {
      if (!orgId) throw new Error('No org_id available');
      
      const timestamp = Date.now();
      const testMarker = `e2e-${timestamp}`;
      
      // Create test lead
      const lead = await base44.entities.Lead.create({
        org_id: orgId,
        first_name: 'E2E',
        last_name: `Test ${timestamp}`,
        home_email: `e2e+${timestamp}@example.com`,
        source: 'e2e',
        status: 'new',
        notes: testMarker
      });
      testLeadId = lead.id;

      if (!testLeadId) throw new Error('Failed to create test lead');

      // Verify we can retrieve it
      const retrieved = await base44.entities.Lead.filter({ id: testLeadId });
      if (!retrieved || retrieved.length === 0) {
        throw new Error('Could not retrieve created lead');
      }

      // Delete it (cleanup)
      try {
        await base44.entities.Lead.delete(testLeadId);
      } catch (deleteErr) {
        cleanupFailed = true;
        throw new Error(`Created lead but CLEANUP FAILED: ${deleteErr.message}. Manual cleanup required for lead ID: ${testLeadId}`);
      }

      // Verify deletion
      const verifyDeleted = await base44.entities.Lead.filter({ id: testLeadId });
      if (verifyDeleted && verifyDeleted.length > 0 && !verifyDeleted[0].is_deleted) {
        cleanupFailed = true;
        throw new Error(`Lead still exists after delete. Manual cleanup required for lead ID: ${testLeadId}`);
      }

      return { 
        message: 'Created and deleted test lead successfully',
        details: { created_id: testLeadId, cleaned_up: true }
      };
    });

    // ========== TEST 5: Google Sheets Integration (Conditional) ==========
    await runTest('integration_googlesheets', 'Google Sheets Integration', async () => {
      if (!orgId) {
        return { status: 'SKIP', message: 'No org_id available' };
      }

      // Check if Google Sheets is configured
      const configs = await base44.entities.IntegrationConfig.filter({ 
        org_id: orgId, 
        integration_name: 'Google_Sheets' 
      });

      if (!configs || configs.length === 0) {
        return { status: 'SKIP', message: 'Google Sheets not connected' };
      }

      const config = configs[0];
      if (config.status !== 'connected' && config.status !== 'healthy') {
        return { status: 'SKIP', message: `Google Sheets status: ${config.status}` };
      }

      // Try to decrypt and validate token
      if (!config.iv_b64 || !config.ciphertext_b64) {
        return { status: 'FAIL', message: 'Google Sheets connected but no encrypted credentials found' };
      }

      try {
        const decrypted = await decryptJson({
          iv_b64: config.iv_b64,
          ciphertext_b64: config.ciphertext_b64
        });

        if (!decrypted.access_token && !decrypted.api_key) {
          return { status: 'FAIL', message: 'Decrypted credentials missing token/key' };
        }

        // Light API test - just verify token format exists
        return { 
          message: 'Google Sheets credentials decrypted successfully',
          details: { has_access_token: !!decrypted.access_token, has_refresh_token: !!decrypted.refresh_token }
        };
      } catch (decryptErr) {
        return { status: 'FAIL', message: `Decryption failed: ${decryptErr.message}` };
      }
    });

    // ========== TEST 6: AI Providers Test (Conditional) ==========
    await runTest('ai_providers', 'AI Providers Configuration', async () => {
      const providers = await base44.entities.AIProvider.filter({});
      
      if (!providers || providers.length === 0) {
        return { status: 'SKIP', message: 'No AI providers configured' };
      }

      const activeProviders = providers.filter(p => p.is_active);
      const defaultProvider = providers.find(p => p.is_default);

      return {
        message: `Found ${providers.length} provider(s), ${activeProviders.length} active`,
        details: {
          total: providers.length,
          active: activeProviders.length,
          default_provider: defaultProvider?.provider_name || 'none',
          providers: providers.map(p => ({ name: p.provider_name, status: p.status, is_default: p.is_default }))
        }
      };
    });

    // ========== TEST 7: Encryption Key Test ==========
    await runTest('encryption_key', 'Encryption Key Configuration', async () => {
      try {
        await getEncryptionKey();
        return { message: 'INTEGRATION_ENCRYPTION_KEY is configured and valid' };
      } catch (err) {
        throw new Error(`Encryption key error: ${err.message}`);
      }
    });

    // ========== Calculate final result ==========
    const completed_at = new Date().toISOString();
    const duration_ms = Date.now() - startTime;
    
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const skipCount = results.filter(r => r.status === 'SKIP').length;

    return Response.json({
      ok: failCount === 0,
      started_at,
      completed_at,
      duration_ms,
      summary: {
        total: results.length,
        passed: passCount,
        failed: failCount,
        skipped: skipCount
      },
      results
    });

  } catch (error) {
    return Response.json({
      ok: false,
      started_at,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      results,
      error: error.message
    }, { status: 500 });
  }
});