import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_PRICES = {
  starter: 'price_1SreGhLNfhU6T1RjzDpuhnEI',
  professional: 'price_1SreGhLNfhU6T1RjcjQKaP6w',
  enterprise: 'price_1SreGhLNfhU6T1RjN73ikviQ',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, tenant_id, plan_id, return_url } = await req.json();

    if (action === 'create_checkout') {
      // Get tenant details
      const tenants = await base44.entities.TenantAccount.filter({ id: tenant_id });
      const tenant = tenants[0];
      
      if (!tenant) {
        return Response.json({ error: 'Tenant not found' }, { status: 404 });
      }

      const priceId = PLAN_PRICES[plan_id];
      if (!priceId) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Create or get Stripe customer
      let customerId = tenant.billing_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: tenant.admin_email,
          name: tenant.name,
          metadata: {
            tenant_id: tenant.id,
            base44_app_id: Deno.env.get('BASE44_APP_ID'),
          },
        });
        customerId = customer.id;
        
        // Update tenant with Stripe customer ID
        await base44.entities.TenantAccount.update(tenant.id, {
          billing_customer_id: customerId,
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${return_url}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${return_url}?canceled=true`,
        subscription_data: {
          metadata: {
            tenant_id: tenant.id,
            plan_id: plan_id,
          },
          trial_period_days: tenant.status === 'trial' ? 14 : undefined,
        },
        metadata: {
          tenant_id: tenant.id,
          plan_id: plan_id,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
        },
      });

      return Response.json({ checkout_url: session.url, session_id: session.id });
    }

    if (action === 'create_portal') {
      // Get tenant
      const tenants = await base44.entities.TenantAccount.filter({ id: tenant_id });
      const tenant = tenants[0];
      
      if (!tenant?.billing_customer_id) {
        return Response.json({ error: 'No billing account found' }, { status: 400 });
      }

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.billing_customer_id,
        return_url: return_url,
      });

      return Response.json({ portal_url: portalSession.url });
    }

    if (action === 'get_subscription') {
      const tenants = await base44.entities.TenantAccount.filter({ id: tenant_id });
      const tenant = tenants[0];
      
      if (!tenant?.billing_customer_id) {
        return Response.json({ subscription: null });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: tenant.billing_customer_id,
        status: 'all',
        limit: 1,
      });

      const sub = subscriptions.data[0];
      if (!sub) {
        return Response.json({ subscription: null });
      }

      return Response.json({
        subscription: {
          id: sub.id,
          status: sub.status,
          plan_id: sub.metadata.plan_id,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Tenant billing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});