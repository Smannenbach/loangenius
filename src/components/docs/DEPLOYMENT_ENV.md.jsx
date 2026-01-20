# LoanGenius Deployment Environment Variables

## Overview
This document lists all environment variables required for LoanGenius deployment.

---

## A) Client Environment Variables (VITE_ prefix)

These are safe to expose in the client bundle. Currently, **no client-side environment variables are required** - all sensitive operations are handled server-side.

| Variable | Required | Description |
|----------|----------|-------------|
| *(none currently)* | - | All config is server-side |

---

## B) Server/Edge Environment Variables (Secrets - NEVER prefix with VITE_)

These must be configured in your deployment platform (Base44, Deno Deploy, etc.) and are accessed via `Deno.env.get()` in backend functions.

### Core Infrastructure (REQUIRED IN PROD)

| Variable | Required | Description |
|----------|----------|-------------|
| `INTEGRATION_ENCRYPTION_KEY` | ✅ Yes | AES-256-GCM key for encrypting integration credentials. Must be 32 bytes (base64 or 64-char hex). |
| `BASE44_APP_ID` | Auto | Automatically set by Base44 platform |

### Authentication & SSO

| Variable | Required | Description |
|----------|----------|-------------|
| `sso_name` | ✅ Yes | SSO provider name (e.g., "google") |
| `sso_client_id` | ✅ Yes | OAuth client ID |
| `sso_client_secret` | ✅ Yes | OAuth client secret |
| `sso_discovery_url` | ✅ Yes | OIDC discovery URL |
| `sso_scope` | ✅ Yes | OAuth scopes |
| `GOOGLE_OAuth_Client_ID` | Optional | Google OAuth for integrations |
| `GOOGLE_OAuth_Client_Secret` | Optional | Google OAuth for integrations |

### AI Providers (At least one recommended)

| Variable | Required | Description |
|----------|----------|-------------|
| `OpenAI_API_Key` | Optional | OpenAI API key |
| `Anthropic_API_Key` | Optional | Anthropic Claude API key |
| `Google_Gemini_API_Key` | Optional | Google Gemini API key |
| `xAI_Grok_API_Key` | Optional | xAI Grok API key |
| `Deepseek_API_Key` | Optional | Deepseek API key |
| `MoonshotAI_API_Key` | Optional | Moonshot AI API key |

### Communication Services

| Variable | Required | Description |
|----------|----------|-------------|
| `Sendgrid_API_Key` | Optional | SendGrid email API key |
| `Sendgrid_Key_ID` | Optional | SendGrid key identifier |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio phone number |

---

## C) Safe Defaults (Development)

For local development:
```bash
# Generate a dev encryption key (32 random bytes, base64 encoded)
INTEGRATION_ENCRYPTION_KEY=$(openssl rand -base64 32)

# AI providers - at least one for AI features
OpenAI_API_Key=sk-your-dev-key
```

---

## D) Required in Production

**Minimum viable production deployment requires:**

1. `INTEGRATION_ENCRYPTION_KEY` - For secure credential storage
2. `sso_*` variables - For user authentication
3. At least one AI provider key - For AI-powered features

---

## E) Security Notes

1. **NEVER** prefix secrets with `VITE_` - this exposes them in the client bundle
2. **NEVER** log secret values - use redaction helpers
3. **NEVER** commit secrets to version control
4. **ALWAYS** use environment variables, not hardcoded values
5. **ALWAYS** rotate keys if exposed

---

## F) Platform-Specific Configuration

### Base44 Platform
- Set secrets in Dashboard → Settings → Environment Variables
- Secrets are automatically available to backend functions via `Deno.env.get()`

---

## G) Domain & SSL Readiness Checklist

### Base44 Hosting (Default)
The app is automatically available at:
- `https://<app-name>.base44.app`

### Custom Domain Setup (Future)
If connecting a custom domain:

1. **DNS Configuration:**
   - Add CNAME record pointing to Base44
   - Remove any AAAA (IPv6) records that may conflict
   - Wait for DNS propagation (up to 48 hours)

2. **SSL Certificate:**
   - Base44 auto-provisions SSL via Let's Encrypt
   - Certificate renewal is automatic

3. **Root + WWW:**
   - Configure both `example.com` and `www.example.com`
   - Set up redirect from one to the other

---

## H) Health Check Endpoint

The app includes a `/SystemHealth` page that verifies:
- Database connectivity (Leads, Deals entities)
- Organization membership
- AI provider configuration
- Integration status
- Encryption key configuration

Access via: Admin → System Health

---

*Last updated: 2026-01-20*