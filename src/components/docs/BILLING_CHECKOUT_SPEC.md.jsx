# Billing Checkout Specification (Stripe Checkout Integration)

## Overview
Integration with Stripe Checkout for subscription purchases and upgrades.

## Checkout Flow

### 1. User Clicks "Upgrade" Button
**Locations**:
- Billing settings page
- Disabled feature CTAs (e.g., "Upgrade to use Google Sheets Import")
- Trial expiry banner

**Parameters**:
- Selected plan (`starter`, `professional`, `enterprise`)
- Billing interval (`monthly`, `annual`)
- Pre-filled email (from user.email)

### 2. Backend Creates Checkout Session

**Endpoint**: `POST /functions/createCheckoutSession`

**Request**:
```json
{
  "plan": "professional",
  "interval": "monthly",
  "success_url": "https://app.loangenius.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://app.loangenius.com/billing/canceled"
}
```

**Backend Logic**:
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
  if (memberships.length === 0) return Response.json({ error: 'No org' }, { status: 403 });
  const orgId = memberships[0].org_id;

  const { plan, interval } = await req.json();

  // Get or create Stripe customer
  let billing = await base44.entities.BillingAccount.filter({ org_id: orgId });
  let stripeCustomerId;

  if (billing.length === 0) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { org_id: orgId }
    });
    stripeCustomerId = customer.id;

    await base44.entities.BillingAccount.create({
      org_id: orgId,
      stripe_customer_id: stripeCustomerId,
      status: 'trialing',
      billing_email: user.email,
    });
  } else {
    stripeCustomerId = billing[0].stripe_customer_id;
  }

  // Map plan to Stripe Price ID
  const priceIds = {
    'starter_monthly': Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY'),
    'starter_annual': Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL'),
    'professional_monthly': Deno.env.get('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'professional_annual': Deno.env.get('STRIPE_PRICE_PROFESSIONAL_ANNUAL'),
  };
  const priceId = priceIds[`${plan}_${interval}`];

  if (!priceId) {
    return Response.json({ error: 'Invalid plan or interval' }, { status: 400 });
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing/canceled`,
    subscription_data: {
      metadata: {
        org_id: orgId,
        plan_name: plan,
      },
    },
  });

  return Response.json({ checkout_url: session.url });
});
```

**Response**:
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### 3. Redirect to Stripe Checkout
**Frontend**:
```javascript
const { checkout_url } = await base44.functions.invoke('createCheckoutSession', {
  plan: 'professional',
  interval: 'monthly',
});

window.location.href = checkout_url;
```

### 4. User Completes Payment on Stripe
- User enters payment details on Stripe-hosted page
- Stripe processes payment
- Stripe redirects to `success_url` or `cancel_url`

### 5. Success/Cancel Pages

#### Success Page (`/billing/success`)
**Do NOT provision here!** Webhooks handle provisioning.

Show:
- "Payment processing... Please wait."
- Poll for subscription status every 2 seconds
- Once `status = active`: Show "Success! Your [PLAN] plan is now active."
- Redirect to dashboard after 5 seconds

#### Cancel Page (`/billing/canceled`)
Show:
- "Checkout canceled. No charges made."
- "Return to billing" button

### 6. Webhook Provisions Subscription
**Event**: `checkout.session.completed`

Stripe sends webhook → LoanGenius processes → updates `BillingAccount` + creates `Entitlements` → UI reflects new plan.

## Error Handling

### Payment Declined
- Stripe shows error on checkout page
- User can retry with different card
- No action needed in LoanGenius

### Webhook Delivery Failure
- Stripe retries webhooks automatically (exponential backoff, up to 3 days)
- LoanGenius webhook endpoint must be idempotent (check `WebhookEventReceipt.stripe_event_id`)
- Manual recovery: Admin can trigger "Sync with Stripe" button → fetches latest subscription status

### Session Expired
- Checkout sessions expire after 24 hours
- If user returns to success page with expired session: Show "Session expired, please try again"
- Generate new checkout session

## Testing Scenarios

1. **Starter Monthly**: Create checkout → complete payment → verify entitlements
2. **Professional Annual**: Create checkout → complete payment → verify discount applied
3. **Cancel Checkout**: Create checkout → cancel → verify no charges, no entitlement changes
4. **Upgrade**: Start with Starter → upgrade to Professional → verify prorated charge
5. **Downgrade**: Start with Professional → downgrade to Starter → verify schedule end-of-period
6. **Payment Declined**: Use Stripe test card `4000000000000002` → verify error handling
7. **Webhook Delay**: Complete checkout → delay webhook manually → verify polling eventually succeeds

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Integration**: Stripe Checkout (Subscription Mode)