# API Security Checklist - LoanGenius

## Overview
API security controls based on OWASP ASVS V5 (Validation), V4 (Access Control), and V13 (API).

---

## ASVS Coverage

| ASVS Section | Control | Status |
|--------------|---------|--------|
| V4.1 | Access Control Design | ✅ RBAC |
| V4.2 | Operation Level Access | ✅ Implemented |
| V4.3 | Other Access Control | ✅ Org scoping |
| V5.1 | Input Validation | ✅ Schema-based |
| V5.2 | Sanitization | ✅ Implemented |
| V5.3 | Output Encoding | ✅ Implemented |
| V13.1 | Generic API Security | ✅ Implemented |
| V13.2 | RESTful API | ✅ Implemented |

---

## Server-Side Validation

### Required for All Endpoints
```javascript
async function validateRequest(req, schema) {
  const body = await req.json();
  
  // 1. Type validation
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    
    // Required field check
    if (rules.required && (value === undefined || value === null)) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
    
    // Type check
    if (value !== undefined && typeof value !== rules.type) {
      throw new ValidationError(`Invalid type for ${field}`);
    }
    
    // Enum check
    if (rules.enum && !rules.enum.includes(value)) {
      throw new ValidationError(`Invalid value for ${field}`);
    }
    
    // Length check
    if (rules.maxLength && value?.length > rules.maxLength) {
      throw new ValidationError(`${field} exceeds max length`);
    }
    
    // Pattern check
    if (rules.pattern && !rules.pattern.test(value)) {
      throw new ValidationError(`Invalid format for ${field}`);
    }
  }
  
  return body;
}
```

### Common Validation Schemas
```javascript
const SCHEMAS = {
  lead: {
    first_name: { type: 'string', maxLength: 100 },
    last_name: { type: 'string', maxLength: 100 },
    email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { type: 'string', pattern: /^\+?[\d\s\-()]+$/ },
    loan_amount: { type: 'number', min: 0, max: 100000000 }
  },
  deal: {
    loan_product: { type: 'string', enum: ['DSCR', 'Conventional', ...] },
    loan_purpose: { type: 'string', enum: ['Purchase', 'Refinance', ...] },
    loan_amount: { type: 'number', required: true, min: 0 }
  }
};
```

---

## Input Sanitization

### Sanitization Functions
```javascript
// Strip dangerous characters
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Sanitize HTML (if allowed)
function sanitizeHtml(input) {
  const allowedTags = ['p', 'b', 'i', 'u', 'br', 'ul', 'ol', 'li'];
  // Use DOMPurify or similar
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: allowedTags });
}

// Sanitize for database query (prevent NoSQL injection)
function sanitizeQuery(input) {
  if (typeof input === 'object' && input !== null) {
    // Check for MongoDB operators
    for (const key of Object.keys(input)) {
      if (key.startsWith('$')) {
        throw new ValidationError('Invalid query operator');
      }
    }
  }
  return input;
}
```

---

## Output Encoding

### JSON Response Encoding
```javascript
function safeJsonResponse(data) {
  // Ensure proper JSON encoding
  return Response.json(data, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
```

### HTML Encoding (if needed)
```javascript
function encodeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

## Access Control

### Operation-Level Checks
```javascript
// Every endpoint MUST check authorization
async function authorizedOperation(req, resource, action) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return unauthorizedResponse();
  }
  
  // Get user's org and role
  const memberships = await base44.asServiceRole.entities.OrgMembership.filter({
    user_id: user.email
  });
  
  if (memberships.length === 0) {
    return forbiddenResponse('User not in any organization');
  }
  
  const role = memberships[0].role;
  const org_id = memberships[0].org_id;
  
  // Check permission
  if (!hasPermission(role, `${resource}:${action}`)) {
    await logPermissionDenied(user, resource, action);
    return forbiddenResponse('Insufficient permissions');
  }
  
  return { user, role, org_id };
}
```

### Resource Ownership Verification
```javascript
async function verifyResourceOwnership(base44, entityName, entityId, userOrgId) {
  const entity = await base44.asServiceRole.entities[entityName].get(entityId);
  
  if (!entity) {
    return { authorized: false, reason: 'not_found' };
  }
  
  if (entity.org_id !== userOrgId) {
    return { authorized: false, reason: 'wrong_org' };
  }
  
  return { authorized: true, entity };
}
```

---

## Error Handling

### Safe Error Responses
```javascript
// ❌ FORBIDDEN - Leaks internal details
return Response.json({
  error: error.stack,
  query: failedQuery,
  user: user.email
}, { status: 500 });

// ✅ CORRECT - Generic error
return Response.json({
  error: 'An error occurred',
  code: 'INTERNAL_ERROR',
  requestId: generateRequestId()
}, { status: 500 });
```

### Error Response Schema
```javascript
// Standard error response
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",           // Machine-readable
  "requestId": "req_abc123",      // For support lookup
  "field": "email"                // Only for validation errors
}
```

### Error Codes
| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

### Per-Endpoint Limits
| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 10/min | Per IP |
| Read endpoints | 100/min | Per user |
| Write endpoints | 30/min | Per user |
| Import/Export | 5/hour | Per user |
| File upload | 20/hour | Per user |

### Rate Limit Headers
```javascript
response.headers.set('X-RateLimit-Limit', limit);
response.headers.set('X-RateLimit-Remaining', remaining);
response.headers.set('X-RateLimit-Reset', resetTime);
```

---

## Request Validation Checklist

For every API endpoint:
- [ ] Authentication verified
- [ ] Authorization checked (RBAC)
- [ ] Org scoping enforced
- [ ] Input validated against schema
- [ ] Input sanitized
- [ ] Rate limits checked
- [ ] Request size limited
- [ ] Content-Type validated
- [ ] Output properly encoded
- [ ] Errors don't leak internals

---

## API Security Headers

```javascript
const API_SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache'
};
```

---

## Endpoint Security Patterns

### Standard Endpoint Template
```javascript
Deno.serve(async (req) => {
  // 1. Method check
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  // 2. Auth + Authorization
  const auth = await authorizedOperation(req, 'lead', 'create');
  if (auth instanceof Response) return auth;
  
  // 3. Parse and validate input
  let body;
  try {
    body = await validateRequest(req, SCHEMAS.lead);
  } catch (e) {
    return Response.json({ error: e.message, code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  
  // 4. Sanitize input
  body = sanitizeInput(body);
  
  // 5. Enforce org scoping
  body.org_id = auth.org_id;
  
  // 6. Business logic
  try {
    const result = await processRequest(body, auth);
    return safeJsonResponse(result);
  } catch (e) {
    console.error('Error:', e.message);
    return Response.json({ error: 'Operation failed', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});
```

---

## Testing Requirements

### Security Tests
- [ ] Auth bypass attempts blocked
- [ ] SQL/NoSQL injection blocked
- [ ] XSS payloads sanitized
- [ ] CSRF protection works
- [ ] Rate limits enforced
- [ ] Org isolation maintained

---

## Change Log
- 2026-01-20: Initial API security checklist