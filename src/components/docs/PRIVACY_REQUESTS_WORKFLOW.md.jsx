# Privacy Requests Workflow Specification

## Overview
End-to-end workflow for managing privacy requests from receipt through fulfillment.

## Workflow States

```
received → in_review → fulfilling → completed
                   ↓
                rejected
```

## Deadline Calculation (Auto-Computed on Creation)

### GDPR / UK GDPR
- **Base deadline**: `received_at + 1 month`
- **Extension allowed**: Up to 2 additional months for complex/high-volume requests
- **Extension requirements**:
  - Must inform requester within 1 month of receipt
  - Must provide reason for extension
  - Store in `extension_reason` field
  - Update `extended_due_at` field

### CCPA / CPRA
- **Base deadline**: `received_at + 45 calendar days`
- **Extension allowed**: Additional 45 days with notice to consumer
- **Clock starts**: On receipt, not on verification completion
- **Extension requirements**:
  - Must inform requester within 45-day period
  - Must provide reason
  - Cannot extend if verification is the only delay

### Calculation Logic (Pseudocode)
```javascript
function calculateDueDate(received_at, jurisdiction) {
  const received = new Date(received_at);
  
  if (jurisdiction === 'GDPR' || jurisdiction === 'UK_GDPR') {
    // Add 1 month
    return new Date(received.setMonth(received.getMonth() + 1));
  }
  
  if (jurisdiction === 'CCPA' || jurisdiction === 'CPRA') {
    // Add 45 days
    return new Date(received.setDate(received.getDate() + 45));
  }
  
  // Default: 30 days
  return new Date(received.setDate(received.getDate() + 30));
}
```

## State Transitions

### 1. Received → In Review
**Trigger**: Automatic on creation  
**Actions**:
- Assign to privacy team queue
- Send confirmation email to requester
- Calculate and set `due_at`
- Create audit log entry

### 2. In Review → Fulfilling
**Trigger**: Admin verifies identity and approves  
**Required**:
- `verification_status = verified`
- `verification_completed_at` set
**Actions**:
- Initiate data export, deletion, or correction process
- Update status to `fulfilling`
- Log verification method used

### 3. Fulfilling → Completed
**Trigger**: Fulfillment artifacts generated  
**Required**:
- For access: `export_file_url` set
- For delete: `deletion_certificate_url` set
- For correct: `correction_details` populated
- `completed_at` set
**Actions**:
- Send fulfillment email with artifacts
- Update status to `completed`
- Archive request (retain for audit purposes)

### 4. Any → Rejected
**Trigger**: Admin rejects request  
**Required**:
- `rejection_reason` must be provided
**Valid Rejection Reasons**:
- Identity verification failed
- Request manifestly unfounded
- Request excessive
- Legal exception applies (e.g., legal obligation to retain data)
**Actions**:
- Send rejection notice to requester with reason
- Document legal basis in audit log
- Status = `rejected`

## Automated Notifications

### To Requester

**On Receipt** (immediate):
```
Subject: Privacy Request Received - [REQUEST_ID]
Body: Confirmation of receipt, estimated timeline
```

**On Verification Request** (when identity verification needed):
```
Subject: Verify Your Privacy Request - [REQUEST_ID]
Body: Magic link to verify identity OR instructions for manual verification
```

**On Completion**:
```
Subject: Privacy Request Fulfilled - [REQUEST_ID]
Body: 
- For Access: Link to encrypted data export (expires in 30 days)
- For Delete: Confirmation of deletion + certificate
- For Correct: Summary of corrections made
```

**On Rejection**:
```
Subject: Privacy Request - Unable to Process - [REQUEST_ID]
Body: Explanation of rejection, legal basis, appeal rights
```

### To Admins

**On Receipt**:
- Email to all admin users
- In-app notification badge
- Slack notification (if configured)

**7 Days Before Due**:
```
Subject: Privacy Request Due in 7 Days - [REQUEST_ID]
Priority: Normal
```

**24 Hours Before Due**:
```
Subject: URGENT - Privacy Request Due Tomorrow - [REQUEST_ID]
Priority: High
```

**Overdue**:
```
Subject: OVERDUE - Privacy Request Past Deadline - [REQUEST_ID]
Priority: Critical
Frequency: Daily until resolved
```

## Extension Workflow

### When to Extend
- Complex request (multiple entities, large data volume)
- High volume of concurrent requests
- Technical issues preventing timely fulfillment

### Extension Process
1. Admin clicks "Request Extension" in request detail view
2. Provide `extension_reason` (min 50 chars, clear explanation)
3. System calculates `extended_due_at`:
   - GDPR: `original_due_at + up to 2 months`
   - CPRA: `original_due_at + 45 days`
4. Send extension notice email to requester immediately
5. Log extension in audit trail

### Extension Notice Template
```
Subject: Privacy Request Timeline Update - [REQUEST_ID]

We are writing to inform you that we require additional time to fulfill your privacy request.

Original Deadline: [ORIGINAL_DUE_DATE]
New Deadline: [EXTENDED_DUE_DATE]

Reason: [EXTENSION_REASON]

We apologize for the delay and are working diligently to complete your request.
```

## Data Retention for Privacy Requests

- Completed requests: Retain for **3 years** (audit/compliance evidence)
- Rejected requests: Retain for **3 years**
- Audit logs: Retain for **7 years** (matches loan file retention)
- Export files: Auto-delete after **30 days** (requester has 30 days to download)
- Deletion certificates: Retain **permanently** (proof of compliance)

## Error Handling

### Verification Failures
- Max 3 verification attempts
- After 3 failures: status=`rejected`, reason="Identity verification failed"
- Requester can submit new request with additional proof

### Technical Failures During Fulfillment
- Retry up to 3 times with exponential backoff
- If still failing: assign to manual review queue
- Admin completes fulfillment manually and uploads artifacts

### Missing Data
- If requester has no data in system: still send completion email confirming zero records
- Include statement: "We have searched our systems and found no personal data matching your request."

---
**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Compliance**: GDPR Art. 12-15, CPRA §§ 7002, 7020-7026