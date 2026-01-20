# Privacy Requests Intake Specification

## Overview
This document specifies the intake methods for Data Subject Access Requests (DSAR), deletion requests, and correction requests under GDPR, UK GDPR, CCPA, and CPRA.

## Legal Requirements

### Two Methods Required
California CPRA requires **at least two designated methods** for submitting requests (Cal. Code Regs. tit. 11, § 7024(a)). We implement:
1. **Method A**: Web form (public `/PrivacyRequest` page)
2. **Method B**: Email intake (`privacy@loangenius.com`)

## Method A: Web Form (`/PrivacyRequest`)

### Route & Access
- Public page (no authentication required)
- URL: `/PrivacyRequest`
- Accessible from footer links + privacy policy

### Form Fields
**Required:**
- Full Name
- Email Address
- Request Type (Access/Export, Delete, Correct, Opt-Out)
- Jurisdiction (GDPR, UK GDPR, CCPA, CPRA, Other)

**Optional:**
- Phone Number
- Description (what data to correct, specific concerns)
- Supporting Documents (file upload)

**Anti-Spam:**
- reCAPTCHA v3 (invisible, score-based)
- Rate limiting: 5 requests/hour per IP
- Honeypot field (hidden, reject if filled)

### Validation Rules
- Email: valid format, max 255 chars
- Name: min 2 chars, max 100 chars
- Description: max 2000 chars
- File uploads: max 5 files, 10MB each, types: PDF, JPG, PNG

### Submission Flow
1. User fills form
2. System validates input + checks anti-spam
3. Generate unique `request_id` (format: `PR-YYYYMMDD-XXXX`)
4. Calculate `due_at`:
   - GDPR/UK GDPR: `received_at + 1 month`
   - CPRA: `received_at + 45 days`
5. Store in `PrivacyRequest` entity with status=`received`
6. Send confirmation email to requester with request_id
7. Notify admins (email + in-app notification)

### Confirmation Email Template
```
Subject: Privacy Request Received - [REQUEST_ID]

We have received your privacy request.

Request ID: [REQUEST_ID]
Request Type: [ACCESS/DELETE/CORRECT]
Submitted: [DATE]
Estimated Response: [DUE_DATE]

We will verify your identity and respond within the legally required timeframe.

If you have questions, please reply to this email with your Request ID.
```

## Method B: Email Intake

### Email Address
- `privacy@loangenius.com`
- Auto-forward to admin team
- Automated parsing + `PrivacyRequest` record creation

### Email Parsing Logic
1. Extract sender email (requester_email)
2. Parse subject/body for keywords:
   - "access", "export", "know" → request_type=access
   - "delete", "erasure", "forget" → request_type=delete
   - "correct", "rectify", "update" → request_type=correct
   - "opt-out", "unsubscribe" → request_type=opt_out
3. Extract jurisdiction if mentioned (GDPR, CCPA, etc.)
4. Create `PrivacyRequest` record
5. Send auto-reply confirmation (same template as web form)

### Fallback for Ambiguous Emails
If type unclear:
- Create request with type=null
- Status=`in_review` (requires manual classification)
- Admin must set request_type before processing

## Method C: Toll-Free Phone (Optional/Future)

### Configuration Field
- `OrgSettings.privacy_phone_number` (configurable)
- Display on privacy page: "Call us: 1-800-XXX-XXXX"

### Manual Entry
- Admin logs phone requests manually via admin UI
- All fields required except `requester_email` (use phone instead)

## Security & Anti-Spam

### Rate Limiting
- Web form: 5 requests/hour per IP
- Email: 10 requests/day per email address
- Exceeding limits triggers admin alert (potential abuse)

### Data Validation
- Email verification (valid MX record check)
- Phone validation (E.164 format if provided)
- File upload scan (virus scan via integration if available)

### Spam Detection
- reCAPTCHA score < 0.3 → reject submission
- Honeypot field filled → silent reject
- Known spam email domains → auto-reject + log

## Admin Notifications

### Immediate (On Receipt)
- Email to `admin@loangenius.com` + all admin users
- In-app notification (PortalNotification entity)
- Subject: "New Privacy Request: [REQUEST_TYPE] - [REQUEST_ID]"

### Deadline Reminders
- 7 days before `due_at`: "Privacy request due in 7 days"
- 24 hours before `due_at`: "URGENT: Privacy request due tomorrow"
- Overdue (after `due_at`): "OVERDUE: Privacy request past deadline"

### Escalation
- Overdue requests trigger daily escalation emails until resolved
- Include request details, requester info, days overdue

## Audit Trail

Every privacy request must log:
- IP address of submission
- User agent (for web submissions)
- Timestamp of each status change
- User who performed actions (verification, fulfillment, rejection)
- All communications sent to requester

Audit logs stored in `AuditLog` entity with:
```
entity_type: "PrivacyRequest"
entity_id: [privacy_request.id]
action: "created" | "verified" | "fulfilled" | "rejected"
user_email: [admin_email or "system"]
details_json: { changes, notes }
```

## Compliance Notes

- **GDPR Article 12**: Must respond "without undue delay" and within one month, extendable by two months for complex requests
- **CPRA § 7002(a)**: Must respond within 45 days of receipt, regardless of verification time
- **Method Count**: CPRA requires 2+ methods; we provide 3 (web, email, phone)
- **Identity Verification**: Must verify identity but cannot collect excessive data
- **Free of Charge**: Cannot charge fees for privacy requests (except manifestly unfounded/excessive requests)

## Edge Cases

### Duplicate Requests
- Check for existing requests from same email/phone within 30 days
- If found: notify requester of existing request_id, do not create duplicate

### Incomplete Information
- If critical info missing (email/phone): status=`in_review`, admin must contact requester
- Cannot process without verified contact method

### Requests for Non-Existent Data
- If no records found matching requester: still respond confirming no data held
- Document response in `fulfillment_artifacts`

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Compliance**: GDPR, UK GDPR, CCPA, CPRA