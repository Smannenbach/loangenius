# Go-Live Preflight Specification

## Purpose
Single source of truth for production readiness checks. Run these checks before any deployment to ensure the system is ready for users.

## Check Categories

### 1. Environment Variables (P0 - MUST PASS)

| Variable | Required For | Status Check |
|----------|--------------|--------------|
| `INTEGRATION_ENCRYPTION_KEY` | Storing integration credentials | Present & non-empty |
| `TWILIO_ACCOUNT_SID` | SMS notifications | Present if SMS enabled |
| `TWILIO_AUTH_TOKEN` | SMS authentication | Present if SMS enabled |
| `Sendgrid_API_Key` | Email notifications | Present & non-empty |
| `OpenAI_API_Key` | AI features | Present if AI enabled |

**Fix**: Set missing secrets in Base44 dashboard → Settings → Secrets

### 2. Database & Org Scoping (P0 - MUST PASS)

| Check | What It Validates |
|-------|-------------------|
| User can authenticate | `base44.auth.me()` returns user |
| User has org membership | `OrgMembership.filter({user_id})` returns results |
| Can read org-scoped data | `Lead.filter({org_id})` works without error |
| IDOR prevention active | Update/delete hooks verify org ownership |

**Fix**: Run `seedOrgAndUsers` function to bootstrap org for new users

### 3. Integrations (P1 - SHOULD PASS)

| Check | What It Validates |
|-------|-------------------|
| `connectIntegration` responds | Returns structured response, not 500 |
| `testIntegration` responds | Returns structured response, not 500 |
| Encryption key configured | Can encrypt/decrypt credentials |

**Fix**: Set `INTEGRATION_ENCRYPTION_KEY` in secrets

### 4. App Connectors (P1 - SHOULD PASS)

| Connector | Required Scopes |
|-----------|-----------------|
| Google Sheets | `spreadsheets`, `email` |
| Google Docs | `documents`, `email` |
| Google Calendar | `calendar`, `calendar.events`, `email` |
| Google Drive | `drive.file`, `email` |

**Fix**: Re-authorize connectors in Base44 dashboard

### 5. Feature Flags (P2 - INFORMATIONAL)

| Flag | Default | Effect |
|------|---------|--------|
| `VITE_ENABLE_INTERNAL_PAGES` | `false` | Hides internal/testing pages in production |

## Preflight Check Results

### ✅ Pass Criteria
- All P0 checks pass
- 80%+ of P1 checks pass
- No blocking errors

### ❌ Fail Criteria
- Any P0 check fails
- Less than 50% of P1 checks pass
- Critical integrations broken

## Running Preflight

### Manual (Admin UI)
1. Navigate to `/admin/preflight` (admin only)
2. Click "Run Preflight Checks"
3. Review results and fix any failures

### Automated (Backend)
```javascript
const response = await base44.functions.invoke('testSystemHealth', {});
// Returns { ok: boolean, checks: [...] }
```

## Remediation Steps

### Missing INTEGRATION_ENCRYPTION_KEY
1. Generate a 256-bit key: `openssl rand -base64 32`
2. Add to Base44 secrets as `INTEGRATION_ENCRYPTION_KEY`
3. Re-run preflight

### No Org Membership
1. Check if user email matches OrgMembership.user_id
2. Run `seedOrgAndUsers` function to bootstrap
3. Refresh page and retry

### Integration Test Fails
1. Go to Admin → Integrations
2. Disconnect and reconnect the integration
3. Verify API key is valid with the provider

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Author**: LoanGenius Engineering