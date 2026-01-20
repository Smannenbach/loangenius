# Lighthouse CI Report - LoanGenius

## Overview
Lighthouse CI integration for automated performance testing and budget enforcement.

---

## CI Integration

### How It Runs
```yaml
# In CI pipeline (conceptual)
lighthouse-ci:
  stage: test
  script:
    - npm run build
    - npm run lighthouse:ci
  artifacts:
    paths:
      - .lighthouseci/
  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == "main"
```

### Local Run Command
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run locally
lhci autorun --config=./components/observability/LIGHTHOUSE_BUDGETS.json

# Or with custom URL
lhci collect --url=http://localhost:3000/Dashboard
lhci assert --config=./components/observability/LIGHTHOUSE_BUDGETS.json
```

---

## Latest Run Output (Sample)

### Run Summary
```
Lighthouse CI - 2026-01-20 10:30:00 UTC
Build: main@abc123
Status: ⚠️ WARNINGS (0 errors, 3 warnings)

Pages Tested: 6
Total Duration: 4m 32s
```

### Results by Page

#### Dashboard ✅ PASS
```
Performance: 82 (budget: 70) ✅
LCP: 1.8s (budget: 2.5s) ✅
CLS: 0.05 (budget: 0.1) ✅
TBT: 320ms (budget: 400ms) ✅

Script Size: 380KB (budget: 400KB) ✅
Total Size: 1.2MB (budget: 1.5MB) ✅
```

#### Pipeline ✅ PASS
```
Performance: 78 (budget: 70) ✅
LCP: 2.1s (budget: 2.5s) ✅
CLS: 0.08 (budget: 0.1) ✅
TBT: 380ms (budget: 400ms) ✅

Script Size: 390KB (budget: 400KB) ⚠️ CLOSE TO BUDGET
Total Size: 1.4MB (budget: 1.5MB) ⚠️ CLOSE TO BUDGET
```

#### Leads ⚠️ WARNING
```
Performance: 72 (budget: 70) ✅
LCP: 2.8s (budget: 3.0s) ⚠️ CLOSE TO BUDGET
CLS: 0.09 (budget: 0.1) ✅
TBT: 480ms (budget: 500ms) ✅

Script Size: 420KB (budget: 450KB) ✅
Total Size: 1.7MB (budget: 1.8MB) ⚠️ CLOSE TO BUDGET
```

#### Deal Detail ⚠️ WARNING
```
Performance: 71 (budget: 70) ⚠️ AT THRESHOLD
LCP: 3.2s (budget: 3.5s) ✅
CLS: 0.12 (budget: 0.15) ✅
TBT: 580ms (budget: 600ms) ✅

Script Size: 480KB (budget: 500KB) ✅
Total Size: 1.9MB (budget: 2.0MB) ⚠️ CLOSE TO BUDGET
```

#### Loan Application Wizard ✅ PASS
```
Performance: 76 (budget: 70) ✅
LCP: 2.4s (budget: 3.0s) ✅
CLS: 0.06 (budget: 0.1) ✅
TBT: 420ms (budget: 500ms) ✅

Script Size: 410KB (budget: 450KB) ✅
Total Size: 1.6MB (budget: 1.8MB) ✅
```

#### Borrower Portal ✅ PASS
```
Performance: 85 (budget: 70) ✅
LCP: 1.6s (budget: 2.5s) ✅
CLS: 0.03 (budget: 0.1) ✅
TBT: 280ms (budget: 400ms) ✅

Script Size: 320KB (budget: 350KB) ✅
Total Size: 1.0MB (budget: 1.2MB) ✅
```

---

## Recommendations from Latest Run

### High Priority
1. **Leads page LCP approaching budget**
   - Cause: Large table render with many leads
   - Fix: Implement virtualization for lead table
   
2. **Deal Detail performance at threshold**
   - Cause: Multiple API calls on mount
   - Fix: Consolidate API calls, add loading skeletons

### Medium Priority
3. **Total bundle size trending up**
   - Current: 1.7MB average
   - Budget: 1.8MB
   - Fix: Review dependencies, implement code splitting

4. **Render-blocking resources**
   - Several CSS files blocking render
   - Fix: Inline critical CSS, defer non-critical

---

## Historical Trend

### Performance Score Over Time
```
Week    Dashboard  Pipeline  Leads  DealDetail
W1-Jan     84        80       75      73
W2-Jan     83        79       74      72
W3-Jan     82        78       72      71  ← Current
```

### Bundle Size Trend
```
Week    Total Bundle (KB)
W1-Jan      1,580
W2-Jan      1,650
W3-Jan      1,720  ← Current (+4.2%)
```

---

## CI Gate Behavior

### On Budget Violation (Error)
```
❌ BUILD FAILED

Lighthouse budget exceeded:
- Performance score: 65 (minimum: 70)

This PR cannot be merged until performance issues are resolved.

Quick fixes:
1. Check for large images without lazy loading
2. Review new dependencies added
3. Check for blocking resources

Run locally: npm run lighthouse:debug
```

### On Warning
```
⚠️ BUILD PASSED WITH WARNINGS

Performance warning:
- LCP: 2.9s (budget: 3.0s) - 97% of budget

This PR can be merged, but review before next release.
Consider investigating before performance degrades further.
```

---

## Configuration Reference

### Key Settings
```javascript
{
  // Score thresholds
  "performance": { "error": 70, "warn": 80 },
  
  // Timing budgets (ms)
  "LCP": 3000,      // Largest Contentful Paint
  "CLS": 0.1,       // Cumulative Layout Shift
  "TBT": 500,       // Total Blocking Time
  "FCP": 2000,      // First Contentful Paint
  
  // Size budgets (KB)
  "script": 450,
  "total": 1800
}
```

### Updating Budgets
1. Review current performance baseline
2. Update `LIGHTHOUSE_BUDGETS.json`
3. Test locally: `npm run lighthouse:ci`
4. Commit changes
5. Budgets enforced on next CI run

---

## Troubleshooting

### "Lighthouse timed out"
- Increase timeout in config
- Check if page requires auth
- Verify dev server is running

### "Score variance too high"
- Increase `numberOfRuns` in config
- Check for flaky third-party scripts
- Review network conditions

### "Cannot find page"
- Verify routes in config match actual routes
- Check for redirects
- Ensure build completed before test

---

## Change Log
- 2026-01-20: Initial Lighthouse CI setup and baseline