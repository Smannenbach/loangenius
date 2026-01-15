/**
 * Create and send DocuSign envelope for signature
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      org_id,
      deal_id,
      envelope_name,
      documents,
      signers,
      email_subject,
      email_body,
      send_immediately
    } = await req.json();

    if (!org_id || !deal_id || !envelope_name || !documents?.length || !signers?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get DocuSign settings
    const settings = await base44.asServiceRole.entities.DocuSignSettings.filter({
      org_id,
      is_connected: true
    });

    if (!settings.length) {
      return Response.json({ error: 'DocuSign not connected' }, { status: 400 });
    }

    const ds = settings[0];

    // Build envelope definition
    const envelopeDef = {
      emailSubject: email_subject || `Documents for Signature - ${envelope_name}`,
      emailBlurb: email_body || 'Please review and sign the attached documents.',
      status: send_immediately ? 'sent' : 'created',
      documents: documents.map((doc, i) => ({
        documentId: String(i + 1),
        name: doc.name,
        fileExtension: doc.file_extension || 'pdf',
        documentBase64: doc.file_base64 || ''
      })),
      recipients: {
        signers: signers.map((signer, i) => ({
          recipientId: String(i + 1),
          routingOrder: String(signer.routing_order || 1),
          name: signer.name,
          email: signer.email,
          roleName: signer.type,
          clientUserId: generateClientUserId(signer),
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '700'
              }
            ],
            dateSignedTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '300',
                yPosition: '700'
              }
            ]
          }
        }))
      },
      notification: {
        useAccountDefaults: false,
        reminders: {
          reminderEnabled: ds.reminder_enabled,
          reminderDelay: String(ds.reminder_delay_days),
          reminderFrequency: String(ds.reminder_frequency_days)
        },
        expirations: {
          expireEnabled: true,
          expireAfter: String(ds.expiration_days),
          expireWarn: '3'
        }
      }
    };

    // Create envelope via DocuSign API
    const response = await fetch(
      `${ds.base_uri}/restapi/v2.1/accounts/${ds.account_id}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ds.access_token_encrypted}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelopeDef)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('DocuSign error:', error);
      return Response.json({ error: 'Failed to create envelope' }, { status: 500 });
    }

    const dsEnvelope = await response.json();

    // Store envelope
    const envelope = await base44.asServiceRole.entities.DocuSignEnvelope.create({
      org_id,
      deal_id,
      envelope_id: dsEnvelope.envelopeId,
      envelope_name,
      status: send_immediately ? 'sent' : 'created',
      sent_at: send_immediately ? new Date().toISOString() : null,
      created_by: user.id,
      expires_at: new Date(Date.now() + ds.expiration_days * 24 * 3600 * 1000).toISOString()
    });

    // Store signers
    for (const signer of signers) {
      await base44.asServiceRole.entities.DocuSignEnvelopeSigner.create({
        org_id,
        envelope_id: envelope.id,
        signer_type: signer.type,
        borrower_id: signer.borrower_id,
        user_id: signer.user_id,
        name: signer.name,
        email: signer.email,
        routing_order: signer.routing_order || 1,
        status: send_immediately ? 'sent' : 'created',
        client_user_id: generateClientUserId(signer)
      });
    }

    return Response.json({
      success: true,
      envelope_id: envelope.id,
      docusign_envelope_id: dsEnvelope.envelopeId,
      status: envelope.status
    });
  } catch (error) {
    console.error('Error in createDocuSignEnvelope:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateClientUserId(signer) {
  return `${signer.email}-${Date.now()}`;
}