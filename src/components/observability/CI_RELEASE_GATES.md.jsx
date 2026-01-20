# CI Release Gates - LoanGenius

## Overview
Release gates that must pass before any deploy to production. No exceptions.

---

## Gate Summary

| Gate | Type | Blocks Deploy | Run Time |
|------|------|---------------|----------|
| 1. Typecheck + Lint | Quality | ✅ Yes | ~30s |
| 2. Unit Tests | Quality | ✅ Yes | ~60s |
| 3. E2E Smoke Tests | Functionality | ✅ Yes | ~3min |
| 4. Performance Budgets | Performance | ✅ Yes | ~5min |
| 5. Security Audit | Security | ⚠️ Warn only | ~30s |

---

## Gate 1: Typecheck + Lint

### What It Checks
- TypeScript type errors
- ESLint rule violations
- Import/export issues
- Unused variables

### Local Command
```bash
npm run typecheck && npm run lint
```

### CI Configuration
```yaml
typecheck-lint:
  stage: quality
  script:
    - npm ci
    - npm run typecheck
    - npm run lint
  allow_failure: false
```

### Common Failures
- Missing type annotations
- Unused imports
- Console.log statements in production code
- Missing dependencies in hooks

---

## Gate 2: Unit Tests

### What It Checks
- Component rendering
- Utility function logic
- RBAC permission checks
- Data transformation functions

### Local Command
```bash
npm run test
```

### CI Configuration
```yaml
unit-tests:
  stage: test
  script:
    - npm ci
    - npm run test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  allow_failure: false
```

### Minimum Coverage
- Overall: 60%
- Critical paths: 80%
  - RBAC helpers
  - Data validation
  - Import/export logic

---

## Gate 3: E2E Smoke Tests

### Core Flows Tested

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Auth | Login → Verify session → Logout | Session created/destroyed |
| Pipeline Nav | Login → Navigate to Pipeline | Pipeline loads with data |
| Create Lead | Login → Leads → Quick Add → Submit | Lead appears in list |
| Create Deal | Login → New Deal → Fill form → Submit | Deal created, redirected |
| Doc Upload | Login → Deal → Upload doc | Doc appears in list |
| Import (CSV) | Login → Leads → Import → Upload CSV | Leads imported |

### Local Command
```bash
npm run test:e2e
```

### CI Configuration
```yaml
e2e-smoke:
  stage: test
  script:
    - npm ci
    - npm run build
    - npm run start &
    - npx wait-on http://localhost:3000
    - npm run test:e2e
  artifacts:
    when: on_failure
    paths:
      - test-results/
      - playwright-report/
  allow_failure: false
```

### Smoke Test Implementation
```javascript
// tests/smoke/auth.spec.js
test('user can login and logout', async ({ page }) => {
  await page.goto('/');
  // Auth flow handled by Base44
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout"]');
  // Verify logout
});

// tests/smoke/pipeline.spec.js
test('pipeline loads with deals', async ({ page }) => {
  await loginAsLoanOfficer(page);
  await page.goto('/Pipeline');
  
  await expect(page.locator('[data-testid="pipeline-board"]')).toBeVisible();
  await expect(page.locator('[data-testid="deal-card"]').first()).toBeVisible({ timeout: 10000 });
});

// tests/smoke/lead-create.spec.js
test('can create a lead via quick add', async ({ page }) => {
  await loginAsLoanOfficer(page);
  await page.goto('/Leads');
  
  await page.click('[data-testid="quick-add-lead"]');
  await page.fill('[data-testid="first-name"]', 'Test');
  await page.fill('[data-testid="last-name"]', 'Lead');
  await page.fill('[data-testid="email"]', `test${Date.now()}@example.com`);
  await page.click('[data-testid="tcpa-consent"]');
  await page.click('[data-testid="submit-lead"]');
  
  await expect(page.locator('text=Lead created')).toBeVisible();
});
```

---

## Gate 4: Performance Budgets (Lighthouse)

### What It Checks
- Performance score >= 70
- LCP <= 3000ms
- CLS <= 0.1
- TBT <= 500ms
- Bundle size <= 1.8MB

### Local Command
```bash
npm run lighthouse:ci
```

### CI Configuration
```yaml
lighthouse:
  stage: performance
  script:
    - npm ci
    - npm run build
    - npm run start &
    - npx wait-on http://localhost:3000
    - npx lhci autorun --config=./components/observability/LIGHTHOUSE_BUDGETS.json
  artifacts:
    paths:
      - .lighthouseci/
  allow_failure: false
```

### Budget Reference
See: `components/observability/LIGHTHOUSE_BUDGETS.json`

---

## Gate 5: Security Audit

### What It Checks
- npm dependency vulnerabilities
- Known CVEs in packages
- License compliance

### Local Command
```bash
npm audit --audit-level=high
```

### CI Configuration
```yaml
security-audit:
  stage: security
  script:
    - npm audit --audit-level=high --json > audit-report.json
  artifacts:
    paths:
      - audit-report.json
  allow_failure: true  # Warn only, for now
```

### Severity Levels
- Critical: Block deploy (when enabled)
- High: Block deploy (when enabled)
- Moderate: Warn only
- Low: Log only

---

## Full Pipeline Flow

```
┌─────────────────┐
│  PR Created     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. Typecheck    │──❌──→ Fail PR
│    + Lint       │
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ 2. Unit Tests   │──❌──→ Fail PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ 3. Build        │──❌──→ Fail PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ 4. E2E Smoke    │──❌──→ Fail PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ 5. Lighthouse   │──❌──→ Fail PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ 6. Security     │──⚠️──→ Warning
│    Audit        │
└────────┬────────┘
         │ ✅ or ⚠️
         ▼
┌─────────────────┐
│ ✅ Ready to     │
│    Merge        │
└─────────────────┘
```

---

## Quick Reference Commands

```bash
# Run all gates locally
npm run ci:gates

# Individual gates
npm run typecheck        # Gate 1a
npm run lint             # Gate 1b
npm run test             # Gate 2
npm run test:e2e         # Gate 3
npm run lighthouse:ci    # Gate 4
npm audit                # Gate 5

# Full CI simulation
npm run ci:full
```

---

## Bypassing Gates (Emergency Only)

### When Allowed
- Critical production hotfix
- Approved by 2+ team leads
- Documented in incident report

### How to Bypass
```bash
# Add to commit message
[EMERGENCY-BYPASS] Hotfix for critical auth bug

# Or in CI
BYPASS_GATES=true npm run deploy
```

### Requirements for Bypass
1. Create incident ticket
2. Get written approval in ticket
3. Document what gates were skipped
4. Schedule follow-up to run skipped gates
5. Post-mortem within 48 hours

---

## Adding New Gates

### Checklist
1. Create gate script in `package.json`
2. Test locally: ensure it fails correctly
3. Add to CI configuration
4. Set `allow_failure` appropriately
5. Document in this file
6. Announce to team

### Example: Adding Bundle Size Gate
```json
// package.json
{
  "scripts": {
    "check:bundle": "size-limit --config size-limit.json"
  }
}
```

```yaml
# CI config
bundle-size:
  stage: performance
  script:
    - npm run check:bundle
  allow_failure: false
```

---

## Change Log
- 2026-01-20: Initial CI release gates documentation