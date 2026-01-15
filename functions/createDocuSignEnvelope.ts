import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      deal_id,
      document_type, // 'closing_disclosure', 'loan_estimate', 'promissory_note', etc.
      recipient_email,
      recipient_name,
      send_now = true
    } = await req.json();

    if (!deal_id || !document_type || !recipient_email) {
      return Response.json({
        error: 'Missing deal_id, document_type, or recipient_email'
      }, { status: 400 });
    }

    // Get DocuSign settings
    const settings = await base44.asServiceRole.entities.DocuSignSettings.filter({
      is_connected: true
    });

    if (settings.length === 0) {
      return Response.json({
        error: 'DocuSign not configured. Go to Settings > Integrations > DocuSign.'
      }, { status: 400 });
    }

    const docuSign = settings[0];
    if (!docuSign.is_connected) {
      return Response.json({
        error: 'DocuSign integration not connected'
      }, { status: 400 });
    }

    // Get deal & borrower info
    const deal = await base44.entities.Deal.get(deal_id);
    const borrowers = await base44.entities.Borrower.filter({ deal_id });

    if (!deal || borrowers.length === 0) {
      return Response.json({ error: 'Deal or borrower not found' }, { status: 404 });
    }

    // Mock DocuSign envelope creation
    // In production: use DocuSign API with access token from docuSign.access_token_encrypted
    const envelopeId = `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create DocuSignEnvelope record
    const envelope = await base44.asServiceRole.entities.DocuSignEnvelope.create({
      org_id: docuSign.org_id,
      deal_id,
      document_type,
      envelope_id: envelopeId,
      status: send_now ? 'sent' : 'created',
      recipient_email,
      recipient_name,
      borrower_id: borrowers[0].id,
      created_by: user.email,
      created_at: new Date().toISOString(),
      sent_at: send_now ? new Date().toISOString() : null,
      metadata_json: {
        document_type,
        signer_role: docuSign.default_signer_role || 'Borrower'
      }
    });

    // Create signer records
    for (const borrower of borrowers) {
      await base44.asServiceRole.entities.DocuSignEnvelopeSigner.create({
        org_id: docuSign.org_id,
        envelope_id: envelope.id,
        borrower_id: borrower.id,
        email: borrower.email,
        name: borrower.full_name || borrower.email,
        role: borrower.is_primary ? 'Borrower' : 'Co-Borrower',
        status: 'sent',
        sent_at: send_now ? new Date().toISOString() : null
      });
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      org_id: docuSign.org_id,
      deal_id,
      action_type: 'envelope_sent',
      description: `DocuSign envelope sent for ${document_type}`,
      metadata_json: { envelope_id: envelopeId }
    });

    return Response.json({
      envelope_id: envelope.id,
      docusign_envelope_id: envelopeId,
      status: envelope.status,
      recipient_email,
      send_now
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});