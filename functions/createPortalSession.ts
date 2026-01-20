/**
 * Create Stripe Customer Portal Session
 * Allows customers to manage their billing, update payment methods, view invoices
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
    if (memberships.length === 0) return Response.json({ error: 'No organization' }, { status: 403 });
    const orgId = memberships[0].org_id;

    // Get billing account
    const billing = await base44.entities.BillingAccount.filter({ org_id: orgId });
    if (billing.length === 0 || !billing[0].stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 404 });
    }

    const stripeCustomerId = billing[0].stripe_customer_id;
    const origin = req.headers.get('origin') || 'https://app.loangenius.com';

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/Settings?tab=billing`,
    });

    return Response.json({
      success: true,
      portal_url: session.url,
    });
  } catch (error) {
    console.error('Portal session creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});