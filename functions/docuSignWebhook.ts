/**
 * DocuSign Connect Webhook Handler
 * Processes envelope status updates
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();

    // Parse XML or JSON payload from DocuSign
    const envelopeId = extractEnvelopeId(body);
    const event = extractEvent(body);

    if (!envelopeId || !event) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Find our envelope record
    const envelopes = await base44.asServiceRole.entities.DocuSignEnvelope.filter({
      envelope_id: envelopeId
    });

    if (!envelopes.length) {
      return Response.json({ success: true }); // Envelope not in our system
    }

    const envelope = envelopes[0];
    const updateData = {};

    // Map event to status
    const statusMap = {
      'envelope-sent': 'sent',
      'envelope-delivered': 'delivered',
      'recipient-completed': 'signed',
      'envelope-completed': 'completed',
      'envelope-declined': 'declined',
      'envelope-voided': 'voided'
    };

    const newStatus = statusMap[event];
    if (newStatus) {
      updateData.status = newStatus;
      updateData.status_changed_at = new Date().toISOString();

      if (newStatus === 'sent') updateData.sent_at = new Date().toISOString();
      if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
      if (newStatus === 'signed') updateData.signed_at = new Date().toISOString();
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();
      if (newStatus === 'declined') updateData.declined_at = new Date().toISOString();
      if (newStatus === 'voided') updateData.voided_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.DocuSignEnvelope.update(envelope.id, updateData);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in docuSignWebhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractEnvelopeId(body) {
  // Parse XML or JSON to extract envelope ID
  const match = body.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/) || 
                body.match(/"envelopeId"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function extractEvent(body) {
  // Map DocuSign event to our event names
  if (body.includes('envelope-sent')) return 'envelope-sent';
  if (body.includes('envelope-delivered')) return 'envelope-delivered';
  if (body.includes('recipient-completed')) return 'recipient-completed';
  if (body.includes('envelope-completed')) return 'envelope-completed';
  if (body.includes('envelope-declined')) return 'envelope-declined';
  if (body.includes('envelope-voided')) return 'envelope-voided';
  return null;
}