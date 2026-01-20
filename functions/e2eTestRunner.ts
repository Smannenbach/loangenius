/**
 * E2E Test Runner - Validates core system functionality
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Resolve org and check admin role
    const resolveResponse = await base44.functions.invoke('resolveOrgId', { auto_create: false });
    const orgData = resolveResponse.data;
    
    if (!orgData.ok || !orgData.has_org) {
      return Response.json({ ok: false, error: 'No organization' }, { status: 403 });
    }

    // Check admin role using membership, not base44 user.role
    if (!['admin', 'owner'].includes(orgData.membership_role)) {
      return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const orgId = orgData.org_id;
    const tests = [];

    // Test 1: Authentication
    tests.push({
      name: 'Authentication',
      status: 'pass',
      message: `User authenticated: ${user.email}`,
    });

    // Test 2: Org Resolution
    tests.push({
      name: 'Org Resolution',
      status: 'pass',
      message: `Org ID: ${orgId}, Role: ${orgData.membership_role}`,
    });

    // Test 3: Lead Query (org-scoped)
    try {
      const leads = await base44.asServiceRole.entities.Lead.filter({ org_id: orgId });
      tests.push({
        name: 'Lead Query',
        status: 'pass',
        message: `Found ${leads.length} leads`,
      });
    } catch (e) {
      tests.push({ name: 'Lead Query', status: 'fail', message: e.message });
    }

    // Test 4: Encryption Key
    const encKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    tests.push({
      name: 'Encryption Key',
      status: encKey ? 'pass' : 'fail',
      message: encKey ? 'Configured' : 'Missing INTEGRATION_ENCRYPTION_KEY',
    });

    // Test 5: Google Sheets Connector
    try {
      const token = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
      tests.push({
        name: 'Google Sheets Connector',
        status: token ? 'pass' : 'skip',
        message: token ? 'Connected' : 'Not authorized',
      });
    } catch (e) {
      tests.push({ name: 'Google Sheets Connector', status: 'skip', message: 'Not configured' });
    }

    // Test 6: AI Integration
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: 'Reply with just "OK"',
      });
      tests.push({
        name: 'AI Integration',
        status: result ? 'pass' : 'fail',
        message: 'LLM responding',
      });
    } catch (e) {
      tests.push({ name: 'AI Integration', status: 'fail', message: e.message });
    }

    const passCount = tests.filter(t => t.status === 'pass').length;
    const failCount = tests.filter(t => t.status === 'fail').length;

    return Response.json({
      ok: failCount === 0,
      summary: `${passCount}/${tests.length} tests passed`,
      tests,
    });
  } catch (error) {
    console.error('e2eTestRunner error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});