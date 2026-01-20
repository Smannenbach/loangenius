# RBAC Permission Matrix - LoanGenius

## Role Definitions

| Role | Code | Description |
|------|------|-------------|
| **Super Admin** | `super_admin` | Platform-level admin, full access |
| **Owner/Admin** | `admin` | Organization admin, manages org settings |
| **Loan Officer** | `loan_officer` | Creates/manages deals, borrowers, leads |
| **Processor** | `processor` | Processes deals, manages docs, conditions |
| **Underwriter** | `underwriter` | Reviews/approves deals, read-only on most |
| **Partner/Realtor** | `partner` | Limited read access, referral tracking |
| **Borrower** | `borrower` | Portal access, own deal/docs only |

---

## Permission Matrix by Resource

### Deals

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read All Org | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Read Own/Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅* |
| Update | ✅ | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export MISMO | ✅ | ✅ | ✅* | ❌ | ✅ | ❌ | ❌ |
| Change Stage | ✅ | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ |

*Constraints: LO = assigned deals only; Processor = assigned deals only; Underwriter = can only approve/deny; Partner = referred deals only; Borrower = own deal only

### Leads

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Read All Org | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read Own/Assigned | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ |
| Update | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Import | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Convert to Deal | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

*Constraints: LO = assigned/created leads; Partner = referred leads only

### Borrowers

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read All Org | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Read Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read Self | - | - | - | - | - | - | ✅ |
| Update | ✅ | ✅ | ✅* | ✅* | ❌ | ❌ | ✅* |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: LO/Processor = assigned borrowers; Borrower = own profile only

### Documents

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Upload | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* |
| Read All Org | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Read Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* |
| Download | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* |
| Approve/Reject | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: Borrower = own deal documents only

### Conditions

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* |
| Update Status | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Waive | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: Borrower = own deal conditions only

### Tasks

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read All Org | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* |
| Update | ✅ | ✅ | ✅* | ✅* | ✅* | ❌ | ✅* |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: Update own assigned tasks only; Borrower = complete own tasks

### Communications/Messages

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Send | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* |
| Read All Org | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read Deal Msgs | ✅ | ✅ | ✅* | ✅* | ✅* | ❌ | ✅* |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: Deal participants only; Borrower = own deal messages

### Users/Team

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| List Org Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite User | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update User | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate User | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change Roles | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: Admin cannot change own role; cannot create super_admin

### Organization Settings

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Read Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update Branding | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Integrations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Imports/Exports

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Import Leads | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Leads | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export MISMO | ✅ | ✅ | ✅* | ❌ | ✅ | ❌ | ❌ |
| Export Reports | ✅ | ✅ | ✅* | ❌ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Constraints: LO = own deals only

### Lender Integrations

| Action | Super Admin | Admin | Loan Officer | Processor | Underwriter | Partner | Borrower |
|--------|-------------|-------|--------------|-----------|-------------|---------|----------|
| Configure | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit to Lender | ✅ | ✅ | ✅* | ✅* | ✅ | ❌ | ❌ |
| View Submissions | ✅ | ✅ | ✅* | ✅* | ✅ | ❌ | ❌ |

*Constraints: Own assigned deals only

---

## Implementation Notes

### Server-Side Enforcement (CRITICAL)
```javascript
// EVERY backend function MUST:
1. Authenticate user: base44.auth.me()
2. Get user role from OrgMembership
3. Check permission before action
4. Verify org_id ownership on all queries
5. Return 403 if unauthorized
```

### Permission Check Pseudo-code
```javascript
function checkPermission(user, resource, action, resourceOrgId) {
  const membership = await getMembership(user.email, resourceOrgId);
  if (!membership) return false;
  
  const role = membership.role;
  const permissions = RBAC_MATRIX[resource][action];
  
  if (!permissions.includes(role)) return false;
  
  // Check resource-specific constraints
  if (CONSTRAINTS[resource]?.[action]?.[role]) {
    return CONSTRAINTS[resource][action][role](user, resourceId);
  }
  
  return true;
}
```

### UI Gating (Secondary)
- Hide buttons/menus for unauthorized actions
- Show "Access Denied" for direct URL access
- Remember: UI gating is UX, not security

---

## Change Log
- 2026-01-20: Initial RBAC matrix created