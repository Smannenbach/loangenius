# Stripe Webhooks Specification

## Overview
Stripe webhooks are the **source of truth** for subscription state. The LoanGenius app must never rely on client-side success pages for provisioning.

## Webhook Endpoint

**URL**: `https://app.loangenius.com/functions/stripeWebhook`  
**Method**: POST  
**Authentication**: Stripe signature verification (required)

## Signature Verification (CRITICAL)

```javascript
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text(); // RAW body (not JSON parsed)

  let event;
  try {
    // ASYNC verification (Deno uses Web Crypto API)
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process event...
});
```

**Why async?** Deno's `SubtleCrypto` is async (Web standard). Using `constructEvent()` (synchronous) will throw error.

## Event Types to Handle (Allowlist)

### Subscription Lifecycle
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Checkout
- `checkout.session.completed`
- `checkout.session.expired`

### Invoices
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

### Payment Intents (if needed for additional signals)
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Reject unlisted event types**: Return 200 OK but skip processing.

## Idempotency (Prevent Double-Processing)

### Check if Already Processed
```javascript
const existingReceipt = await base44.asServiceRole.entities.WebhookEventReceipt.filter({
  stripe_event_id: event.id,
});

if (existingReceipt.length > 0) {
  console.log(`Event ${event.id} already processed`);
  return Response.json({ received: true, already_processed: true });
}
```

### Record Receipt Immediately
```javascript
const receipt = await base44.asServiceRole.entities.WebhookEventReceipt.create({
  stripe_event_id: event.id,
  event_type: event.type,
  received_at: new Date().toISOString(),
  processing_status: 'pending',
  payload: event.data.object, // Store for debugging
});
```

### Process Event
```javascript
try {
  await processEvent(event);
  
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
  throw error; // Stripe will retry
}
```

## Event Processing Logic

### `checkout.session.completed`
```javascript
const session = event.data.object;
const customerId = session.customer;
const subscriptionId = session.subscription;

// Find org by customer ID
const accounts = await base44.asServiceRole.entities.BillingAccount.filter({
  stripe_customer_id: customerId,
});

if (accounts.length === 0) {
  throw new Error(`No account found for customer ${customerId}`);
}

const account = accounts[0];

// Fetch subscription details
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
const priceId = subscription.items.data[0].price.id;
const plan = getPlanFromPriceId(priceId);

// Update account
await base44.asServiceRole.entities.BillingAccount.update(account.id, {
  stripe_subscription_id: subscriptionId,
  plan_name: plan.name,
  plan_stripe_price_id: priceId,
  status: subscription.status,
  subscription_started_at: new Date(subscription.created * 1000).toISOString(),
  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
});

// Create/update entitlements
await syncEntitlements(account.org_id, plan.name);
```

### `customer.subscription.updated`
Handle plan changes, status changes (active → past_due, etc.)

### `invoice.paid`
```javascript
const invoice = event.data.object;

// Record invoice
await base44.asServiceRole.entities.InvoiceRecord.create({
  org_id: account.org_id,
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

// Update account status (past_due → active if payment succeeded)
if (account.status === 'past_due') {
  await base44.asServiceRole.entities.BillingAccount.update(account.id, {
    status: 'active',
  });
}
```

### `invoice.payment_failed`
```javascript
// Update account to past_due
await base44.asServiceRole.entities.BillingAccount.update(account.id, {
  status: 'past_due',
});

// Send notification to org admins
await sendPaymentFailedNotification(account.org_id, invoice);
```

## Webhook Recovery (Missed Events)

### Manual Sync Button (Admin UI)
Admin can trigger "Sync with Stripe" which:
1. Fetches latest subscription status from Stripe API
2. Compares with LoanGenius database
3. Updates account + entitlements if mismatch
4. Logs sync action in audit trail

### List Undelivered Events (If Needed)
```javascript
const events = await stripe.events.list({
  type: 'customer.subscription.updated',
  created: { gte: timestamp_24_hours_ago },
  delivery_success: false, // Only failed deliveries
});

// Manually process missed events
for (const event of events.data) {
  await processEvent(event);
}
```

## Performance & Reliability

### Fast Response Required
- Stripe expects 2xx response within 5 seconds
- If processing takes longer: enqueue job, return 200 immediately

```javascript
// Acknowledge receipt immediately
await logWebhookReceipt(event.id, event.type);

// Enqueue processing (if heavy operation)
await enqueueJob('process_webhook', { event_id: event.id });

// Return 200
return Response.json({ received: true });
```

### Retry Strategy
- Stripe retries failed webhooks automatically
- Exponential backoff: immediate, 1 hour, 3 hours, 6 hours, 12 hours, 24 hours
- Continues retrying for ~3 days
- After 3 days: Stripe disables endpoint (sends alert)

**Our requirement**: Endpoint must succeed on first attempt (or early retry).

## Error Handling

### Non-Retryable Errors (Return 200)
- Unknown event type (not in allowlist) → log, skip processing, return 200
- Already processed (idempotency check) → return 200
- Invalid data format (log for investigation) → return 200

### Retryable Errors (Return 500)
- Database connection failure → return 500 (Stripe will retry)
- External API call timeout → return 500
- Unexpected exception → return 500

## Testing

### Test Mode (Stripe Test Keys)
- Use test mode Stripe keys during development
- Test events sent to webhook endpoint with `livemode: false`
- Can manually trigger test webhooks from Stripe Dashboard

### Stripe CLI (Local Testing)
```bash
stripe listen --forward-to localhost:3000/functions/stripeWebhook
stripe trigger customer.subscription.created
```

### Test Scenarios
1. **Subscription created**: Verify account status updated, entitlements granted
2. **Subscription updated**: Change plan → verify entitlements updated
3. **Subscription canceled**: Verify entitlements revoked
4. **Invoice paid**: Verify invoice record created, past_due → active
5. **Invoice failed**: Verify account → past_due, notification sent
6. **Duplicate event**: Send same event twice → verify processed only once
7. **Invalid signature**: Send event with wrong signature → verify rejected with 400

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Stripe Docs**: https://stripe.com/docs/webhooks