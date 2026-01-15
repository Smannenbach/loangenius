import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Record and manage consent for communications
 * Tracks opt-in/opt-out for email, SMS, in-app messaging
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_email, contact_phone, consent_type, status, source } = await req.json();

    if (!consent_type || !status) {
      return Response.json({ error: 'consent_type and status required' }, { status: 400 });
    }

    // Get user's org
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email,
    });

    if (memberships.length === 0) {
      return Response.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const org_id = memberships[0].org_id;

    // Check if consent record exists
    const query = {
      org_id,
      consent_type,
    };

    if (contact_email) query.contact_email = contact_email;
    if (contact_phone) query.contact_phone = contact_phone;

    const existing = await base44.asServiceRole.entities.ConsentRecord.filter(query);

    let consentRecord;
    if (existing.length > 0) {
      // Update existing
      consentRecord = await base44.asServiceRole.entities.ConsentRecord.update(existing[0].id, {
        status,
        captured_at: new Date().toISOString(),
      });
    } else {
      // Create new
      consentRecord = await base44.asServiceRole.entities.ConsentRecord.create({
        org_id,
        contact_email,
        contact_phone,
        consent_type,
        status,
        source: source || 'admin',
        captured_at: new Date().toISOString(),
      });
    }

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.email,
      action_type: 'Update',
      entity_type: 'ConsentRecord',
      entity_id: consentRecord.id,
      description: `${status} consent for ${consent_type} - ${contact_email || contact_phone}`,
      severity: 'Info',
    });

    return Response.json({
      success: true,
      consent_id: consentRecord.id,
      status,
    });
  } catch (error) {
    console.error('Consent record error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});