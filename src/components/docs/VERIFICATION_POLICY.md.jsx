# Privacy Request Identity Verification Policy

## Principle
**Verify before fulfill** - We must verify the requester's identity to prevent unauthorized disclosure or deletion of personal data, while minimizing excessive data collection.

## Verification Methods

### Method 1: Magic Link to Known Email (Preferred)
**When to use**: Requester email matches email(s) on file  
**Process**:
1. Check if `requester_email` exists in: Leads, Borrowers, Contacts, Users
2. If match found: Send magic link to that email
3. Magic link expires in 24 hours
4. Click verifies identity → `verification_status = verified`

**Pros**: Simple, secure, no additional data collection  
**Cons**: Only works if we have verified email on file

### Method 2: Matching Known Identifiers
**When to use**: Email not found, but requester provides other identifiers  
**Process**:
1. Request minimal identifiers:
   - Full Name + Last 4 of SSN (for borrowers)
   - Full Name + Property Address (for leads)
   - Full Name + Phone Number (for leads/contacts)
2. Search across entities for matches
3. If single unique match found → verified
4. If multiple matches or no match → escalate to manual review

**Pros**: Works when email changed or unavailable  
**Cons**: Requires additional data collection

### Method 3: Manual Review (Last Resort)
**When to use**: Automated methods fail or insufficient confidence  
**Process**:
1. Admin reviews request + any submitted documents
2. Admin may request additional proof via email
3. Admin manually marks `verification_status = verified` or `denied`
4. Admin must document verification method in notes

## Verification Requirements by Request Type

### Access / Export Requests
- **Verification required**: YES (MANDATORY)
- **Reason**: Prevents unauthorized disclosure of personal data
- **Method**: Magic link OR matching identifiers

### Delete / Erasure Requests
- **Verification required**: YES (MANDATORY)
- **Reason**: Prevents malicious deletion of others' data
- **Method**: Magic link OR matching identifiers

### Correction Requests
- **Verification required**: YES (MANDATORY)
- **Reason**: Prevents unauthorized modification
- **Method**: Magic link OR matching identifiers

### Opt-Out Requests (Marketing)
- **Verification required**: NO (optional)
- **Reason**: Low risk, consumer-friendly
- **Method**: Honor immediately, log email/phone for opt-out list

## Data Minimization

### What NOT to Request
❌ Full SSN (only last 4)  
❌ Full DOB (only year OR age)  
❌ Full account numbers  
❌ Passwords  
❌ Copies of government-issued ID (unless absolutely necessary for high-risk requests)

### What to Accept
✅ Email (if on file)  
✅ Phone (if on file)  
✅ Last 4 of SSN  
✅ Property address  
✅ Last loan application date  
✅ Last 4 of any account number

## Verification Attempt Logging

All verification attempts must be logged (even failures):
```json
{
  "privacy_request_id": "...",
  "verification_method": "magic_link",
  "attempt_number": 1,
  "timestamp": "...",
  "result": "success" | "failed",
  "failure_reason": "link_expired" | "no_match" | "multiple_matches",
  "ip_address": "...",
  "user_agent": "..."
}
```

Store in `AuditLog` entity.

## Max Verification Attempts
- **Magic link**: 3 attempts (can request new link)
- **Matching identifiers**: 3 attempts
- After 3 failures: Request rejected OR escalated to manual review

## Redaction After Verification

Once verified, redact sensitive verification data:
- Mask email: `j***e@example.com`
- Mask phone: `***-***-1234`
- Remove last 4 SSN from display (keep encrypted in DB for audit)

Only admins with specific permission can view unmasked data.

## GDPR / CPRA Compliance Notes

### GDPR Article 12(6)
"Where the controller has reasonable doubts concerning the identity of the natural person making the request... the controller may request the provision of additional information necessary to confirm the identity of the data subject."

**Our interpretation**: We can request matching identifiers if email alone insufficient.

### CPRA § 7002(c)
"A business shall not require the consumer to create an account in order to make a verifiable consumer request."

**Our interpretation**: Magic links do not require account creation (one-time use tokens).

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Compliance**: GDPR Art. 12(6), CPRA § 7002(c)