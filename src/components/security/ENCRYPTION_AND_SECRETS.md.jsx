# Encryption & Secrets Management - LoanGenius

## Overview
Policies and procedures for encryption and secrets management.

---

## Encryption Standards

### Data in Transit
| Component | Protocol | Minimum Version | Notes |
|-----------|----------|-----------------|-------|
| Web Traffic | TLS | 1.2 (prefer 1.3) | No mixed content |
| API Calls | TLS | 1.2 (prefer 1.3) | Certificate validation |
| WebSocket | WSS | TLS 1.2+ | Secure only |
| Email | TLS | 1.2+ | Opportunistic |

### Data at Rest
| Data Type | Algorithm | Key Size | Rotation |
|-----------|-----------|----------|----------|
| Database Fields | AES-GCM | 256-bit | 90 days |
| File Storage | AES-GCM | 256-bit | 90 days |
| Backups | AES-GCM | 256-bit | 90 days |
| Logs (if needed) | AES-GCM | 256-bit | 90 days |

### Key Management
- Keys stored in Base44 KMS
- Envelope encryption for data keys
- Master keys never leave KMS
- Automatic rotation every 90 days

---

## TLS Configuration

### Required Settings
```
Minimum TLS Version: 1.2
Preferred TLS Version: 1.3

Allowed Cipher Suites (TLS 1.3):
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

Allowed Cipher Suites (TLS 1.2):
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-ECDSA-AES256-GCM-SHA384

Disabled:
- SSLv3, TLS 1.0, TLS 1.1
- RC4, DES, 3DES
- Export ciphers
- NULL ciphers
```

### Certificate Requirements
- Minimum 2048-bit RSA or 256-bit ECDSA
- SHA-256 or stronger signature
- Valid chain to trusted CA
- Auto-renewal before expiry

---

## Secrets Inventory

### Application Secrets
| Secret | Purpose | Rotation | Owner |
|--------|---------|----------|-------|
| OpenAI_API_Key | AI features | 90 days | Admin |
| Anthropic_API_Key | AI features | 90 days | Admin |
| Sendgrid_API_Key | Email | 90 days | Admin |
| TWILIO_AUTH_TOKEN | SMS | 90 days | Admin |
| Google OAuth Client Secret | Auth | Annual | Admin |
| Database Encryption Key | Data at rest | 90 days | Platform |

### Current Secrets (from environment)
- sso_* (SSO configuration)
- google_oauth_* (Google OAuth)
- TWILIO_* (SMS service)
- Sendgrid_* (Email service)
- OpenAI_API_Key, Anthropic_API_Key, etc. (AI services)
- Various integration tokens

---

## Secrets Management Rules

### Rule 1: No Secrets in Code
```javascript
// ❌ FORBIDDEN
const API_KEY = "sk-1234567890abcdef";

// ✅ CORRECT
const API_KEY = Deno.env.get("OPENAI_API_KEY");
```

### Rule 2: No Secrets in Logs
```javascript
// ❌ FORBIDDEN
console.log("Calling API with key:", apiKey);

// ✅ CORRECT
console.log("Calling API with key:", "[REDACTED]");
```

### Rule 3: No Secrets in URLs
```javascript
// ❌ FORBIDDEN
fetch(`https://api.example.com?api_key=${key}`);

// ✅ CORRECT
fetch('https://api.example.com', {
  headers: { 'Authorization': `Bearer ${key}` }
});
```

### Rule 4: No Secrets in Error Messages
```javascript
// ❌ FORBIDDEN
throw new Error(`Auth failed for token ${token}`);

// ✅ CORRECT
throw new Error('Authentication failed');
```

---

## Secret Rotation Runbook

### Pre-Rotation Checklist
- [ ] New secret generated
- [ ] Test new secret in staging
- [ ] Identify all services using old secret
- [ ] Schedule rotation window
- [ ] Have rollback plan ready

### Rotation Procedure

#### 1. API Keys (OpenAI, Sendgrid, etc.)

```bash
# Step 1: Generate new key in provider's dashboard
# Step 2: Add new key to environment (don't remove old yet)
NEW_KEY="new-api-key-value"

# Step 3: Update environment variable
# In Base44 dashboard: Settings > Secrets
# Add new value

# Step 4: Verify new key works
npm run test:integration -- --key=new

# Step 5: Remove old key from provider
# Step 6: Update documentation
```

#### 2. OAuth Client Secrets

```bash
# Step 1: Generate new client secret in OAuth provider
# Step 2: Test new secret in staging environment
# Step 3: Update secret in production
# Step 4: Monitor for auth failures
# Step 5: Revoke old secret after 24 hours
```

#### 3. Database Encryption Keys

```bash
# Step 1: Generate new encryption key via KMS
# Step 2: Re-encrypt data with new key (background job)
# Step 3: Verify decryption works
# Step 4: Mark old key for deletion
# Step 5: Delete old key after retention period
```

### Rotation Schedule
| Secret Type | Frequency | Next Rotation |
|-------------|-----------|---------------|
| API Keys | 90 days | 2026-04-20 |
| OAuth Secrets | Annual | 2027-01-01 |
| Encryption Keys | 90 days | 2026-04-20 |
| Service Tokens | 90 days | 2026-04-20 |

---

## Secret Redaction in Logs

### Automatic Redaction Patterns
```javascript
const SECRET_PATTERNS = [
  // API keys
  /sk-[a-zA-Z0-9]{32,}/g,
  /api[_-]?key[=:]\s*['"]?[a-zA-Z0-9\-_]+['"]?/gi,
  
  // Tokens
  /Bearer\s+[a-zA-Z0-9\-_\.]+/gi,
  /token[=:]\s*['"]?[a-zA-Z0-9\-_\.]+['"]?/gi,
  
  // OAuth secrets
  /client[_-]?secret[=:]\s*['"]?[a-zA-Z0-9\-_]+['"]?/gi,
  
  // Connection strings
  /mongodb(\+srv)?:\/\/[^@]+@/gi,
  /postgres:\/\/[^@]+@/gi,
  
  // AWS keys
  /AKIA[A-Z0-9]{16}/g,
  
  // Private keys
  /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g
];

function redactSecrets(text) {
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}
```

---

## Encryption Implementation

### Field-Level Encryption
```javascript
// For sensitive fields before storage
async function encryptField(value, fieldType) {
  if (!value) return value;
  
  const key = await getEncryptionKey(fieldType);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Return as base64 with IV prefix
  return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(encrypted)));
}

async function decryptField(encrypted, fieldType) {
  if (!encrypted) return encrypted;
  
  const key = await getEncryptionKey(fieldType);
  const decoded = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  const iv = decoded.slice(0, 12);
  const data = decoded.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}
```

---

## Emergency Procedures

### Secret Compromise Response
1. **Immediate**: Revoke compromised secret
2. **Within 15 min**: Generate and deploy new secret
3. **Within 1 hour**: Audit access logs for unauthorized use
4. **Within 24 hours**: Complete incident report
5. **Within 1 week**: Root cause analysis and prevention

### Key Recovery
- Backup keys stored in separate secure vault
- Requires 2 of 3 key custodians
- Recovery tested quarterly

---

## Compliance

| Standard | Requirement | Status |
|----------|-------------|--------|
| PCI-DSS | Encrypt cardholder data | N/A (no card storage) |
| GLBA | Protect customer info | ✅ Encryption at rest |
| SOC 2 | Access controls + encryption | ✅ Implemented |

---

## Change Log
- 2026-01-20: Initial encryption and secrets policy