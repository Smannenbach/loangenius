# Database Migration Policy - LoanGenius

## Overview
Strict policy for managing schema changes to ensure data integrity and safe deployments.

---

## Core Principles

1. **Version Control First** - Every schema change must be in version control
2. **Reversibility** - Every migration must have a rollback plan
3. **Backwards Compatibility** - No breaking changes without compatibility window
4. **Review Required** - No unreviewed schema changes reach production
5. **Test First** - Migrations tested in staging before production

---

## Migration Types

### Type A: Additive (Low Risk) ✅
Changes that only add new capabilities without affecting existing data.

| Change | Risk | Approval |
|--------|------|----------|
| Add new entity | Low | 1 reviewer |
| Add nullable field | Low | 1 reviewer |
| Add index | Low-Medium | 1 reviewer |
| Add new enum value | Low | 1 reviewer |

### Type B: Modifying (Medium Risk) ⚠️
Changes that modify existing structures.

| Change | Risk | Approval |
|--------|------|----------|
| Rename field | Medium | 2 reviewers |
| Change field type (compatible) | Medium | 2 reviewers |
| Add required field with default | Medium | 2 reviewers |
| Modify index | Medium | 2 reviewers |

### Type C: Destructive (High Risk) 🔴
Changes that remove or fundamentally alter existing structures.

| Change | Risk | Approval |
|--------|------|----------|
| Remove field | High | 2 reviewers + lead |
| Remove entity | High | 2 reviewers + lead |
| Change field type (incompatible) | High | 2 reviewers + lead |
| Remove index | High | 2 reviewers + lead |
| Data transformation | High | 2 reviewers + lead |

---

## Allowed Patterns

### ✅ Adding a New Field
```javascript
// entities/Deal.json - BEFORE
{
  "properties": {
    "loan_amount": { "type": "number" }
  }
}

// entities/Deal.json - AFTER
{
  "properties": {
    "loan_amount": { "type": "number" },
    "loan_term_years": { "type": "integer" }  // NEW - nullable by default
  }
}
```

### ✅ Adding New Entity
```javascript
// NEW FILE: entities/NewEntity.json
{
  "name": "NewEntity",
  "type": "object",
  "properties": {
    "field1": { "type": "string" }
  }
}
```

### ✅ Adding Enum Value
```javascript
// BEFORE
"status": { "enum": ["active", "inactive"] }

// AFTER
"status": { "enum": ["active", "inactive", "pending"] }  // Added "pending"
```

---

## Forbidden Patterns (Without Multi-Step Plan)

### ❌ Removing Field Directly
```javascript
// FORBIDDEN - Will break existing queries/code
// BEFORE: { "old_field": { "type": "string" } }
// AFTER: { } // old_field removed
```

### ❌ Renaming Field Directly
```javascript
// FORBIDDEN - Old code still references old name
// BEFORE: { "fullName": { "type": "string" } }
// AFTER: { "full_name": { "type": "string" } }  // Rename breaks old code
```

### ❌ Changing Type Incompatibly
```javascript
// FORBIDDEN - Data loss risk
// BEFORE: { "amount": { "type": "string" } }
// AFTER: { "amount": { "type": "number" } }  // String→Number loses data
```

### ❌ Removing Enum Value
```javascript
// FORBIDDEN - Existing records have this value
// BEFORE: { "enum": ["a", "b", "c"] }
// AFTER: { "enum": ["a", "b"] }  // "c" records now invalid
```

---

## Multi-Step Migration Pattern

For any Type C (destructive) change, follow this pattern:

### Example: Renaming a Field

**Step 1: Add New Field (Release 1)**
```javascript
// Add new field, keep old field
{
  "old_name": { "type": "string" },     // Keep
  "new_name": { "type": "string" }      // Add
}
```

**Step 2: Dual-Write (Release 2)**
```javascript
// Code writes to BOTH fields
await entity.update(id, {
  old_name: value,
  new_name: value  // Write to both
});
```

**Step 3: Backfill (Background Job)**
```javascript
// Copy old_name to new_name for all existing records
const records = await entity.list();
for (const record of records) {
  if (record.old_name && !record.new_name) {
    await entity.update(record.id, { new_name: record.old_name });
  }
}
```

**Step 4: Migrate Reads (Release 3)**
```javascript
// Code reads from new_name, falls back to old_name
const value = record.new_name || record.old_name;
```

**Step 5: Remove Old Writes (Release 4)**
```javascript
// Code only writes to new_name
await entity.update(id, { new_name: value });
```

**Step 6: Remove Old Field (Release 5+)**
```javascript
// After compatibility window (e.g., 30 days)
// Remove old_name from schema
```

---

## Review Checklist

### Pre-Review (Author)
- [ ] Migration is in version control
- [ ] Rollback plan documented
- [ ] Tested locally
- [ ] Tested in staging
- [ ] No breaking changes OR multi-step plan attached
- [ ] Estimated impact documented

### Technical Review
- [ ] Schema change is valid
- [ ] Backwards compatible OR has compatibility plan
- [ ] No data loss risk
- [ ] Indexes appropriate for query patterns
- [ ] No performance concerns for large tables

### Production Readiness
- [ ] Staging tests passed
- [ ] Rollback tested in staging
- [ ] Deployment window scheduled
- [ ] Monitoring in place
- [ ] Team notified

---

## Performance Considerations

### Large Table Migrations

For entities with >100K records:

1. **Estimate Duration**
   - Calculate: records × time_per_record
   - Add safety margin (2x)

2. **Use Batching**
   ```javascript
   const BATCH_SIZE = 1000;
   let offset = 0;
   while (true) {
     const batch = await entity.list('-created_date', BATCH_SIZE, offset);
     if (batch.length === 0) break;
     // Process batch
     offset += BATCH_SIZE;
   }
   ```

3. **Off-Peak Execution**
   - Schedule during low-traffic window
   - Monitor system load during execution

4. **Progress Tracking**
   ```javascript
   console.log(`Migrated ${offset}/${totalRecords} (${(offset/totalRecords*100).toFixed(1)}%)`);
   ```

### Index Changes

- Adding index: May lock table briefly
- Removing index: Fast, but verify queries don't depend on it
- Consider concurrent index creation where supported

---

## CI Enforcement

### Pre-Commit Hooks
```bash
# Validate schema changes
npm run schema:validate

# Check for forbidden patterns
npm run schema:lint
```

### CI Pipeline
```yaml
migration-check:
  script:
    - npm run schema:diff
    - npm run schema:validate
    - npm run schema:risk-assess
  rules:
    - changes:
      - entities/*.json
```

### Risk Assessment Output
```
Schema Change Analysis
======================
Entity: Deal
Change Type: Field Addition
Risk Level: LOW
Backwards Compatible: YES
Rollback Plan: Remove field

Approved for auto-merge: YES
```

---

## Emergency Procedures

### Hotfix Migration
For critical production issues:

1. Create minimal fix
2. Get verbal approval from lead
3. Deploy with monitoring
4. Document after the fact
5. Full review within 24 hours

### Rollback Trigger Conditions
- Error rate > 5% after deployment
- Latency increase > 2x baseline
- Data integrity issues detected
- Critical functionality broken

---

## Documentation Requirements

### Migration Documentation Template
```markdown
## Migration: [Name]

**Date:** [YYYY-MM-DD]
**Author:** [Name]
**Risk Level:** [Low/Medium/High]

### Changes
- [List of schema changes]

### Reason
[Why this change is needed]

### Impact
- Affected entities: [List]
- Affected code: [List files/components]
- Estimated records: [Count]

### Rollback Plan
[How to undo this change]

### Testing
- [ ] Local testing
- [ ] Staging testing
- [ ] Rollback testing

### Deployment
- Window: [Time]
- Duration: [Estimate]
- Monitoring: [What to watch]
```

---

## Change Log
- 2026-01-20: Initial migration policy created