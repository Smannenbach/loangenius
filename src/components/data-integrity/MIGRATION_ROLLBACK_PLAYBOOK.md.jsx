# Migration Rollback Playbook - LoanGenius

## Overview
Procedures for safely rolling back database migrations when issues occur.

---

## Decision Framework: Rollback vs Roll-Forward

### When to ROLLBACK
- Migration introduced data corruption
- Critical functionality completely broken
- Migration can be cleanly reversed
- Roll-forward fix would take > 2 hours
- Affecting > 10% of users

### When to ROLL-FORWARD
- Migration is partially successful
- Rollback would cause data loss
- Forward fix is quick (< 1 hour)
- Issue affects small subset of users
- Rollback has higher risk than fix

### Decision Tree
```
Is data corrupted?
├── YES → Can rollback restore data?
│         ├── YES → ROLLBACK
│         └── NO → ROLL-FORWARD with data fix
└── NO → Is functionality broken?
         ├── YES → Is rollback clean?
         │         ├── YES → ROLLBACK
         │         └── NO → ROLL-FORWARD
         └── NO → Monitor, consider ROLL-FORWARD if needed
```

---

## Rollback Procedures

### Type 1: Schema Rollback (Entity Changes)

#### Scenario: Added field causing issues

**Preflight Check:**
```bash
# Preview rollback impact
npm run schema:rollback-preview -- --migration=add_new_field

# Output:
# Rolling back: add_new_field
# - Remove field: Deal.new_field
# - Affected records: 1,247
# - Data loss: Field values will be lost
# Proceed? (y/n)
```

**Execute Rollback:**
```bash
# For Base44 entity changes, revert the entity file
git diff HEAD~1 entities/Deal.json  # See what changed
git checkout HEAD~1 -- entities/Deal.json  # Revert file
git commit -m "Rollback: Remove new_field from Deal"
git push
```

**Verify:**
```bash
npm run schema:verify
npm run test:smoke
```

---

### Type 2: Data Migration Rollback

#### Scenario: Backfill migration corrupted data

**Preflight Check:**
```bash
# Check if backup contains pre-migration data
npm run backup:list -- --before="2026-01-20T10:00:00Z"

# Identify affected records
npm run query -- --entity=Deal --filter="updated_date > 2026-01-20T10:00:00Z" --count
```

**Execute Rollback:**
```bash
# Option A: Restore from backup (full entity)
npm run restore:entity -- \
  --entity=Deal \
  --backup=backup_daily_2026-01-20T02:00:00Z \
  --target=production

# Option B: Restore specific records
npm run restore:selective -- \
  --entity=Deal \
  --backup=backup_daily_2026-01-20T02:00:00Z \
  --filter="updated_date > 2026-01-20T10:00:00Z"
```

**Verify:**
```bash
# Check data integrity
npm run verify:entity -- --entity=Deal

# Run smoke tests
npm run test:smoke
```

---

### Type 3: Code + Schema Rollback

#### Scenario: App deploy + schema change need coordinated rollback

**Order of Operations (CRITICAL):**
1. Rollback app code FIRST (make old code work with new schema)
2. Verify app stable
3. Rollback schema IF still needed
4. Verify full rollback

**Preflight Check:**
```bash
# Check if old code is compatible with current schema
npm run compat:check -- --code-version=HEAD~1 --schema=current

# Output:
# Compatibility: PARTIAL
# - Old code expects: Deal.old_field
# - Current schema has: Deal.new_field
# - Recommendation: Rollback schema after code rollback
```

**Execute:**
```bash
# Step 1: Rollback app code
git revert HEAD  # Revert latest commit
git push

# Step 2: Monitor app health
# Wait 5 minutes, check error rate

# Step 3: If still issues, rollback schema
git checkout HEAD~1 -- entities/Deal.json
git commit -m "Rollback: Revert Deal schema"
git push

# Step 4: Verify
npm run test:smoke
```

---

## Preventing Bad Migration Rerun

### Problem
After rollback, if CI/CD redeploys, the bad migration might run again.

### Solution 1: Migration Blocking
```bash
# Add migration to block list
npm run migration:block -- --name=bad_migration_name

# Blocked migrations won't run even if present in codebase
# Block file: .migration-blocks.json
```

### Solution 2: Version Tagging
```bash
# Tag known-good version
git tag -a rollback-safe-2026-01-20 -m "Known working state"
git push origin rollback-safe-2026-01-20

# Deploy specific tag
npm run deploy -- --tag=rollback-safe-2026-01-20
```

### Solution 3: Feature Flag
```javascript
// Wrap migration in feature flag
if (await isFeatureFlagEnabled('enable_new_field_migration')) {
  // Run migration
}

// Disable flag to prevent rerun
await setFeatureFlag('enable_new_field_migration', false);
```

---

## Roll-Forward Procedures

### When Rollback Is Unsafe

If rollback would cause more harm than good:

**Step 1: Hotfix Branch**
```bash
git checkout -b hotfix/migration-fix
# Make minimal fix
git commit -m "Hotfix: Fix migration issue"
git push
```

**Step 2: Emergency Review**
- Ping on-call reviewer in Slack
- Get verbal approval
- Document approval in PR

**Step 3: Deploy Hotfix**
```bash
npm run deploy:hotfix -- --branch=hotfix/migration-fix
```

**Step 4: Post-Mortem**
- Schedule within 24 hours
- Document what went wrong
- Update playbook if needed

---

## Rollback Checklist

### Before Rollback
- [ ] Identify exact issue
- [ ] Determine rollback vs roll-forward
- [ ] Notify team (#incidents channel)
- [ ] Identify rollback target (commit/tag)
- [ ] Check backup availability
- [ ] Estimate rollback duration

### During Rollback
- [ ] Execute rollback steps
- [ ] Monitor error rates
- [ ] Monitor latency
- [ ] Check data integrity

### After Rollback
- [ ] Verify functionality restored
- [ ] Run smoke tests
- [ ] Update incident channel
- [ ] Document timeline
- [ ] Schedule post-mortem

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call | #oncall-alerts | Immediate |
| DB Admin | #database-team | 5 min |
| Lead | [Name] | 10 min |
| Manager | [Name] | 30 min |

---

## Rollback Commands Quick Reference

```bash
# Preview rollback
npm run rollback:preview -- --to=<commit|tag>

# Execute code rollback
git revert HEAD && git push

# Execute schema rollback
git checkout HEAD~1 -- entities/<Entity>.json
git commit -m "Rollback schema" && git push

# Restore from backup
npm run restore:entity -- --entity=<name> --backup=<id>

# Block future migration
npm run migration:block -- --name=<migration>

# Deploy specific version
npm run deploy -- --tag=<tag>

# Verify rollback
npm run test:smoke && npm run verify:data
```

---

## Sample Rollback Timeline

```
T+0:00  - Issue detected (alert fired)
T+0:02  - On-call acknowledges
T+0:05  - Root cause identified: bad migration
T+0:08  - Decision: ROLLBACK
T+0:10  - Team notified
T+0:12  - Rollback initiated
T+0:18  - Code rollback complete
T+0:22  - Schema rollback complete
T+0:25  - Smoke tests passed
T+0:28  - All clear announced
T+0:30  - Incident documented
T+1:00  - Post-mortem scheduled
```

---

## Change Log
- 2026-01-20: Initial rollback playbook created