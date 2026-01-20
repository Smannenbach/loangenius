# Audit Logging Specification - LoanGenius

## Overview
Structured audit logging for compliance, security, and debugging purposes.

---

## Event Schema

```typescript
interface AuditEvent {
  // Identity
  id: string;                    // Auto-generated
  timestamp: string;             // ISO 8601
  
  // Context
  org_id: string;                // Organization ID
  user_id: string;               // Acting user ID/email
  user_role: string;             // Role at time of action
  
  // Action
  action: AuditAction;           // Enum of action types
  entity_type: string;           // Resource type
  entity_id: string;             // Resource ID (if applicable)
  entity_name?: string;          // Human-readable identifier
  
  // Outcome
  outcome: 'success' | 'failure' | 'denied';
  error_message?: string;        // If failure
  
  // Request Context
  ip_address: string;            // Client IP
  user_agent: string;            // Browser/client info
  request_id?: string;           // Correlation ID
  
  // Change Details
  old_values?: object;           // Previous state (masked)
  new_values?: object;           // New state (masked)
  changed_fields?: string[];     // List of changed fields
  
  // Metadata
  metadata?: object;             // Additional context
  severity: 'Info' | 'Warning' | 'Critical';
}
```

---

## Audit Action Types

### Authentication Events
| Action | Description | Severity |
|--------|-------------|----------|
| `AUTH_LOGIN` | User logged in | Info |
| `AUTH_LOGOUT` | User logged out | Info |
| `AUTH_LOGIN_FAILED` | Failed login attempt | Warning |
| `AUTH_PASSWORD_RESET` | Password reset requested | Warning |
| `AUTH_MFA_ENABLED` | MFA enabled | Info |
| `AUTH_MFA_DISABLED` | MFA disabled | Warning |
| `AUTH_SESSION_EXPIRED` | Session timeout | Info |

### Data Events - Leads
| Action | Description | Severity |
|--------|-------------|----------|
| `LEAD_CREATED` | New lead created | Info |
| `LEAD_UPDATED` | Lead data modified | Info |
| `LEAD_DELETED` | Lead deleted/archived | Warning |
| `LEAD_STATUS_CHANGED` | Lead status changed | Info |
| `LEAD_CONVERTED` | Lead converted to deal | Info |
| `LEAD_IMPORTED` | Leads imported from file | Info |
| `LEAD_EXPORTED` | Leads exported | Warning |

### Data Events - Deals
| Action | Description | Severity |
|--------|-------------|----------|
| `DEAL_CREATED` | New deal created | Info |
| `DEAL_UPDATED` | Deal data modified | Info |
| `DEAL_DELETED` | Deal deleted/archived | Critical |
| `DEAL_STAGE_CHANGED` | Deal stage advanced | Info |
| `DEAL_ASSIGNED` | Deal assigned to user | Info |
| `DEAL_APPROVED` | Deal approved by UW | Info |
| `DEAL_DENIED` | Deal denied | Warning |

### Data Events - Borrowers
| Action | Description | Severity |
|--------|-------------|----------|
| `BORROWER_CREATED` | New borrower created | Info |
| `BORROWER_UPDATED` | Borrower data modified | Info |
| `BORROWER_DELETED` | Borrower deleted | Critical |
| `BORROWER_PII_ACCESSED` | PII fields viewed | Warning |

### Document Events
| Action | Description | Severity |
|--------|-------------|----------|
| `DOCUMENT_UPLOADED` | Document uploaded | Info |
| `DOCUMENT_DOWNLOADED` | Document downloaded | Info |
| `DOCUMENT_APPROVED` | Document approved | Info |
| `DOCUMENT_REJECTED` | Document rejected | Info |
| `DOCUMENT_DELETED` | Document deleted | Warning |
| `DOCUMENT_WAIVED` | Requirement waived | Warning |

### Export Events
| Action | Description | Severity |
|--------|-------------|----------|
| `EXPORT_MISMO` | MISMO XML exported | Warning |
| `EXPORT_PDF` | PDF generated | Info |
| `EXPORT_CSV` | CSV exported | Warning |
| `EXPORT_FEE_WORKSHEET` | Fee worksheet generated | Info |
| `EXPORT_REPORT` | Report exported | Warning |

### Import Events
| Action | Description | Severity |
|--------|-------------|----------|
| `IMPORT_STARTED` | Import job started | Info |
| `IMPORT_COMPLETED` | Import job completed | Info |
| `IMPORT_FAILED` | Import job failed | Warning |

### Permission Events
| Action | Description | Severity |
|--------|-------------|----------|
| `USER_INVITED` | User invited to org | Info |
| `USER_ROLE_CHANGED` | User role modified | Warning |
| `USER_DEACTIVATED` | User deactivated | Warning |
| `USER_REACTIVATED` | User reactivated | Info |
| `PERMISSION_DENIED` | Access denied | Warning |

### System Events
| Action | Description | Severity |
|--------|-------------|----------|
| `SETTING_CHANGED` | Org setting modified | Warning |
| `INTEGRATION_CONNECTED` | External integration connected | Info |
| `INTEGRATION_DISCONNECTED` | External integration removed | Warning |
| `WEBHOOK_FIRED` | Webhook triggered | Info |
| `AUTOMATION_TRIGGERED` | Automation executed | Info |

---

## Redaction Rules

### Fields to NEVER Log (Full Redaction)
```javascript
const NEVER_LOG = [
  'password', 'password_hash',
  'api_key', 'api_secret',
  'access_token', 'refresh_token',
  'secret_key', 'private_key',
  'credit_card_number', 'cvv',
  'bank_account_number', 'routing_number'
];
```

### Fields to Mask (Partial Redaction)
```javascript
const MASK_RULES = {
  ssn: (val) => `***-**-${val.slice(-4)}`,          // Last 4 only
  ein: (val) => `**-***${val.slice(-4)}`,           // Last 4 only
  date_of_birth: (val) => `****-**-${val.slice(-2)}`, // Day only
  phone: (val) => `***-***-${val.slice(-4)}`,       // Last 4 only
  email: (val) => {                                  // Partial mask
    const [local, domain] = val.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  },
  ip_address: (val) => val.split('.').slice(0, 2).join('.') + '.*.* ', // First 2 octets
};
```

### Implementation
```javascript
function maskSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj };
  
  // Full redaction
  for (const field of NEVER_LOG) {
    if (masked[field]) masked[field] = '[REDACTED]';
  }
  
  // Partial masking
  for (const [field, maskFn] of Object.entries(MASK_RULES)) {
    if (masked[field] && typeof masked[field] === 'string') {
      masked[field] = maskFn(masked[field]);
    }
  }
  
  return masked;
}
```

---

## Retention Policy

| Event Type | Retention Period | Notes |
|------------|------------------|-------|
| Authentication | 2 years | Compliance requirement |
| Data Changes | 7 years | TRID/RESPA compliance |
| Document Access | 7 years | Audit trail |
| Permission Changes | 7 years | Security audit |
| Export Events | 7 years | Data governance |
| System Events | 1 year | Operational |

---

## Access Control for Audit Logs

| Role | Can View | Can Export | Can Delete |
|------|----------|------------|------------|
| Super Admin | All | All | Archive only |
| Admin | Own org | Own org | ❌ |
| Compliance | Own org | Own org | ❌ |
| All Others | ❌ | ❌ | ❌ |

---

## Query Examples

### Get user's recent actions
```javascript
const logs = await AuditLog.filter({
  user_id: user.email,
  timestamp: { $gte: last30days }
}).sort('-timestamp').limit(100);
```

### Get deal activity timeline
```javascript
const logs = await AuditLog.filter({
  entity_type: 'Deal',
  entity_id: dealId
}).sort('-timestamp');
```

### Get failed access attempts
```javascript
const logs = await AuditLog.filter({
  outcome: 'denied',
  org_id: orgId,
  timestamp: { $gte: last24hours }
});
```

### Get document download history
```javascript
const logs = await AuditLog.filter({
  action: 'DOCUMENT_DOWNLOADED',
  entity_id: documentId
});
```

---

## Integration Points

### Backend Function Hook
```javascript
// In every backend function that modifies data:
async function logAudit(base44, event) {
  await base44.asServiceRole.entities.AuditLog.create({
    ...event,
    timestamp: new Date().toISOString(),
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    old_values: maskSensitiveFields(event.old_values),
    new_values: maskSensitiveFields(event.new_values),
  });
}
```

### Entity Automation
- Create automation trigger on AuditLog for critical events
- Send alerts for security-relevant events (failed logins, permission denials)

---

## Sample Logged Events

### Login Event
```json
{
  "timestamp": "2026-01-20T10:30:00.000Z",
  "org_id": "org_123",
  "user_id": "john@example.com",
  "user_role": "loan_officer",
  "action": "AUTH_LOGIN",
  "entity_type": "User",
  "entity_id": "user_456",
  "outcome": "success",
  "ip_address": "192.168.*.*",
  "user_agent": "Mozilla/5.0...",
  "severity": "Info"
}
```

### Deal Stage Change
```json
{
  "timestamp": "2026-01-20T11:00:00.000Z",
  "org_id": "org_123",
  "user_id": "jane@example.com",
  "user_role": "processor",
  "action": "DEAL_STAGE_CHANGED",
  "entity_type": "Deal",
  "entity_id": "deal_789",
  "entity_name": "LG-202601-0042",
  "outcome": "success",
  "old_values": { "stage": "processing" },
  "new_values": { "stage": "underwriting" },
  "changed_fields": ["stage"],
  "severity": "Info"
}
```

### Permission Denied
```json
{
  "timestamp": "2026-01-20T12:00:00.000Z",
  "org_id": "org_123",
  "user_id": "bob@example.com",
  "user_role": "borrower",
  "action": "PERMISSION_DENIED",
  "entity_type": "Deal",
  "entity_id": "deal_999",
  "outcome": "denied",
  "error_message": "Borrowers cannot access other borrowers' deals",
  "severity": "Warning",
  "metadata": {
    "attempted_action": "read",
    "reason": "cross_tenant_access"
  }
}
```

---

## Change Log
- 2026-01-20: Initial audit logging specification created