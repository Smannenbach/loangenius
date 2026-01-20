import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Processing Stripe event:', event.type);

    const { type, data } = event;
    const obj = data.object;

    switch (type) {
      case 'checkout.session.completed': {
        const tenantId = obj.metadata?.tenant_id;
        const planId = obj.metadata?.plan_id;
        
        if (tenantId && planId) {
          // Update tenant status
          await base44.asServiceRole.entities.TenantAccount.update(tenantId, {
            status: 'active',
            subscription_status: 'active',
            plan_id: planId,
          });
          
          // Create or update TenantSubscription
          const existing = await base44.asServiceRole.entities.TenantSubscription.filter({ tenant_id: tenantId });
          const subData = {
            tenant_id: tenantId,
            stripe_subscription_id: obj.subscription,
            stripe_customer_id: obj.customer,
            plan_id: planId,
            status: 'active',
            billing_email: obj.customer_email,
          };
          
          if (existing.length > 0) {
            await base44.asServiceRole.entities.TenantSubscription.update(existing[0].id, subData);
          } else {
            await base44.asServiceRole.entities.TenantSubscription.create(subData);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const tenantId = obj.metadata?.tenant_id;
        if (tenantId) {
          const status = obj.status;
          const planId = obj.metadata?.plan_id;
          
          await base44.asServiceRole.entities.TenantAccount.update(tenantId, {
            subscription_status: status,
            status: status === 'active' ? 'active' : status === 'past_due' ? 'active' : 'suspended',
          });
          
          // Update TenantSubscription
          const existing = await base44.asServiceRole.entities.TenantSubscription.filter({ tenant_id: tenantId });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.TenantSubscription.update(existing[0].id, {
              status,
              current_period_start: new Date(obj.current_period_start * 1000).toISOString(),
              current_period_end: new Date(obj.current_period_end * 1000).toISOString(),
              cancel_at_period_end: obj.cancel_at_period_end,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const tenantId = obj.metadata?.tenant_id;
        if (tenantId) {
          await base44.asServiceRole.entities.TenantAccount.update(tenantId, {
            subscription_status: 'canceled',
            status: 'canceled',
          });
          
          const existing = await base44.asServiceRole.entities.TenantSubscription.filter({ tenant_id: tenantId });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.TenantSubscription.update(existing[0].id, {
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const tenantId = obj.metadata?.tenant_id || obj.subscription_details?.metadata?.tenant_id;
        if (tenantId) {
          const existing = await base44.asServiceRole.entities.TenantSubscription.filter({ tenant_id: tenantId });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.TenantSubscription.update(existing[0].id, {
              last_invoice_id: obj.id,
              last_invoice_status: 'paid',
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const tenantId = obj.metadata?.tenant_id || obj.subscription_details?.metadata?.tenant_id;
        if (tenantId) {
          await base44.asServiceRole.entities.TenantAccount.update(tenantId, {
            subscription_status: 'past_due',
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});