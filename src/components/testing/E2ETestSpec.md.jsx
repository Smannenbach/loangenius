# E2E Test Specification - Playwright

## Overview
End-to-end tests to verify navigation and interactive elements work correctly.

---

## Test Suite Structure

```
tests/
├── navigation.spec.ts      # Sidebar/mobile nav routing
├── cta-feedback.spec.ts    # Primary CTAs show feedback
├── smoke-flows.spec.ts     # Critical user journeys
└── fixtures/
    └── auth.ts             # Login helpers
```

---

## Test 1: Navigation Routes

```typescript
// tests/navigation.spec.ts
import { test, expect } from '@playwright/test';

const SIDEBAR_ROUTES = [
  'Dashboard', 'Pipeline', 'Leads', 'Loans', 'Contacts',
  'QuoteGenerator', 'AIAssistant', 'Communications', 'Reports',
  'Users', 'Settings'
];

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    // ... auth flow
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`navigates to ${route}`, async ({ page }) => {
      await page.goto(`/${route}`);
      
      // Should not show 404
      await expect(page.locator('text=Page Not Found')).not.toBeVisible();
      
      // Should have at least one visible primary CTA
      const cta = page.locator('[data-testid^="cta:"]').first();
      await expect(cta).toBeVisible({ timeout: 5000 });
    });
  }
});
```

---

## Test 2: CTA Feedback

```typescript
// tests/cta-feedback.spec.ts
import { test, expect } from '@playwright/test';

const CTA_TESTS = [
  { page: 'Leads', testId: 'cta:Leads:Import', expectation: 'modal' },
  { page: 'Dashboard', testId: 'cta:Dashboard:CreateDeal', expectation: 'navigation' },
  { page: 'QAAudit', testId: 'cta:QAAudit:RunAudit', expectation: 'toast' },
];

test.describe('CTA Feedback', () => {
  for (const { page: pageName, testId, expectation } of CTA_TESTS) {
    test(`${testId} shows ${expectation}`, async ({ page }) => {
      await page.goto(`/${pageName}`);
      
      const cta = page.locator(`[data-testid="${testId}"]`);
      await cta.click();
      
      switch (expectation) {
        case 'modal':
          await expect(page.locator('[role="dialog"]')).toBeVisible();
          break;
        case 'navigation':
          await expect(page.url()).not.toContain(pageName);
          break;
        case 'toast':
          await expect(page.locator('[data-sonner-toast]')).toBeVisible();
          break;
        case 'loading':
          await expect(cta.locator('.animate-spin')).toBeVisible();
          break;
      }
    });
  }
});
```

---

## Test 3: Smoke Flows

```typescript
// tests/smoke-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Flows', () => {
  test('Leads: open import wizard', async ({ page }) => {
    await page.goto('/Leads');
    
    // Click import button
    const importBtn = page.locator('[data-testid="cta:Leads:Import"]');
    await importBtn.click();
    
    // Verify modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Import Leads')).toBeVisible();
  });

  test('Deals: create new deal', async ({ page }) => {
    await page.goto('/Pipeline');
    
    // Click new deal button
    await page.click('text=New Deal');
    
    // Should navigate to wizard
    await expect(page.url()).toContain('DealWizard');
  });

  test('MISMO: export panel', async ({ page }) => {
    await page.goto('/MISMOImportExport');
    
    // Export tab should be visible
    await expect(page.locator('text=Export')).toBeVisible();
  });
});
```

---

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
  ],
});
```

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Locator Best Practices

```typescript
// ✅ GOOD: Use data-testid
page.locator('[data-testid="cta:Leads:Import"]')

// ✅ GOOD: Role-based
page.getByRole('button', { name: 'Import Leads' })

// ✅ GOOD: Combine for precision
page.locator('[data-testid="leads-table"]').getByRole('row').first()

// ❌ AVOID: Fragile CSS selectors
page.locator('.btn-primary.mt-4')

// ❌ AVOID: Text that might change
page.locator('text=Click here to import your leads now!')
```

---

## Debugging Failed Tests

1. Run with UI mode: `npx playwright test --ui`
2. Check traces: `npx playwright show-trace trace.zip`
3. Review screenshots in `playwright-report/`

---

*Last updated: 2026-01-20*