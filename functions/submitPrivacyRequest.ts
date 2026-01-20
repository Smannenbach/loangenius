/**
 * Submit Privacy Request (GDPR/CCPA/CPRA)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateRequestId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PR-${dateStr}-${random}`;
}

function calculateDueDate(receivedAt, jurisdiction) {
  const received = new Date(receivedAt);
  
  if (jurisdiction === 'GDPR' || jurisdiction === 'UK_GDPR') {
    received.setMonth(received.getMonth() + 1);
    return received.toISOString();
  }
  
  if (jurisdiction === 'CCPA' || jurisdiction === 'CPRA') {
    received.setDate(received.getDate() + 45);
    return received.toISOString();
  }
  
  received.setDate(received.getDate() + 30);
  return received.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { full_name, email, phone, request_type, jurisdiction, description } = body;

    if (!full_name || !email || !request_type || !jurisdiction) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find org (if requester is associated with one)
    let orgId = 'public_request';
    const leads = await base44.asServiceRole.entities.Lead.filter({ home_email: email.toLowerCase() });
    if (leads.length > 0) {
      orgId = leads[0].org_id;
    }

    const requestId = generateRequestId();
    const receivedAt = new Date().toISOString();
    const dueAt = calculateDueDate(receivedAt, jurisdiction);

    const privacyRequest = await base44.asServiceRole.entities.PrivacyRequest.create({
      org_id: orgId,
      request_id: requestId,
      request_type,
      jurisdiction,
      requester_email: email.toLowerCase(),
      requester_phone: phone,
      requester_name: full_name,
      verification_status: 'not_started',
      status: 'received',
      received_at: receivedAt,
      due_at: dueAt,
      notes: description,
    });

    // Send confirmation email
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Privacy Request Received - ${requestId}`,
      body: `
We have received your privacy request.

Request ID: ${requestId}
Request Type: ${request_type.toUpperCase()}
Submitted: ${new Date(receivedAt).toLocaleDateString()}
Estimated Response: ${new Date(dueAt).toLocaleDateString()}

We will verify your identity and respond within the legally required timeframe.

If you have questions, please reply to this email with your Request ID.

Thank you,
LoanGenius Privacy Team
      `,
    });

    return Response.json({
      success: true,
      request_id: requestId,
      due_date: dueAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});