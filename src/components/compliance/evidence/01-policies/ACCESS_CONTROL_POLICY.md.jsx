# Access Control Policy - LoanGenius

**Version:** 1.0  
**Effective Date:** 2026-01-20  
**Owner:** Administration  
**Review Frequency:** Annual

---

## Purpose
Establish requirements for managing user access to LoanGenius systems and data based on least privilege principles.

---

## Scope
This policy applies to all users, administrators, and service accounts accessing LoanGenius.

---

## Roles and Responsibilities

### Role Definitions
| Role | Description | Access Level |
|------|-------------|--------------|
| Super Admin | Platform administration | Full system access |
| Admin/Owner | Organization administration | Full org access |
| Loan Officer | Loan origination | Assigned deals/leads |
| Processor | Loan processing | Assigned deals |
| Underwriter | Loan underwriting | Review all org deals |
| Partner | External referral partner | Referred leads only |
| Borrower | Loan applicant | Own application only |

### Role Assignment Authority
- Super Admin: Platform operations only
- Admin: Can assign all roles except Super Admin
- All others: Cannot assign roles

---

## Access Provisioning

### Joiner Process (New User)
1. Access request submitted by hiring manager/admin
2. Business justification documented
3. Role assigned based on job function
4. Minimum necessary permissions granted
5. User added via invite system
6. Access confirmed active
7. Access logged in audit trail

### Required Information
- Full name
- Email address
- Role assignment
- Organization assignment
- Business justification
- Approver name

### Approval Requirements
| Role | Approver |
|------|----------|
| Admin | Existing Admin + documented justification |
| Loan Officer | Admin |
| Processor | Admin |
| Underwriter | Admin |
| Partner | Admin |
| Borrower | Self-registration via portal |

---

## Access Modification

### Mover Process (Role Change)
1. Role change request submitted
2. Current access reviewed
3. Old role removed
4. New role assigned
5. Change logged in audit trail

### Requirements
- Business justification for change
- Approval from Admin
- No accumulation of privileges

---

## Access Removal

### Leaver Process (Offboarding)
1. Termination/departure notification received
2. Access disabled within 24 hours
3. Sessions invalidated
4. Access removal logged
5. Periodic verification of removal

### Immediate Removal Triggers
- Termination for cause
- Security incident involving user
- Resignation with immediate effect

### Standard Removal Timeline
| Scenario | Timeline |
|----------|----------|
| Voluntary departure | End of last day |
| Involuntary termination | Immediate |
| Contractor end | Contract end date |
| Role change | Same day as change |

---

## Periodic Access Reviews

### Review Schedule
| Review Type | Frequency | Scope |
|-------------|-----------|-------|
| User access | Quarterly | All active users |
| Admin access | Monthly | All admin roles |
| Service accounts | Quarterly | All service accounts |
| Privileged access | Monthly | Super Admin, Admin |

### Review Process
1. Generate access report
2. Manager reviews each user's access
3. Confirm access is appropriate
4. Remove inappropriate access
5. Document review completion
6. Sign-off by reviewer

### Review Artifacts
- Access list snapshot
- Reviewer name and date
- Changes made
- Sign-off confirmation

---

## Least Privilege

### Principles
- Grant minimum access needed for job function
- No standing privileged access without justification
- Time-bound elevated access when needed
- Regular review to remove unnecessary access

### Implementation
- Role-based access control (RBAC)
- Organization-scoped data access
- Resource-level permissions
- No shared accounts

---

## Authentication Requirements

### Password/Credential Requirements
- Managed via Google SSO
- Google account security policies apply
- MFA encouraged/required per org policy

### Session Management
- Idle timeout: 30 minutes
- Absolute timeout: 8 hours
- Secure cookie flags enforced

---

## Monitoring and Logging

### Logged Events
- Login success/failure
- Role changes
- Permission denials
- Data access (sensitive)
- Session creation/termination

### Log Retention
- Access logs: 2 years
- Authentication logs: 2 years

---

## Exceptions

### Exception Process
1. Request submitted with business justification
2. Risk assessment performed
3. Compensating controls identified
4. Approval by Admin + documented
5. Time-limited (max 90 days)
6. Reviewed for extension or removal

---

## Compliance

### Related Standards
- OWASP ASVS V4 (Access Control)
- NIST 800-53 AC controls
- SOC 2 CC6.1-CC6.3

---

## Change Log
| Date | Version | Change |
|------|---------|--------|
| 2026-01-20 | 1.0 | Initial policy |