import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    const base44 = createClientFromRequest(req);

    // Extract envelope info from DocuSign webhook
    const {
      data: {
        envelopeId,
        envelopeStatus,
        recipientStatuses
      } = {}
    } = event;

    if (!envelopeId || !envelopeStatus) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Find envelope record by docusign envelope ID
    const envelopes = await base44.asServiceRole.entities.DocuSignEnvelope.filter({
      docusign_envelope_id: envelopeId
    });

    if (envelopes.length === 0) {
      return Response.json({ error: 'Envelope not found' }, { status: 404 });
    }

    const envelope = envelopes[0];

    // Map DocuSign status to our status
    const statusMap = {
      'sent': 'sent',
      'delivered': 'delivered',
      'completed': 'completed',
      'declined': 'declined',
      'voided': 'voided'
    };

    const newStatus = statusMap[envelopeStatus] || envelopeStatus.toLowerCase();

    // Update envelope
    await base44.asServiceRole.entities.DocuSignEnvelope.update(envelope.id, {
      status: newStatus,
      last_updated_at: new Date().toISOString(),
      metadata_json: {
        ...envelope.metadata_json,
        last_webhook_status: envelopeStatus,
        last_webhook_at: new Date().toISOString()
      }
    });

    // Update signer statuses
    if (recipientStatuses && Array.isArray(recipientStatuses)) {
      for (const signer of recipientStatuses) {
        const signers = await base44.asServiceRole.entities.DocuSignEnvelopeSigner.filter({
          envelope_id: envelope.id,
          email: signer.email
        });

        if (signers.length > 0) {
          const signerStatus = signer.status?.toLowerCase() || 'sent';
          await base44.asServiceRole.entities.DocuSignEnvelopeSigner.update(signers[0].id, {
            status: signerStatus,
            signed_at: signerStatus === 'completed' ? new Date().toISOString() : null,
            metadata_json: {
              delivery_status: signer.deliveryStatus,
              sign_date: signer.signedDate
            }
          });
        }
      }
    }

    // If completed, log and trigger downstream actions
    if (newStatus === 'completed') {
      await base44.asServiceRole.entities.ActivityLog.create({
        org_id: envelope.org_id,
        deal_id: envelope.deal_id,
        action_type: 'envelope_completed',
        description: `DocuSign envelope completed: ${envelope.document_type}`,
        metadata_json: { envelope_id: envelope.id, docusign_envelope_id: envelopeId }
      });

      // Create notification
      await base44.asServiceRole.entities.Notification.create({
        org_id: envelope.org_id,
        deal_id: envelope.deal_id,
        type: 'document_signed',
        title: 'Document Signed',
        message: `${envelope.document_type} has been signed by all parties`,
        is_read: false
      });
    }

    return Response.json({
      processed: true,
      envelope_id: envelope.id,
      status: newStatus
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});