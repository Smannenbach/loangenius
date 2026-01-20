/**
 * E2E Test Runner - Validates core system functionality
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // Resolve org directly (no nested function call)
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });
    const activeMemberships = memberships.filter(m => m.status === 'active' || !m.status);
    
    if (activeMemberships.length === 0) {
      return Response.json({ ok: false, error: 'No organization membership' }, { status: 403 });
    }

    const primaryMembership = activeMemberships.find(m => m.is_primary) || activeMemberships[0];
    const orgId = primaryMembership.org_id;
    const membershipRole = primaryMembership.role || 'admin';

    // Check admin role using membership
    if (!['admin', 'owner', 'manager'].includes(membershipRole)) {
      return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

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
      message: `Org ID: ${orgId}, Role: ${membershipRole}`,
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
      status: encKey ? 'pass' : 'warn',
      message: encKey ? 'Configured' : 'Missing (integrations will show setup message)',
    });

    // Test 5: Google Sheets Connector
    try {
      const token = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
      tests.push({
        name: 'Google Sheets Connector',
        status: token ? 'pass' : 'warn',
        message: token ? 'Connected' : 'Not authorized (import will show setup steps)',
      });
    } catch (e) {
      tests.push({ name: 'Google Sheets Connector', status: 'warn', message: 'Not configured' });
    }

    // Test 6: Email (SendGrid)
    const sendgridKey = Deno.env.get('Sendgrid_API_Key');
    tests.push({
      name: 'Email (SendGrid)',
      status: sendgridKey ? 'pass' : 'warn',
      message: sendgridKey ? 'Configured' : 'Not configured',
    });

    const passCount = tests.filter(t => t.status === 'pass').length;
    const failCount = tests.filter(t => t.status === 'fail').length;

    return Response.json({
      ok: failCount === 0,
      summary: `${passCount}/${tests.length} tests passed`,
      tests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('e2eTestRunner error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});