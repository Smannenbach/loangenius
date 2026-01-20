# E2E Test Specification for Playwright

## Overview
This document defines the Playwright E2E tests needed to prevent dead clicks and broken navigation from regressing.

## Test 1: Sidebar Navigation Smoke Test

```typescript
// tests/navigation.spec.ts
import { test, expect } from '@playwright/test';

const SIDEBAR_ROUTES = [
  'Dashboard',
  'Pipeline', 
  'Leads',
  'Loans',
  'Contacts',
  'QuoteGenerator',
  'AIAssistant',
  'Communications',
  'EmailSequences',
  'Reports',
  'Users',
  'LenderIntegrations',
  'PortalSettings',
  'SystemHealth',
  'Settings'
];

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login and wait for dashboard
    await page.goto('/Dashboard');
    await page.waitForLoadState('networkidle');
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`navigates to ${route} without error`, async ({ page }) => {
      // Click sidebar link
      await page.click(`a[href*="${route}"]`);
      
      // Should not hit 404
      await expect(page).not.toHaveURL(/NotFound/);
      
      // Page should load with content
      await expect(page.locator('main')).toBeVisible();
      
      // No error boundary should appear
      await expect(page.locator('text=Something Went Wrong')).not.toBeVisible();
    });
  }
});
```

## Test 2: Primary CTA Feedback Test

```typescript
// tests/cta-feedback.spec.ts
import { test, expect } from '@playwright/test';

const PRIMARY_CTAS = [
  { page: 'Dashboard', testId: 'cta:Dashboard:NewDeal', expectAction: 'navigation' },
  { page: 'Leads', testId: 'cta:Leads:Import', expectAction: 'modal' },
  { page: 'Leads', testId: 'cta:Leads:AddLead', expectAction: 'modal' },
  { page: 'Settings', testId: 'cta:Settings:Save', expectAction: 'toast' },
];

test.describe('Primary CTA Feedback', () => {
  for (const cta of PRIMARY_CTAS) {
    test(`${cta.page} - ${cta.testId} provides feedback`, async ({ page }) => {
      await page.goto(`/${cta.page}`);
      await page.waitForLoadState('networkidle');
      
      const button = page.locator(`[data-testid="${cta.testId}"]`);
      await expect(button).toBeVisible();
      
      // Click the CTA
      await button.click();
      
      // Verify feedback based on expected action
      switch (cta.expectAction) {
        case 'navigation':
          await expect(page).not.toHaveURL(`/${cta.page}`);
          break;
        case 'modal':
          await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
          break;
        case 'toast':
          await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
          break;
        case 'loading':
          await expect(button.locator('.animate-spin')).toBeVisible();
          break;
      }
    });
  }
});
```

## Test 3: Smoke Flows

```typescript
// tests/smoke-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Leads page - can open import wizard', async ({ page }) => {
    await page.goto('/Leads');
    
    // Find import button
    const importBtn = page.locator('button:has-text("Import")');
    await expect(importBtn).toBeVisible();
    
    await importBtn.click();
    
    // Import wizard modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Import Leads')).toBeVisible();
  });

  test('Deals page - can start new deal wizard', async ({ page }) => {
    await page.goto('/Deals');
    
    // Find new deal button
    const newDealBtn = page.locator('a:has-text("New Deal"), button:has-text("New Deal")');
    await expect(newDealBtn).toBeVisible();
    
    await newDealBtn.click();
    
    // Should navigate to wizard or open modal
    await expect(page.locator('text=Loan Type, text=Property, text=Step')).toBeVisible();
  });

  test('MISMO page - can access export panel', async ({ page }) => {
    await page.goto('/MISMOImportExport');
    
    // Export tab should be visible
    await expect(page.locator('text=Export')).toBeVisible();
    
    // Click export tab
    await page.click('button:has-text("Export"), [role="tab"]:has-text("Export")');
    
    // Export options should appear
    await expect(page.locator('text=MISMO')).toBeVisible();
  });
});
```

## Test 4: Error Boundary Test

```typescript
// tests/error-handling.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('error boundary catches and displays errors gracefully', async ({ page }) => {
    // Navigate to error test page (if exists)
    await page.goto('/ErrorTest');
    
    // Trigger an error
    const errorTrigger = page.locator('[data-testid="trigger-error"]');
    if (await errorTrigger.isVisible()) {
      await errorTrigger.click();
      
      // Error boundary should show friendly message
      await expect(page.locator('text=Something Went Wrong')).toBeVisible();
      
      // Should have recovery options
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    }
  });
});
```

## CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
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
        
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Stable Locator Patterns

Always prefer these locator strategies (in order):
1. `data-testid` - Most stable: `page.locator('[data-testid="cta:PageName:Action"]')`
2. `role` - Semantic: `page.getByRole('button', { name: 'Submit' })`
3. `text` - User-facing: `page.getByText('Save Changes')`
4. CSS selectors - Last resort: `page.locator('.btn-primary')`

## Required data-testid Conventions

Every primary CTA must have:
```
data-testid="cta:<PageName>:<ActionName>"
```

Examples:
- `data-testid="cta:Leads:Import"`
- `data-testid="cta:Dashboard:NewDeal"`
- `data-testid="cta:DealDetail:ExportMISMO"`
- `data-testid="cta:Settings:Save"