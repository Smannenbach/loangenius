# Safe Release of Database Changes - LoanGenius

## Overview
Strategy for safely releasing changes that affect database schema or data.

---

## Release Safety Principles

1. **Decouple schema changes from code changes** when possible
2. **Always backwards compatible** during rollout window
3. **Canary first** for risky changes
4. **Monitor aggressively** during rollout
5. **Fast rollback** path always available

---

## Release Types

### Type A: Schema-Only Changes (Low Risk)
Adding new fields, entities, or indexes without code changes.

**Rollout Strategy:** Direct deploy
**Rollback Window:** Immediate
**Risk Level:** Low

### Type B: Code-Only Changes (Medium Risk)
Code changes that use existing schema.

**Rollout Strategy:** Canary → Full
**Rollback Window:** Immediate
**Risk Level:** Medium

### Type C: Schema + Code Changes (High Risk)
Coordinated changes to both schema and code.

**Rollout Strategy:** Multi-phase
**Rollback Window:** 24-72 hours
**Risk Level:** High

---

## Safe Release Process

### Phase 1: Preparation (T-7 days)

- [ ] Change documented in MIGRATION_POLICY format
- [ ] Rollback plan written and reviewed
- [ ] Staging tested with production-like data
- [ ] Performance impact assessed
- [ ] Monitoring dashboards ready
- [ ] Team notified of release window

### Phase 2: Schema Deployment (T-0)

For additive schema changes:
```bash
# Deploy schema change
git push origin main  # Entity file changes

# Verify schema applied
npm run schema:verify

# Confirm no errors
npm run test:smoke
```

### Phase 3: Canary Deployment (T+1 hour)

Deploy code to small percentage of traffic:

```javascript
// Feature flag for canary
const CANARY_PERCENTAGE = 5; // 5% of traffic

function isCanaryUser(userId) {
  const hash = hashUserId(userId);
  return (hash % 100) < CANARY_PERCENTAGE;
}

// Use new code path for canary users
if (isCanaryUser(user.id)) {
  // New code path
  return newImplementation();
} else {
  // Old code path
  return oldImplementation();
}
```

### Phase 4: Monitor Canary (T+1 to T+4 hours)

Monitor these metrics for canary users:
- Error rate (should be ≤ baseline)
- Latency (should be within 10% of baseline)
- Conversion/success rates (should be ≥ baseline)
- User feedback (support tickets)

**Dashboard Query:**
```javascript
// Compare canary vs non-canary metrics
SELECT 
  is_canary,
  COUNT(*) as requests,
  AVG(duration_ms) as avg_latency,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
FROM request_logs
WHERE timestamp > NOW() - INTERVAL '4 hours'
GROUP BY is_canary
```

### Phase 5: Expand Rollout (T+4 hours to T+24 hours)

If canary metrics are good:

```javascript
// Gradually increase percentage
const ROLLOUT_SCHEDULE = [
  { hour: 4, percentage: 10 },
  { hour: 8, percentage: 25 },
  { hour: 12, percentage: 50 },
  { hour: 18, percentage: 75 },
  { hour: 24, percentage: 100 }
];
```

### Phase 6: Full Deployment (T+24 hours)

- Remove feature flag
- Deploy code to all users
- Continue monitoring for 24-48 hours

### Phase 7: Cleanup (T+48 to T+72 hours)

- Remove old code paths
- Remove backwards compatibility layers
- Update documentation
- Close release ticket

---

## Rollback Triggers

### Automatic Rollback
System automatically rolls back if:
- Error rate > 10% for canary users
- P95 latency > 2x baseline
- 0 successful requests for 5 minutes

### Manual Rollback
Team decides to rollback if:
- Customer complaints spike
- Data integrity issues detected
- Unexpected behavior observed

---

## Rollback Procedures During Canary

### Immediate Rollback (< 5 minutes)
```bash
# Disable canary feature flag
npm run flag:set -- --name=enable_new_feature --value=false

# Verify rollback
npm run test:smoke
```

### Full Code Rollback
```bash
# Revert to previous version
git revert HEAD
git push

# Or deploy specific tag
npm run deploy -- --tag=last-known-good
```

---

## Compatibility Windows

### Schema Forward Compatibility
New schema must work with old code during rollout.

```
Timeline:
Day 0: Schema deployed
Day 0-3: Old code + New schema (must work)
Day 1: Canary new code
Day 2: Full new code
Day 3+: Compatibility window ends
```

### Schema Backward Compatibility
Old schema must work with new code (for rollback).

```
Timeline:
Day 0: New code deployed
Day 0-7: New code must work with old schema (rollback safety)
Day 7+: Safe to remove old schema support
```

---

## Example: Adding Required Field

### Bad Approach ❌
```javascript
// Day 0: Add required field and deploy code
// BREAKS: Old records don't have field
// BREAKS: Rollback impossible
```

### Good Approach ✅

**Day 0: Add nullable field**
```javascript
// entities/Deal.json
{
  "new_field": { "type": "string" }  // Nullable
}
```

**Day 1: Deploy code that writes to new field**
```javascript
// Write to new field, but don't require it for reads
await Deal.update(id, { 
  ...data,
  new_field: computeNewFieldValue()
});
```

**Day 3: Backfill existing records**
```javascript
// Background job
const deals = await Deal.filter({ new_field: null });
for (const deal of deals) {
  await Deal.update(deal.id, { 
    new_field: computeNewFieldValue(deal) 
  });
}
```

**Day 5: Deploy code that reads new field**
```javascript
// Now safe to use new_field
const value = deal.new_field;
```

**Day 7: Make field required (optional)**
```javascript
// entities/Deal.json
{
  "new_field": { "type": "string" },
  "required": ["new_field"]
}
```

---

## Monitoring Checklist

### Pre-Release
- [ ] Baseline metrics captured
- [ ] Alerting thresholds set
- [ ] Dashboard created

### During Canary
- [ ] Error rate monitored every 15 minutes
- [ ] Latency monitored every 15 minutes
- [ ] Team available for escalation

### During Full Rollout
- [ ] Hourly metric reviews
- [ ] Support ticket monitoring
- [ ] On-call engineer assigned

### Post-Release
- [ ] 24-hour metric comparison
- [ ] Anomaly investigation complete
- [ ] Release retrospective scheduled

---

## Communication Template

### Pre-Release Announcement
```
📢 Upcoming Release: [Feature Name]

Timeline:
- Schema deploy: [Date/Time]
- Canary start: [Date/Time]
- Full rollout: [Date/Time]

Impact: [Description]
Rollback plan: [Summary]

Contact: #release-channel
```

### Canary Status Update
```
🐤 Canary Status: [Feature Name]

Current: [X]% of traffic
Duration: [X] hours
Error rate: [X]% (baseline: [Y]%)
Latency p95: [X]ms (baseline: [Y]ms)

Status: ✅ Proceeding / ⚠️ Monitoring / 🔴 Rolling back
```

### Release Complete
```
✅ Release Complete: [Feature Name]

Deployed to: 100% of users
Duration: [X] hours
Issues: [None / Description]

Monitoring continues for 48 hours.
```

---

## Change Log
- 2026-01-20: Initial safe release guide created