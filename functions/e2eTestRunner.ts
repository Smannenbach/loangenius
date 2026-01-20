/**
 * E2E Test Runner - Runs comprehensive end-to-end tests
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can run e2e tests
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    // Test 1: Authentication
    results.tests.push({
      name: 'Authentication',
      status: 'passed',
      message: `Authenticated as ${user.email}`,
    });
    results.passed++;

    // Test 2: Organization resolution
    try {
      const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
      if (memberships.length > 0) {
        results.tests.push({
          name: 'Organization Resolution',
          status: 'passed',
          message: `Found org: ${memberships[0].org_id}`,
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Organization Resolution',
          status: 'failed',
          message: 'No organization membership found',
        });
        results.failed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Organization Resolution',
        status: 'failed',
        message: e.message,
      });
      results.failed++;
    }

    // Test 3: Database connectivity
    try {
      const leads = await base44.entities.Lead.filter({});
      results.tests.push({
        name: 'Database Connectivity (Lead)',
        status: 'passed',
        message: `Can query leads: ${leads.length} found`,
      });
      results.passed++;
    } catch (e) {
      results.tests.push({
        name: 'Database Connectivity (Lead)',
        status: 'failed',
        message: e.message,
      });
      results.failed++;
    }

    // Test 4: Encryption key configured
    const encKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
    if (encKey) {
      results.tests.push({
        name: 'Encryption Key',
        status: 'passed',
        message: 'INTEGRATION_ENCRYPTION_KEY is configured',
      });
      results.passed++;
    } else {
      results.tests.push({
        name: 'Encryption Key',
        status: 'failed',
        message: 'INTEGRATION_ENCRYPTION_KEY not set',
      });
      results.failed++;
    }

    // Test 5: Google Sheets connector
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
      if (accessToken) {
        results.tests.push({
          name: 'Google Sheets Connector',
          status: 'passed',
          message: 'Connector authorized',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Google Sheets Connector',
          status: 'skipped',
          message: 'Not connected',
        });
        results.skipped++;
      }
    } catch (e) {
      results.tests.push({
        name: 'Google Sheets Connector',
        status: 'skipped',
        message: 'Not connected or not authorized',
      });
      results.skipped++;
    }

    // Test 6: AI Integration (InvokeLLM)
    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: 'Reply with just the word "OK"',
      });
      if (aiResponse) {
        results.tests.push({
          name: 'AI Integration (InvokeLLM)',
          status: 'passed',
          message: 'AI responded successfully',
        });
        results.passed++;
      }
    } catch (e) {
      results.tests.push({
        name: 'AI Integration (InvokeLLM)',
        status: 'failed',
        message: e.message,
      });
      results.failed++;
    }

    return Response.json({
      summary: {
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        total: results.tests.length,
      },
      tests: results.tests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});