/**
 * Create Stripe Checkout Session
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

    const body = await req.json();
    const { plan, interval = 'monthly' } = body;

    if (!plan || !['starter', 'professional'].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create billing account
    let billing = await base44.entities.BillingAccount.filter({ org_id: orgId });
    let stripeCustomerId;

    if (billing.length === 0) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: orgId, user_email: user.email },
      });
      stripeCustomerId = customer.id;

      await base44.asServiceRole.entities.BillingAccount.create({
        org_id: orgId,
        stripe_customer_id: stripeCustomerId,
        status: 'trialing',
        billing_email: user.email,
        seats_included: 1,
        seats_used: 0,
      });
    } else {
      stripeCustomerId = billing[0].stripe_customer_id;
    }

    // Map to Stripe Price IDs
    const priceIds = {
      starter_monthly: Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY'),
      starter_annual: Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL'),
      professional_monthly: Deno.env.get('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      professional_annual: Deno.env.get('STRIPE_PRICE_PROFESSIONAL_ANNUAL'),
    };

    const priceId = priceIds[`${plan}_${interval}`];
    if (!priceId) {
      return Response.json({ error: 'Plan not configured in Stripe' }, { status: 400 });
    }

    // SECURITY FIX: Validate origin against allowlist
    const ALLOWED_ORIGINS = [
      'https://app.loangenius.com',
      'https://portal.loangenius.com',
      'https://loangenius.base44.app'
    ];
    const requestOrigin = req.headers.get('origin');
    const origin = (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin))
      ? requestOrigin
      : 'https://app.loangenius.com';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${origin}/BillingSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Settings?tab=billing&checkout=canceled`,
      subscription_data: {
        metadata: {
          org_id: orgId,
          plan_name: plan,
        },
      },
      allow_promotion_codes: true,
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});