# OpenTelemetry Instrumentation Plan - LoanGenius

## Overview
Distributed tracing and metrics collection using OpenTelemetry-compatible patterns for Base44.

---

## Trace Architecture

### Trace Flow
```
[Browser] → [Backend Function] → [Database/External API]
    ↓              ↓                      ↓
  span_1        span_2                 span_3
    └──────────────┴──────────────────────┘
                   trace_id
```

### Correlation Header Propagation
```javascript
// Frontend: Add trace headers to all API calls
const trace_id = generateTraceId();
const span_id = generateSpanId();

fetch('/api/function', {
  headers: {
    'x-trace-id': trace_id,
    'x-span-id': span_id,
    'x-parent-span-id': parent_span_id
  }
});

// Backend: Extract and propagate
const trace_id = req.headers.get('x-trace-id') || generateTraceId();
const parent_span_id = req.headers.get('x-span-id');
```

---

## Instrumented Operations

### Frontend Spans

| Span Name | Trigger | Attributes |
|-----------|---------|------------|
| `page.load` | Page navigation | `route`, `load_time_ms` |
| `auth.login` | Login attempt | `success`, `method` |
| `lead.create` | Lead form submit | `org_id`, `source` |
| `lead.import` | Import wizard complete | `row_count`, `source_type` |
| `deal.create` | Deal creation | `loan_product`, `org_id` |
| `deal.stage_change` | Stage update | `from_stage`, `to_stage` |
| `document.upload` | File upload | `doc_type`, `file_size_kb` |
| `document.download` | File download | `doc_type` |
| `export.mismo` | MISMO export | `deal_id`, `format` |
| `export.pdf` | PDF generation | `template_type` |
| `search.execute` | Search performed | `entity_type`, `result_count` |

### Backend Spans

| Span Name | Function | Attributes |
|-----------|----------|------------|
| `api.leadImport` | leadImport.js | `action`, `row_count`, `org_id` |
| `api.createDeal` | createOrUpdateDeal.js | `action`, `org_id` |
| `api.documentUpload` | documentPresignUpload.js | `doc_type`, `size_bytes` |
| `api.mismoExport` | generateMISMO34.js | `deal_id`, `profile_id` |
| `api.sendEmail` | sendCommunication.js | `channel`, `template_id` |
| `db.query` | Any entity operation | `entity`, `operation`, `count` |
| `external.googleSheets` | Google Sheets API | `spreadsheet_id` |
| `external.lender` | Lender API call | `lender_name`, `status` |

---

## Span Implementation

### Frontend Tracing Hook
```javascript
// hooks/useTracing.js
import { useRef, useCallback } from 'react';

export function useTracing() {
  const activeSpans = useRef(new Map());
  
  const startSpan = useCallback((name, attributes = {}) => {
    const span_id = generateSpanId();
    const trace_id = getActiveTraceId() || generateTraceId();
    
    const span = {
      span_id,
      trace_id,
      name,
      start_time: performance.now(),
      attributes: {
        ...attributes,
        route: window.location.pathname,
        org_id: getCurrentOrgId()
      }
    };
    
    activeSpans.current.set(span_id, span);
    return span_id;
  }, []);
  
  const endSpan = useCallback((span_id, status = 'ok', error = null) => {
    const span = activeSpans.current.get(span_id);
    if (!span) return;
    
    const duration_ms = performance.now() - span.start_time;
    
    logTelemetry({
      type: 'span',
      ...span,
      duration_ms,
      status,
      error: error ? redactSensitiveData(error.message) : null,
      end_time: Date.now()
    });
    
    activeSpans.current.delete(span_id);
  }, []);
  
  return { startSpan, endSpan };
}
```

### Backend Span Wrapper
```javascript
// Wrap operations in backend functions
async function withSpan(name, attributes, operation) {
  const span_id = generateSpanId();
  const start = performance.now();
  
  try {
    const result = await operation();
    
    await logSpan({
      span_id,
      trace_id: getTraceId(),
      name,
      duration_ms: performance.now() - start,
      status: 'ok',
      attributes
    });
    
    return result;
  } catch (error) {
    await logSpan({
      span_id,
      trace_id: getTraceId(),
      name,
      duration_ms: performance.now() - start,
      status: 'error',
      error: redactSensitiveData(error.message),
      attributes
    });
    
    throw error;
  }
}

// Usage
const leads = await withSpan('db.query', 
  { entity: 'Lead', operation: 'filter' },
  () => base44.entities.Lead.filter({ org_id })
);
```

---

## Metrics Collection

### Key Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_ms` | Histogram | `route`, `method`, `status` | API latency |
| `http_request_total` | Counter | `route`, `method`, `status` | Request count |
| `error_total` | Counter | `type`, `feature_area` | Error count |
| `import_duration_ms` | Histogram | `source_type`, `org_id` | Import job duration |
| `import_rows_total` | Counter | `source_type`, `status` | Rows processed |
| `export_duration_ms` | Histogram | `format`, `org_id` | Export duration |
| `document_upload_size_bytes` | Histogram | `doc_type` | Upload sizes |
| `active_deals` | Gauge | `stage`, `org_id` | Deals by stage |

### Metric Recording
```javascript
// Backend metric recording
async function recordMetric(name, value, labels = {}) {
  await base44.asServiceRole.entities.Metric.create({
    name,
    value,
    labels: JSON.stringify(labels),
    timestamp: new Date().toISOString()
  });
}

// Usage
await recordMetric('import_duration_ms', duration, {
  source_type: 'csv',
  org_id: org_id
});
```

---

## Naming Conventions

### Span Names
- Format: `{domain}.{operation}`
- Examples: `api.leadImport`, `db.query`, `external.googleSheets`

### Attribute Names
- Use snake_case
- Prefix with domain when ambiguous
- Examples: `org_id`, `deal_stage`, `file_size_bytes`

### Allowed Attributes (Whitelist)

**Always Include:**
- `org_id`
- `trace_id`
- `span_id`
- `route`
- `status`
- `duration_ms`

**Conditionally Include:**
- `entity_type` (for DB operations)
- `row_count` (for bulk operations)
- `error_type` (when status=error)

**Never Include:**
- PII (names, emails, phones, SSN)
- Tokens or secrets
- Full request/response bodies

---

## Sampling Strategy

### Head-Based Sampling
```javascript
function shouldSample(trace_id) {
  // Sample 100% of errors
  // Sample 10% of normal traffic
  // Sample 100% of slow requests (>5s)
  
  const SAMPLE_RATE = 0.1;
  const hash = hashTraceId(trace_id);
  return hash < SAMPLE_RATE * 0xFFFFFFFF;
}
```

### Priority Sampling
- Errors: Always sample (100%)
- Slow requests (>5s): Always sample
- Import/Export: Always sample
- Normal requests: 10% sample rate

---

## Log-Trace Correlation

### Structured Log Format
```javascript
const logEntry = {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Lead import completed',
  
  // Trace correlation
  trace_id: trace_id,
  span_id: span_id,
  
  // Context
  org_id: org_id,
  user_id_hash: hashUserId(user.email),
  
  // Operation details
  action: 'lead_import',
  imported_count: 50,
  duration_ms: 1234
};
```

### Query Pattern
```javascript
// Find all logs for a trace
const logs = await AuditLog.filter({
  'metadata.trace_id': trace_id
}).sort('timestamp');

// Reconstruct user journey
const journey = logs.map(l => ({
  time: l.timestamp,
  action: l.action_type,
  span: l.metadata.span_id
}));
```

---

## Change Log
- 2026-01-20: Initial OTEL instrumentation plan created