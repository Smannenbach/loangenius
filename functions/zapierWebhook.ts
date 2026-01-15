import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'crypto';

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

function mapLeadFields(data) {
  return {
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

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const data = req.body;
    const normalizedPhone = normalizePhone(data.phone || data.mobile_phone);

    // Check for existing lead
    const existingLead = await base44.asServiceRole.entities.Lead.filter({
      email: data.email
    });

    let leadId;
    let action = 'created';

    if (existingLead && existingLead.length > 0) {
      // Update existing
      leadId = existingLead[0].id;
      await base44.asServiceRole.entities.Lead.update(leadId, mapLeadFields(data));
      action = 'updated';
    } else {
      // Create new
      const [newLead] = await base44.asServiceRole.entities.Lead.bulkCreate([mapLeadFields(data)]);
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