/**
 * Stripe Webhook Handler
 * CRITICAL: This is the source of truth for subscription state
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Map Stripe Price IDs to plan names
function getPlanFromPriceId(priceId) {
  const plans = {
    [Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY')]: { name: 'starter', interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL')]: { name: 'starter', interval: 'annual' },
    [Deno.env.get('STRIPE_PRICE_PROFESSIONAL_MONTHLY')]: { name: 'professional', interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_PROFESSIONAL_ANNUAL')]: { name: 'professional', interval: 'annual' },
  };
  return plans[priceId] || { name: 'unknown', interval: 'monthly' };
}

// Create entitlements for a plan
async function syncEntitlements(base44, orgId, planName) {
  const entitlements = {
    starter: {
      max_users: '3',
      max_leads_per_month: '100',
      max_deals_per_month: '10',
      storage_gb: '5',
      feature_google_sheets: 'false',
      feature_borrower_portal: 'false',
    },
    professional: {
      max_users: '10',
      max_leads_per_month: '1000',
      max_deals_per_month: '100',
      storage_gb: '50',
      feature_google_sheets: 'true',
      feature_borrower_portal: 'true',
      feature_advanced_analytics: 'true',
      feature_zapier: 'true',
    },
    enterprise: {
      max_users: 'unlimited',
      max_leads_per_month: 'unlimited',
      max_deals_per_month: 'unlimited',
      storage_gb: 'unlimited',
      feature_google_sheets: 'true',
      feature_borrower_portal: 'true',
      feature_advanced_analytics: 'true',
      feature_zapier: 'true',
      feature_custom_branding: 'true',
      feature_white_label: 'true',
    },
  };

  const planEntitlements = entitlements[planName] || entitlements.starter;

  // Delete existing entitlements
  const existing = await base44.asServiceRole.entities.Entitlement.filter({ org_id: orgId });
  for (const ent of existing) {
    await base44.asServiceRole.entities.Entitlement.update(ent.id, { is_active: false });
  }

  // Create new entitlements
  for (const [key, value] of Object.entries(planEntitlements)) {
    await base44.asServiceRole.entities.Entitlement.create({
      org_id: orgId,
      entitlement_key: key,
      entitlement_value: value,
      source: 'stripe',
      is_active: true,
      granted_at: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Check idempotency
    const existing = await base44.asServiceRole.entities.WebhookEventReceipt.filter({
      stripe_event_id: event.id,
    });

    if (existing.length > 0) {
      console.log(`Event ${event.id} already processed`);
      return Response.json({ received: true, already_processed: true });
    }

    // Log receipt
    const receipt = await base44.asServiceRole.entities.WebhookEventReceipt.create({
      stripe_event_id: event.id,
      event_type: event.type,
      received_at: new Date().toISOString(),
      processing_status: 'pending',
      payload: event.data.object,
    });

    // Process event
    try {
      await processEvent(base44, event);

      await base44.asServiceRole.entities.WebhookEventReceipt.update(receipt.id, {
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        outcome: 'success',
      });
    } catch (error) {
      await base44.asServiceRole.entities.WebhookEventReceipt.update(receipt.id, {
        processing_status: 'failed',
        error_message: error.message,
      });
      throw error;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processEvent(base44, event) {
  const eventType = event.type;
  const object = event.data.object;

  // Checkout completed
  if (eventType === 'checkout.session.completed') {
    const customerId = object.customer;
    const subscriptionId = object.subscription;

    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
      stripe_customer_id: customerId,
    });
    if (accounts.length === 0) throw new Error('Account not found');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const plan = getPlanFromPriceId(priceId);

    await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
      stripe_subscription_id: subscriptionId,
      plan_name: plan.name,
      plan_stripe_price_id: priceId,
      status: subscription.status,
      subscription_started_at: new Date(subscription.created * 1000).toISOString(),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    await syncEntitlements(base44, accounts[0].org_id, plan.name);
  }

  // Subscription updated
  if (eventType === 'customer.subscription.updated') {
    const subscription = object;
    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
      stripe_subscription_id: subscription.id,
    });
    if (accounts.length === 0) return;

    const priceId = subscription.items.data[0].price.id;
    const plan = getPlanFromPriceId(priceId);

    await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
      plan_name: plan.name,
      plan_stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    await syncEntitlements(base44, accounts[0].org_id, plan.name);
  }

  // Subscription deleted
  if (eventType === 'customer.subscription.deleted') {
    const subscription = object;
    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
      stripe_subscription_id: subscription.id,
    });
    if (accounts.length === 0) return;

    await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
      status: 'canceled',
      subscription_canceled_at: new Date().toISOString(),
    });

    // Revoke entitlements (downgrade to free tier)
    await syncEntitlements(base44, accounts[0].org_id, 'free');
  }

  // Invoice paid
  if (eventType === 'invoice.paid') {
    const invoice = object;
    const customerId = invoice.customer;
    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
      stripe_customer_id: customerId,
    });
    if (accounts.length === 0) return;

    await base44.asServiceRole.entities.InvoiceRecord.create({
      org_id: accounts[0].org_id,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription,
      status: 'paid',
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
    });

    // If was past_due, restore to active
    if (accounts[0].status === 'past_due') {
      await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
        status: 'active',
      });
    }
  }

  // Invoice payment failed
  if (eventType === 'invoice.payment_failed') {
    const invoice = object;
    const customerId = invoice.customer;
    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
      stripe_customer_id: customerId,
    });
    if (accounts.length === 0) return;

    await base44.asServiceRole.entities.BillingAccount.update(accounts[0].id, {
      status: 'past_due',
    });

    // Notify admins
    console.log(`Payment failed for org ${accounts[0].org_id}`);
  }
}