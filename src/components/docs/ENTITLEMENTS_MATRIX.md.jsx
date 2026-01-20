# Entitlements Matrix

## Plans & Pricing

| Plan | Monthly Price | Annual Price | Description |
|------|--------------|--------------|-------------|
| **Starter** | $99/mo | $990/yr (2 months free) | Small teams, basic features |
| **Professional** | $299/mo | $2,990/yr (2 months free) | Growing teams, advanced features |
| **Enterprise** | Custom | Custom | Large teams, white-label, unlimited |

## Feature Entitlements by Plan

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **User Seats** | 3 | 10 | Unlimited |
| **Leads per Month** | 100 | 1,000 | Unlimited |
| **Deals per Month** | 10 | 100 | Unlimited |
| **Storage** | 5 GB | 50 GB | Unlimited |
| **Google Sheets Import** | ❌ | ✅ | ✅ |
| **CSV Import/Export** | ✅ | ✅ | ✅ |
| **MISMO XML Export** | ❌ | ✅ | ✅ |
| **PDF Exports** | ✅ (watermarked) | ✅ | ✅ |
| **Borrower Portal** | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ❌ | ✅ |
| **White-Label** | ❌ | ❌ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ |
| **AI Lender Matching** | ❌ | ✅ | ✅ |
| **Zapier Integration** | ❌ | ✅ | ✅ |
| **Webhooks** | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ✅ (rate limited) | ✅ (unlimited) |
| **Email Support** | ✅ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **Dedicated Account Manager** | ❌ | ❌ | ✅ |
| **Custom Integrations** | ❌ | ❌ | ✅ |
| **SLA** | Best effort | 99% uptime | 99.9% uptime |

## Entitlement Keys (for Enforcement)

```json
{
  "max_users": "3" | "10" | "unlimited",
  "max_leads_per_month": "100" | "1000" | "unlimited",
  "max_deals_per_month": "10" | "100" | "unlimited",
  "storage_gb": "5" | "50" | "unlimited",
  "feature_google_sheets": "false" | "true" | "true",
  "feature_borrower_portal": "false" | "true" | "true",
  "feature_advanced_analytics": "false" | "true" | "true",
  "feature_zapier": "false" | "true" | "true",
  "feature_webhooks": "false" | "true" | "true",
  "feature_api_access": "false" | "true" | "true",
  "feature_custom_branding": "false" | "false" | "true",
  "feature_white_label": "false" | "false" | "true",
  "pdf_watermark": "true" | "false" | "false",
  "api_rate_limit_per_hour": "0" | "1000" | "unlimited"
}
```

## Stripe Price IDs (Configure in Stripe Dashboard)

```
STARTER_MONTHLY: price_starter_monthly_[xxx]
STARTER_ANNUAL: price_starter_annual_[xxx]
PROFESSIONAL_MONTHLY: price_professional_monthly_[xxx]
PROFESSIONAL_ANNUAL: price_professional_annual_[xxx]
ENTERPRISE: Custom quote (no self-service checkout)
```

## Usage Limits & Enforcement

### Hard Limits (Block Action)
- **Max Users**: Cannot invite user if `seats_used >= seats_included`
- **Storage**: Cannot upload if `storage_used_gb >= storage_gb_limit`

### Soft Limits (Warn, Allow Overage)
- **Leads/Deals per Month**: Show warning at 80%, upgrade CTA at 100%, allow overage but charge overage fee
- **API Rate Limit**: Return 429 Too Many Requests with `Retry-After` header

### Enforcement Points

#### UI Enforcement (User Experience)
- Disabled buttons with "Upgrade Required" tooltip
- Modal on click: "This feature requires [PLAN] plan. Upgrade now?"
- Checkout redirect to Stripe Checkout with pre-selected plan

#### API Enforcement (Security)
- Server-side entitlement check on every premium action
- Return 402 Payment Required or 403 Forbidden with upgrade URL
- Log blocked attempts for analytics

## Entitlement Sync (Stripe → LoanGenius)

### On Subscription Created (Webhook)
```javascript
// Event: customer.subscription.created
const subscription = event.data.object;
const plan = getPlanFromPriceId(subscription.items.data[0].price.id);

await base44.entities.BillingAccount.update(account.id, {
  status: subscription.status,
  plan_name: plan.name,
  stripe_subscription_id: subscription.id,
  subscription_started_at: new Date(subscription.created * 1000).toISOString(),
});

// Create entitlements for plan
await createEntitlementsForPlan(account.org_id, plan.name);
```

### On Subscription Updated (Upgrade/Downgrade)
```javascript
// Event: customer.subscription.updated
const oldPlan = previous_attributes.plan;
const newPlan = current.plan;

// Update account
await base44.entities.BillingAccount.update(account.id, {
  plan_name: newPlan,
  status: subscription.status,
});

// Update entitlements
await updateEntitlementsForPlan(account.org_id, newPlan);
```

### On Subscription Deleted (Cancellation)
```javascript
// Event: customer.subscription.deleted
await base44.entities.BillingAccount.update(account.id, {
  status: 'canceled',
  subscription_canceled_at: new Date().toISOString(),
});

// Revoke all premium entitlements (keep basic/free tier)
await revokeAllEntitlements(account.org_id);
```

### On Invoice Payment Failed
```javascript
// Event: invoice.payment_failed
await base44.entities.BillingAccount.update(account.id, {
  status: 'past_due',
});

// Send in-app notification: "Payment failed - Update payment method"
// UI shows upgrade CTA linking to Customer Portal
```

## Trial Period

### Default Trial
- All new orgs start with **14-day free trial** of Professional plan
- Full feature access during trial
- `trial_ends_at` auto-calculated on org creation
- 7 days before trial ends: Send upgrade reminder email

### Trial → Paid Conversion
- User clicks "Upgrade" → Stripe Checkout
- On successful payment: trial_ends_at cleared, status=active

### Trial Expiry (No Payment)
- At `trial_ends_at`: Downgrade to Starter plan (or free tier)
- Lock premium features
- Send "Trial Ended" email with upgrade CTA

## Enforcement Examples

### Example 1: Google Sheets Import (Professional+)
```javascript
// UI
const canImportSheets = entitlements.feature_google_sheets === 'true';
{canImportSheets ? (
  <Button onClick={openImportWizard}>Import from Sheets</Button>
) : (
  <Tooltip content="Requires Professional plan">
    <Button disabled onClick={() => showUpgradeModal('google_sheets')}>
      Import from Sheets 🔒
    </Button>
  </Tooltip>
)}

// API (backend function)
const entitlements = await getEntitlements(org_id);
if (entitlements.feature_google_sheets !== 'true') {
  return Response.json({
    error: 'Plan upgrade required',
    required_entitlement: 'feature_google_sheets',
    upgrade_url: '/billing/upgrade'
  }, { status: 402 });
}
```

### Example 2: User Seat Limit
```javascript
// Before inviting user
const account = await base44.entities.BillingAccount.filter({ org_id });
const memberships = await base44.entities.OrgMembership.filter({ org_id, status: 'active' });

if (memberships.length >= account.seats_included) {
  return Response.json({
    error: 'User seat limit reached',
    current_seats: memberships.length,
    max_seats: account.seats_included,
    upgrade_url: '/billing/upgrade'
  }, { status: 402 });
}
```

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Plan Details**: Subject to change, confirm latest pricing at loangenius.com/pricing