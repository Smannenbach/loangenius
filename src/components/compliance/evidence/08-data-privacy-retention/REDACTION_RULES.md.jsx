# Redaction Rules - LoanGenius

## Never Log (Full Redaction)

These values must NEVER appear in logs, errors, or debug output:

```javascript
const NEVER_LOG = [
  // Identity
  'ssn', 'social_security_number', 'tax_id', 'ein',
  'drivers_license', 'passport_number',
  
  // Financial
  'bank_account_number', 'account_number', 'routing_number',
  'credit_card_number', 'card_number', 'cvv', 'cvc',
  
  // Credentials
  'password', 'password_hash', 'secret',
  'api_key', 'access_token', 'refresh_token',
  'private_key', 'secret_key', 'auth_token'
];
```

---

## Mask (Partial Redaction)

These values should be masked when logged:

| Field Type | Masking Rule | Example |
|------------|--------------|---------|
| Email | Show first 2 chars + domain | `jo***@example.com` |
| Phone | Show last 4 digits | `***-***-1234` |
| SSN (display) | Show last 4 | `***-**-1234` |
| Name | First initial + *** | `J*** D***` |
| Address | Remove street number | `*** Main St` |
| Account | Show last 4 | `****1234` |

---

## Implementation

```javascript
const MASK_RULES = {
  email: (v) => v?.replace(/(.{2}).*@/, '$1***@'),
  phone: (v) => v?.replace(/\d(?=\d{4})/g, '*'),
  name: (v) => v?.split(' ').map(n => n[0] + '***').join(' '),
  ssn: (v) => '***-**-' + v?.slice(-4),
  account: (v) => '****' + v?.slice(-4),
};
```

---

## Log as Range Only

| Field | Range Format |
|-------|--------------|
| Credit score | 750+, 700-749, 650-699, <650 |
| Income | $500K+, $250K-500K, $100K-250K, <$100K |
| Loan amount | By $100K buckets |

---

## Error Messages

### Forbidden
```
Error: Invalid SSN: 123-45-6789
Error: Auth failed for token sk-abc123...
```

### Correct
```
Error: Invalid SSN format
Error: Authentication failed
```

---

## Audit Logging

When logging access to sensitive data:
- Log: user_id_hash, action, entity_type, entity_id
- Log: field names accessed (not values)
- Log: timestamp, outcome
- Do NOT log: actual field values

---

## Source Documents
- Full policy: `components/security/DATA_CLASSIFICATION.md`
- Logging policy: `components/compliance/evidence/01-policies/LOGGING_MONITORING_POLICY.md