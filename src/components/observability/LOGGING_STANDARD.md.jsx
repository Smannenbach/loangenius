# Structured Logging Standard - LoanGenius

## Overview
Standardized JSON logging format for consistent, searchable, and secure application logs.

---

## Log Event Schema

```typescript
interface LogEvent {
  // Required fields
  timestamp: string;           // ISO 8601 format
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;             // Human-readable description
  
  // Correlation
  trace_id?: string;           // Distributed trace ID
  span_id?: string;            // Current span ID
  request_id?: string;         // HTTP request ID
  
  // Identity (masked)
  org_id: string;              // Organization ID
  user_id_hash?: string;       // SHA256 hash of user ID (first 16 chars)
  
  // Action context
  action: string;              // Action being performed
  entity_type?: string;        // Entity type if applicable
  entity_id?: string;          // Entity ID if applicable
  
  // Outcome
  outcome: 'success' | 'failure' | 'denied' | 'pending';
  error_code?: string;         // Structured error code
  error_message?: string;      // Redacted error message
  
  // Environment
  env: string;                 // production | staging | development
  version: string;             // Application version
  function_name?: string;      // Backend function name
  route?: string;              // Frontend route or API path
  
  // Performance
  duration_ms?: number;        // Operation duration
  
  // Additional context
  metadata?: Record<string, any>; // Additional structured data (redacted)
}
```

---

## Log Levels

| Level | Use Case | Examples |
|-------|----------|----------|
| `debug` | Development only, verbose | Query parameters, internal state |
| `info` | Normal operations | User actions, successful operations |
| `warn` | Recoverable issues | Retries, deprecation warnings |
| `error` | Operation failed | API errors, validation failures |
| `fatal` | System unusable | Startup failures, critical dependencies down |

---

## Required Fields by Log Type

### Business Event Log
```json
{
  "timestamp": "2026-01-20T10:30:00.000Z",
  "level": "info",
  "message": "Lead imported successfully",
  "trace_id": "abc123",
  "org_id": "org_xyz",
  "user_id_hash": "a1b2c3d4e5f6g7h8",
  "action": "lead_import",
  "entity_type": "Lead",
  "entity_id": "lead_456",
  "outcome": "success",
  "env": "production",
  "version": "1.2.3",
  "function_name": "leadImport",
  "duration_ms": 1234,
  "metadata": {
    "source_type": "csv",
    "row_count": 50
  }
}
```

### Error Log
```json
{
  "timestamp": "2026-01-20T10:31:00.000Z",
  "level": "error",
  "message": "Lead import failed: validation error",
  "trace_id": "abc124",
  "org_id": "org_xyz",
  "user_id_hash": "a1b2c3d4e5f6g7h8",
  "action": "lead_import",
  "outcome": "failure",
  "error_code": "VALIDATION_ERROR",
  "error_message": "Invalid email format in row 5",
  "env": "production",
  "version": "1.2.3",
  "function_name": "leadImport",
  "metadata": {
    "row_index": 5,
    "field": "email"
  }
}
```

### Security Event Log
```json
{
  "timestamp": "2026-01-20T10:32:00.000Z",
  "level": "warn",
  "message": "Permission denied: unauthorized deal access",
  "trace_id": "abc125",
  "org_id": "org_xyz",
  "user_id_hash": "b2c3d4e5f6g7h8i9",
  "action": "deal_access",
  "entity_type": "Deal",
  "entity_id": "deal_789",
  "outcome": "denied",
  "error_code": "PERMISSION_DENIED",
  "env": "production",
  "version": "1.2.3",
  "metadata": {
    "attempted_action": "read",
    "user_role": "borrower",
    "reason": "cross_org_access"
  }
}
```

---

## Redaction Rules

### Never Log (Full Redaction)
```javascript
const NEVER_LOG_FIELDS = [
  'password',
  'password_hash',
  'ssn',
  'social_security_number',
  'ein',
  'tax_id',
  'bank_account_number',
  'routing_number',
  'credit_card_number',
  'cvv',
  'api_key',
  'api_secret',
  'access_token',
  'refresh_token',
  'secret_key',
  'private_key',
  'authorization'
];
```

### Mask (Partial Redaction)
```javascript
const MASK_FIELDS = {
  email: (v) => v.replace(/(.{2}).*@/, '$1***@'),
  phone: (v) => v.replace(/\d(?=\d{4})/g, '*'),
  date_of_birth: (v) => '****-**-' + v.slice(-2),
  ip_address: (v) => v.split('.').slice(0, 2).join('.') + '.*.*'
};
```

### Pattern Redaction
```javascript
const REDACT_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{9}\b/g, replacement: '[SSN]' },
  { pattern: /Bearer\s+[A-Za-z0-9\-_.]+/gi, replacement: 'Bearer [TOKEN]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
    replacement: (m) => m.slice(0,2) + '***@' + m.split('@')[1] }
];
```

---

## Logging Functions

### Frontend Logger
```javascript
// utils/logger.js
class Logger {
  constructor() {
    this.context = {};
  }
  
  setContext(ctx) {
    this.context = { ...this.context, ...ctx };
  }
  
  log(level, message, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...redactObject(data),
      env: process.env.NODE_ENV || 'production',
      route: window.location.pathname
    };
    
    // Send to backend
    navigator.sendBeacon('/api/log', JSON.stringify(event));
    
    // Also console log in development
    if (process.env.NODE_ENV === 'development') {
      console[level](event);
    }
  }
  
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

export const logger = new Logger();
```

### Backend Logger
```javascript
// In backend functions
function createLogger(req, context) {
  const trace_id = req.headers.get('x-trace-id') || generateTraceId();
  
  return {
    info: (message, data) => logEvent('info', message, { trace_id, ...context, ...data }),
    warn: (message, data) => logEvent('warn', message, { trace_id, ...context, ...data }),
    error: (message, data) => logEvent('error', message, { trace_id, ...context, ...data })
  };
}

async function logEvent(level, message, data) {
  const event = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redactObject(data)
  };
  
  // Store in AuditLog for persistence
  await base44.asServiceRole.entities.AuditLog.create({
    action_type: `LOG_${level.toUpperCase()}`,
    description: message,
    metadata: event
  });
}
```

---

## Security Event Requirements

### Events That MUST Be Logged

| Event | Level | Required Fields |
|-------|-------|-----------------|
| Login success | info | user_id_hash, ip_address |
| Login failure | warn | attempted_user, ip_address, reason |
| Logout | info | user_id_hash |
| Password reset request | warn | user_id_hash |
| Permission denied | warn | user_id_hash, action, resource, reason |
| Role change | warn | target_user_hash, old_role, new_role, changed_by |
| User deactivation | warn | target_user_hash, reason, deactivated_by |
| Suspicious access pattern | warn | user_id_hash, pattern_type, details |
| Cross-org access attempt | error | user_id_hash, attempted_org, reason |
| Admin action | info | user_id_hash, action, target |

---

## Log Protection

### Access Control
- Logs stored in AuditLog entity with org_id scoping
- Only super_admin and admin can view logs
- Logs cannot be modified or deleted by application users

### Integrity
- Logs include server-side timestamp (not client-provided)
- IP address captured server-side
- user_id derived from authenticated session

### Retention
- Security logs: 2 years minimum
- Business logs: 1 year
- Debug logs: 7 days

---

## Query Examples

### Find all actions by a user in a trace
```javascript
const logs = await AuditLog.filter({
  'metadata.trace_id': 'abc123'
}).sort('timestamp');
```

### Find all errors in last hour
```javascript
const errors = await AuditLog.filter({
  action_type: 'LOG_ERROR',
  created_date: { $gte: oneHourAgo }
});
```

### Find permission denials for a user
```javascript
const denials = await AuditLog.filter({
  action_type: 'PERMISSION_DENIED',
  'metadata.user_id_hash': userHash
});
```

---

## Change Log
- 2026-01-20: Initial logging standard created