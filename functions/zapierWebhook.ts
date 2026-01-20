import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'crypto';

// Verify Zapier webhook secret token
function verifyZapierToken(req) {
  const zapierSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
  if (!zapierSecret) return true; // Skip if not configured
  
  const providedToken = req.headers.get('X-Zapier-Token') || 
                        new URL(req.url).searchParams.get('token');
  
  if (!providedToken) return false;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(zapierSecret)
    );
  } catch {
    return false;
  }
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

function mapLeadFields(data, orgId) {
  return {
    org_id: orgId,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email?.toLowerCase(),
    phone: normalizePhone(data.phone || data.mobile_phone),
    mobile_phone: normalizePhone(data.mobile_phone),
    property_address: data.property_address,
    property_type: data.property_type,
    property_value: data.property_value ? Number(data.property_value) : null,
    loan_amount: data.loan_amount ? Number(data.loan_amount) : null,
    loan_purpose: data.loan_purpose,
    credit_score: data.credit_score ? Number(data.credit_score) : null,
    annual_income: data.annual_income ? Number(data.annual_income) : null,
    lead_source: data.lead_source,
    utm_campaign: data.utm_campaign,
    tcpa_consent: data.tcpa_consent === true || data.tcpa_consent === 'true',
    notes: data.notes,
    status: 'new'
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // SECURITY: Verify Zapier webhook token
    if (!verifyZapierToken(req)) {
      return Response.json({ error: 'Invalid or missing webhook token' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    // Get user's org_id for proper scoping
    const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
      user_id: user.email
    });
    const orgId = memberships[0]?.org_id;
    
    if (!orgId) {
      return Response.json({ error: 'User has no organization' }, { status: 400 });
    }

    // SECURITY: Filter by org_id to prevent cross-org data access
    const existingLead = await base44.asServiceRole.entities.Lead.filter({
      email: data.email?.toLowerCase(),
      org_id: orgId
    });

    let leadId;
    let action = 'created';

    if (existingLead && existingLead.length > 0) {
      // Update existing
      leadId = existingLead[0].id;
      await base44.asServiceRole.entities.Lead.update(leadId, mapLeadFields(data, orgId));
      action = 'updated';
    } else {
      // Create new with org_id
      const [newLead] = await base44.asServiceRole.entities.Lead.bulkCreate([mapLeadFields(data, orgId)]);
      leadId = newLead.id;
    }

    return Response.json({
      status: 'success',
      action,
      lead_id: leadId,
      message: `Lead ${action} successfully`
    });
  } catch (error) {
    console.error('Zapier webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});