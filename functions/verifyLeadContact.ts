import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verify email or phone for a lead
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, type, value } = await req.json();

    if (!lead_id || !type || !value) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let isValid = false;

    if (type === 'email') {
      // Verify email using Reoon API
      try {
        const reoonToken = Deno.env.get('Reoon_Email_Verifier_API_Key');
        if (reoonToken) {
          const response = await fetch('https://www.verifyemailaddress.io/api/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: value,
              token: reoonToken,
            }),
          });

          const data = await response.json();
          isValid = data.result === 'valid' || data.result === 'ok';
        } else {
          // Fallback: Basic email validation
          isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }
      } catch (error) {
        console.error('Email verification error:', error);
        // Fallback to basic validation
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      // Determine which email field to update
      const lead = await base44.entities.Lead.list().then(leads => 
        leads.find(l => l.id === lead_id)
      );

      let fieldToUpdate = {};
      if (lead.home_email === value) {
        fieldToUpdate.home_email_verified = isValid;
      } else if (lead.work_email === value) {
        fieldToUpdate.work_email_verified = isValid;
      }

      await base44.entities.Lead.update(lead_id, fieldToUpdate);
    } else if (type === 'phone') {
      // Verify phone using Twilio Lookup API
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

        if (accountSid && authToken) {
          const response = await fetch(
            `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(value)}?Fields=line_type_intelligence`,
            {
              headers: {
                Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
              },
            }
          );

          const data = await response.json();
          isValid = response.ok && data.phone_number;
        } else {
          // Fallback: Basic phone validation
          isValid = /^\+?1?\d{9,15}$/.test(value.replace(/\D/g, ''));
        }
      } catch (error) {
        console.error('Phone verification error:', error);
        // Fallback to basic validation
        isValid = /^\+?1?\d{9,15}$/.test(value.replace(/\D/g, ''));
      }

      // Determine which phone field to update
      const lead = await base44.entities.Lead.list().then(leads => 
        leads.find(l => l.id === lead_id)
      );

      let fieldToUpdate = {};
      if (lead.mobile_phone === value) {
        fieldToUpdate.mobile_phone_verified = isValid;
      } else if (lead.home_phone === value) {
        fieldToUpdate.home_phone_verified = isValid;
      } else if (lead.work_phone === value) {
        fieldToUpdate.work_phone_verified = isValid;
      }

      await base44.entities.Lead.update(lead_id, fieldToUpdate);
    }

    return Response.json({
      success: true,
      type,
      value,
      isValid,
      message: isValid ? `${type} verified successfully` : `${type} verification failed`,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});