# Error Monitoring Setup - LoanGenius

## Overview
Frontend and backend error capture using structured error handling with Base44's infrastructure.

---

## Implementation Architecture

### Frontend Error Capture

#### Global Error Handler
```javascript
// components/ErrorBoundary.js - Enhanced
window.addEventListener('error', (event) => {
  captureError({
    type: 'runtime_error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  captureError({
    type: 'unhandled_rejection',
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack
  });
});
```

#### Error Capture Function
```javascript
async function captureError(error, context = {}) {
  const payload = {
    // Identity (masked)
    org_id: context.org_id || 'unknown',
    user_id_hash: hashUserId(context.user_id),
    
    // Error details
    type: error.type || 'error',
    message: redactSensitiveData(error.message),
    stack: redactSensitiveData(error.stack),
    
    // Context
    env: process.env.NODE_ENV || 'production',
    version: APP_VERSION,
    route: window.location.pathname,
    feature_area: detectFeatureArea(window.location.pathname),
    
    // Breadcrumbs
    breadcrumbs: getBreadcrumbs(),
    
    // Request context
    url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    
    // Trace correlation
    trace_id: context.trace_id || generateTraceId()
  };
  
  await base44.functions.invoke('errorCapture', payload);
}
```

### Backend Error Capture

#### Wrapper Pattern
```javascript
// In every backend function
Deno.serve(async (req) => {
  const trace_id = req.headers.get('x-trace-id') || generateTraceId();
  
  try {
    // ... function logic
  } catch (error) {
    await logError({
      trace_id,
      function_name: 'functionName',
      error_type: error.name,
      message: redactSensitiveData(error.message),
      stack: redactSensitiveData(error.stack),
      request_path: new URL(req.url).pathname,
      org_id: context?.org_id,
      user_id_hash: hashUserId(context?.user?.email)
    });
    
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});
```

---

## Tagging Strategy

### Required Tags on Every Event

| Tag | Description | Example |
|-----|-------------|---------|
| `env` | Environment | `production`, `staging` |
| `version` | App release version | `1.2.3` |
| `org_id` | Organization (for multi-tenant) | `org_abc123` |
| `user_id_hash` | SHA256 hash of user email | `a1b2c3...` |
| `route` | Current page/endpoint | `/Pipeline`, `/api/leadImport` |
| `feature_area` | Functional area | `leads`, `deals`, `documents` |
| `trace_id` | Correlation ID | `trace_xyz789` |

### Feature Area Detection
```javascript
function detectFeatureArea(path) {
  const areas = {
    '/Leads': 'leads',
    '/Pipeline': 'pipeline',
    '/Loans': 'deals',
    '/Deal': 'deals',
    '/Documents': 'documents',
    '/Settings': 'settings',
    '/Portal': 'borrower_portal',
    '/Import': 'imports',
    '/Export': 'exports',
    '/MISMO': 'exports'
  };
  
  for (const [prefix, area] of Object.entries(areas)) {
    if (path.startsWith(prefix)) return area;
  }
  return 'other';
}
```

---

## Breadcrumb Capture

### Key Actions to Track
```javascript
const BREADCRUMB_ACTIONS = [
  'lead_import_started',
  'lead_import_completed',
  'lead_created',
  'lead_updated',
  'deal_created',
  'deal_stage_changed',
  'document_uploaded',
  'document_downloaded',
  'mismo_exported',
  'pdf_generated',
  'quote_sent',
  'user_login',
  'user_logout',
  'pipeline_filtered',
  'search_performed'
];

function addBreadcrumb(action, data = {}) {
  const breadcrumbs = JSON.parse(sessionStorage.getItem('breadcrumbs') || '[]');
  breadcrumbs.push({
    action,
    data: redactSensitiveData(data),
    timestamp: Date.now()
  });
  
  // Keep last 50 breadcrumbs
  if (breadcrumbs.length > 50) breadcrumbs.shift();
  sessionStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs));
}
```

---

## Data Redaction Rules

### Fields to NEVER Capture
```javascript
const REDACT_PATTERNS = [
  // SSN patterns
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b\d{9}\b/g,
  
  // Bank account
  /\b\d{10,17}\b/g,
  
  // Credit card
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // DOB
  /\b\d{2}\/\d{2}\/\d{4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  
  // Email (partially redact)
  /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  
  // Phone
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // API keys/tokens
  /Bearer\s+[A-Za-z0-9\-_]+/gi,
  /api[_-]?key[=:]\s*[A-Za-z0-9\-_]+/gi,
  /token[=:]\s*[A-Za-z0-9\-_]+/gi
];

function redactSensitiveData(text) {
  if (!text || typeof text !== 'string') return text;
  
  let redacted = text;
  
  // Apply pattern redactions
  for (const pattern of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  
  return redacted;
}
```

### User ID Hashing
```javascript
async function hashUserId(userId) {
  if (!userId) return 'anonymous';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'salt_loan_genius_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
```

---

## Release Tracking

### Version Tagging
```javascript
// Set in build process
const APP_VERSION = '1.0.0'; // Updated on each deploy

// Tag all errors with version
captureError(error, { version: APP_VERSION });
```

### Correlating Crashes to Deploys
- Each deploy updates `APP_VERSION`
- Error dashboard grouped by version
- Compare error rates between versions
- Rollback if new version shows spike

---

## Verification Steps

### 1. Test Frontend Error Capture
```javascript
// In browser console:
throw new Error('Test error from console');

// Verify error logged with:
// - trace_id
// - route
// - feature_area
// - breadcrumbs
```

### 2. Test Backend Error Capture
```bash
# Call function with invalid data
curl -X POST /api/leadImport \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid"}'

# Verify error logged in AuditLog with:
# - error details
# - trace_id
# - function_name
```

### 3. Test Redaction
```javascript
// Input with sensitive data
captureError(new Error('SSN 123-45-6789 failed validation'));

// Verify output shows:
// "SSN [REDACTED] failed validation"
```

---

## Error Dashboard Queries

### Error Rate by Feature Area
```javascript
const errors = await AuditLog.filter({
  action_type: 'ERROR',
  timestamp: { $gte: last24hours }
});

const byFeature = errors.reduce((acc, e) => {
  const area = e.metadata?.feature_area || 'unknown';
  acc[area] = (acc[area] || 0) + 1;
  return acc;
}, {});
```

### Error Rate by Version
```javascript
const errorsByVersion = errors.reduce((acc, e) => {
  const version = e.metadata?.version || 'unknown';
  acc[version] = (acc[version] || 0) + 1;
  return acc;
}, {});
```

---

## Change Log
- 2026-01-20: Initial error monitoring setup created