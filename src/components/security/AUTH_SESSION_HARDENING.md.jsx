# Auth & Session Hardening - LoanGenius

## Overview
Authentication and session management hardening based on OWASP ASVS V2 (Authentication) and V3 (Session Management).

---

## ASVS Coverage

| ASVS Section | Control | Status |
|--------------|---------|--------|
| V2.1 | Password Security | ✅ Via SSO |
| V2.2 | General Authenticator | ✅ Implemented |
| V2.5 | Credential Recovery | ✅ Via SSO |
| V2.7 | Out of Band Verifier | ⚠️ Partial |
| V2.8 | Single/Multi Factor | ✅ SSO + MFA |
| V3.1 | Session Management | ✅ Implemented |
| V3.2 | Session Binding | ✅ Implemented |
| V3.3 | Session Logout | ✅ Implemented |
| V3.4 | Cookie-based Sessions | ✅ Secure flags |
| V3.5 | Token-based Sessions | ✅ Implemented |

---

## Authentication Flow

### Primary Auth: Google SSO
```
User → Login Page → Google OAuth → Callback → Session Created
                         ↓
                    MFA if enabled
```

### Session Token Flow
```
1. User authenticates via SSO
2. Base44 creates session token
3. Token stored in httpOnly cookie
4. Token validated on each request
5. Token refreshed periodically
6. Token invalidated on logout
```

---

## Session Configuration

### Session Settings
```javascript
const SESSION_CONFIG = {
  // Timeouts
  idleTimeout: 30 * 60 * 1000,      // 30 minutes idle
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours max
  
  // Cookie settings
  cookie: {
    httpOnly: true,          // No JS access
    secure: true,            // HTTPS only
    sameSite: 'Lax',         // CSRF protection
    path: '/',
    maxAge: 8 * 60 * 60      // 8 hours
  },
  
  // Token settings
  tokenLength: 32,           // 256 bits
  regenerateOnAuth: true,    // New token after login
  regenerateInterval: 15 * 60 * 1000  // 15 min rotation
};
```

### Cookie Security Flags
| Flag | Value | Purpose |
|------|-------|---------|
| HttpOnly | true | Prevent XSS token theft |
| Secure | true | HTTPS only |
| SameSite | Lax | CSRF protection |
| Path | / | Scope to app |
| Max-Age | 28800 | 8 hour expiry |

---

## Session Lifecycle

### Login
```javascript
async function handleLogin(user) {
  // 1. Invalidate any existing session
  await invalidateExistingSession(user.id);
  
  // 2. Create new session
  const sessionId = generateSecureToken(32);
  
  // 3. Store session data
  await storeSession({
    id: sessionId,
    userId: user.id,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    userAgent: request.headers['user-agent'],
    ipAddress: getClientIP(request)
  });
  
  // 4. Set secure cookie
  setSecureCookie('session', sessionId);
  
  // 5. Log auth event
  await logAuditEvent('AUTH_LOGIN', { userId: user.id });
}
```

### Activity Update
```javascript
async function updateSessionActivity(sessionId) {
  const session = await getSession(sessionId);
  
  // Check idle timeout
  if (Date.now() - session.lastActivity > SESSION_CONFIG.idleTimeout) {
    await invalidateSession(sessionId);
    throw new SessionExpiredError('Session expired due to inactivity');
  }
  
  // Check absolute timeout
  if (Date.now() - session.createdAt > SESSION_CONFIG.absoluteTimeout) {
    await invalidateSession(sessionId);
    throw new SessionExpiredError('Session expired');
  }
  
  // Update last activity
  await updateSession(sessionId, { lastActivity: Date.now() });
}
```

### Logout
```javascript
async function handleLogout(sessionId, userId) {
  // 1. Invalidate session server-side
  await invalidateSession(sessionId);
  
  // 2. Clear cookie
  clearCookie('session');
  
  // 3. Log logout event
  await logAuditEvent('AUTH_LOGOUT', { userId });
  
  // 4. Optionally invalidate all user sessions
  // await invalidateAllUserSessions(userId);
}
```

---

## Token Security

### Token Generation
```javascript
function generateSecureToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
```

### Token Storage
- Server-side session store (not client)
- Token never in URL parameters
- Token never logged
- Token hashed for storage comparison

### Token Leakage Prevention
```javascript
// ❌ FORBIDDEN - Token in URL
redirect(`/callback?token=${token}`);

// ❌ FORBIDDEN - Token in logs
console.log('Session token:', token);

// ❌ FORBIDDEN - Token in error messages
throw new Error(`Invalid token: ${token}`);

// ✅ CORRECT - Token in secure cookie only
response.headers.set('Set-Cookie', 
  `session=${token}; HttpOnly; Secure; SameSite=Lax`);
```

---

## Rate Limiting

### Auth Endpoints
| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| /login | 5 attempts | 15 min | Block IP |
| /logout | 10 requests | 1 min | Slow down |
| /password-reset | 3 attempts | 1 hour | Block + alert |
| /verify-otp | 5 attempts | 5 min | Lock account |

### Implementation
```javascript
const rateLimits = {
  login: { max: 5, window: 15 * 60 * 1000 },
  passwordReset: { max: 3, window: 60 * 60 * 1000 },
  otpVerify: { max: 5, window: 5 * 60 * 1000 }
};

async function checkRateLimit(key, limitType) {
  const limit = rateLimits[limitType];
  const attempts = await getAttempts(key, limit.window);
  
  if (attempts >= limit.max) {
    await logAuditEvent('RATE_LIMIT_EXCEEDED', { 
      key, limitType, attempts 
    });
    throw new RateLimitError('Too many attempts');
  }
  
  await incrementAttempts(key);
}
```

### Brute Force Protection
```javascript
async function handleLoginAttempt(email, password, ip) {
  // Rate limit by IP
  await checkRateLimit(`ip:${ip}`, 'login');
  
  // Rate limit by email
  await checkRateLimit(`email:${email}`, 'login');
  
  try {
    const user = await authenticate(email, password);
    await clearAttempts(`email:${email}`);
    return user;
  } catch (error) {
    // Log failed attempt
    await logAuditEvent('AUTH_LOGIN_FAILED', { 
      email: maskEmail(email), 
      ip,
      reason: error.code 
    });
    throw error;
  }
}
```

---

## Account Lockout

### Lockout Policy
```javascript
const LOCKOUT_POLICY = {
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000,  // 30 minutes
  resetAfterSuccess: true,
  notifyOnLockout: true
};
```

### Lockout Flow
```
Failed attempt 1-4: Increment counter
Failed attempt 5: Lock account, notify user
After 30 min: Auto-unlock
Successful login: Reset counter
```

---

## Session Validation Checklist

For every authenticated request:
- [ ] Session token present
- [ ] Token not expired (idle)
- [ ] Token not expired (absolute)
- [ ] Token matches stored session
- [ ] User still active
- [ ] User role sufficient for action
- [ ] Request origin valid (CSRF check)

---

## Logout Correctness

### Complete Logout
```javascript
async function completeLogout(request) {
  const sessionId = getSessionFromCookie(request);
  const userId = await getUserFromSession(sessionId);
  
  // 1. Server-side session invalidation
  await deleteSession(sessionId);
  
  // 2. Clear all session data
  await clearSessionData(sessionId);
  
  // 3. Clear authentication cookie
  const response = new Response(null, { status: 200 });
  response.headers.set('Set-Cookie', 
    'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  
  // 4. Clear any refresh tokens
  await revokeRefreshTokens(userId);
  
  // 5. Audit log
  await logAuditEvent('AUTH_LOGOUT', { userId });
  
  return response;
}
```

### Logout All Sessions
```javascript
async function logoutAllSessions(userId, keepCurrent = false) {
  const sessions = await getUserSessions(userId);
  const currentSessionId = getCurrentSessionId();
  
  for (const session of sessions) {
    if (keepCurrent && session.id === currentSessionId) continue;
    await invalidateSession(session.id);
  }
  
  await logAuditEvent('AUTH_LOGOUT_ALL', { 
    userId, 
    sessionCount: sessions.length 
  });
}
```

---

## Security Headers

### Response Headers
```javascript
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; ...",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

---

## Monitoring & Alerts

### Auth Events to Monitor
| Event | Threshold | Alert |
|-------|-----------|-------|
| Failed logins (single user) | > 5/hour | Warn |
| Failed logins (IP) | > 20/hour | Critical |
| Successful login new device | Any | Info |
| Session hijack detected | Any | Critical |
| Account lockout | Any | Warn |

---

## Change Log
- 2026-01-20: Initial auth session hardening policy