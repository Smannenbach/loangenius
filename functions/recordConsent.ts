import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_email, contact_phone, consent_type, status, source = 'application', reason } = await req.json();

    if (!contact_email && !contact_phone) {
      return Response.json({ error: 'Email or phone required' }, { status: 400 });
    }

    if (!['email', 'sms', 'in_app'].includes(consent_type)) {
      return Response.json({ error: 'Invalid consent_type' }, { status: 400 });
    }

    if (!['opt_in', 'opt_out'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get org from user or request
    const orgId = user.org_id || (await req.json()).org_id || 'default';

    // Check if consent record exists
    const query = {
      org_id: orgId,
      consent_type
    };

    if (contact_email) query.contact_email = contact_email;
    if (contact_phone) query.contact_phone = contact_phone;

    const existing = await base44.asServiceRole.entities.ConsentRecord.filter(query);

    let consent;

    if (existing.length > 0) {
      // Update existing
      consent = await base44.asServiceRole.entities.ConsentRecord.update(existing[0].id, {
        status,
        [status === 'opt_in' ? 'opted_in_at' : 'opted_out_at']: new Date().toISOString(),
        reason
      });
    } else {
      // Create new
      consent = await base44.asServiceRole.entities.ConsentRecord.create({
        org_id: orgId,
        contact_email,
        contact_phone,
        consent_type,
        status,
        captured_at: new Date().toISOString(),
        source,
        reason
      });
    }

    // If SMS opt-out, also update SMSOptOut entity
    if (consent_type === 'sms' && status === 'opt_out' && contact_phone) {
      const smsOptOuts = await base44.asServiceRole.entities.SMSOptOut.filter({
        org_id: orgId,
        phone_number: contact_phone
      });

      if (smsOptOuts.length === 0) {
        await base44.asServiceRole.entities.SMSOptOut.create({
          org_id: orgId,
          phone_number: contact_phone,
          status: 'opted_out',
          opted_out_at: new Date().toISOString(),
          reason
        });
      } else {
        await base44.asServiceRole.entities.SMSOptOut.update(smsOptOuts[0].id, {
          status: 'opted_out',
          opted_out_at: new Date().toISOString()
        });
      }
    }

    // If Email opt-out
    if (consent_type === 'email' && status === 'opt_out' && contact_email) {
      const emailOptOuts = await base44.asServiceRole.entities.EmailOptOut.filter({
        org_id: orgId,
        email: contact_email
      });

      if (emailOptOuts.length === 0) {
        await base44.asServiceRole.entities.EmailOptOut.create({
          org_id: orgId,
          email: contact_email,
          status: 'opted_out',
          opted_out_at: new Date().toISOString(),
          reason
        });
      } else {
        await base44.asServiceRole.entities.EmailOptOut.update(emailOptOuts[0].id, {
          status: 'opted_out',
          opted_out_at: new Date().toISOString()
        });
      }
    }

    return Response.json({
      consent_id: consent.id,
      status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});