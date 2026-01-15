import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { org_slug, loan_product, loan_purpose, email, phone } = await req.json();

    if (!org_slug || !loan_product || !loan_purpose || !email) {
      return Response.json({
        error: 'Missing required fields: org_slug, loan_product, loan_purpose, email'
      }, { status: 400 });
    }

    // Find org by slug
    const orgs = await base44.asServiceRole.entities.Organization.filter({ slug: org_slug });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    const org = orgs[0];

    // Generate resume token
    const resumeToken = crypto.randomBytes(32).toString('hex');
    const resumeTokenHash = crypto.createHash('sha256').update(resumeToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Create application draft
    const draft = await base44.asServiceRole.entities.ApplicationDraft.create({
      org_id: org.id,
      loan_product,
      loan_purpose,
      primary_contact_email: email,
      primary_contact_phone: phone,
      status: 'draft',
      application_data_json: {},
      resume_token_hash: resumeTokenHash,
      resume_expires_at: expiresAt
    });

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: org.id,
      action_type: 'Create',
      entity_type: 'ApplicationDraft',
      entity_id: draft.id,
      description: `New DSCR application started: ${loan_purpose}`,
      severity: 'Info'
    });

    return Response.json({
      resume_url: `${new URL(req.url).origin}/public/application/resume/${resumeToken}`,
      application_id: draft.id,
      expires_at: expiresAt,
      token: resumeToken
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});