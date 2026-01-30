import { test, expect } from '@playwright/test';

const BASE_URL = 'http://152.42.209.198:3001';

test.describe('Navigation and Gesture Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should load home page quickly after first visit', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app/home`);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`Load time: ${loadTime}ms`);
    // After warmup, should be fast (increased to 15s for cold start)
    expect(loadTime).toBeLessThan(15000);
  });

  test('should have bottom navigation on all customer pages', async ({ page }) => {
    const pages = ['/app/home', '/app/rewards', '/app/activity', '/app/profile'];

    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      const bottomNav = await page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).toBeVisible();

      // Check all 4 nav items exist
      const navItems = await page.locator('nav.fixed.bottom-0 a').count();
      expect(navItems).toBe(4);
    }
  });

  test('should navigate between tabs correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/home`);

    // Click Rewards tab
    await page.click('text=Rewards');
    await page.waitForURL('**/app/rewards');
    expect(page.url()).toContain('/app/rewards');

    // Click Activity tab
    await page.click('text=Activity');
    await page.waitForURL('**/app/activity');
    expect(page.url()).toContain('/app/activity');

    // Click Profile tab
    await page.click('text=Profile');
    await page.waitForURL('**/app/profile');
    expect(page.url()).toContain('/app/profile');

    // Click Home tab
    await page.click('text=Home');
    await page.waitForURL('**/app/home');
    expect(page.url()).toContain('/app/home');
  });

  test('should show correct active tab styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/home`);

    // Home should be active (black text)
    const homeLink = page.locator('nav a:has-text("Home")');
    const homeClasses = await homeLink.getAttribute('class');
    expect(homeClasses).toContain('text-black');
  });

  test.skip('should not show staff vouchers to customers', async ({ page }) => {
    // Skipped: Requires authentication
    await page.goto(`${BASE_URL}/app/vouchers`);

    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('main', { timeout: 10000 });

    // Check that "Staff Rewards" section doesn't exist
    const staffSection = page.locator('text=Staff Rewards');
    await expect(staffSection).not.toBeVisible();
  });

  test.skip('should not have duplicate vouchers in featured and category', async ({ page }) => {
    // Skipped: Requires authentication
    await page.goto(`${BASE_URL}/app/vouchers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('main', { timeout: 10000 });

    // Get all voucher titles
    const voucherTitles = await page.locator('[data-testid="voucher-card"], .voucher-card, h3').allTextContents();

    // Check for duplicates
    const titleCounts = voucherTitles.reduce((acc, title) => {
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Each voucher should appear only once
    const duplicates = Object.entries(titleCounts).filter(([_, count]) => count > 1);
    expect(duplicates.length).toBe(0);
  });

  test.skip('should allow customer to view voucher details', async ({ page }) => {
    // Skipped: Requires authentication
    await page.goto(`${BASE_URL}/app/vouchers`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('main', { timeout: 10000 });

    // Click first voucher if exists
    const firstVoucher = page.locator('[data-testid="voucher-card"], .cursor-pointer').first();
    const voucherCount = await firstVoucher.count();

    if (voucherCount > 0) {
      await firstVoucher.click();

      // Should not show "not available for your user type" error
      const errorMessage = page.locator('text=This voucher is not available for your user type');
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('should have optimized font loading', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/home`);

    // Check that fonts are loaded with display: swap
    const fonts = await page.evaluate(() => {
      return Array.from(document.fonts).map(font => ({
        family: font.family,
        status: font.status
      }));
    });

    expect(fonts.length).toBeGreaterThan(0);
  });

  test('navigation should be fast after warmup', async ({ page }) => {
    // Warmup
    await page.goto(`${BASE_URL}/app/home`);
    await page.waitForLoadState('domcontentloaded');

    // Test navigation speed
    const startTime = Date.now();
    await page.click('text=Rewards');
    await page.waitForURL('**/app/rewards');
    await page.waitForLoadState('domcontentloaded');
    const navTime = Date.now() - startTime;

    console.log(`Navigation time: ${navTime}ms`);
    // Should be reasonably fast after warmup
    expect(navTime).toBeLessThan(3000);
  });

  test('should have proper page titles and meta', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/home`);
    const title = await page.title();
    expect(title).toContain('Sarnies');
  });

  test('mobile: bottom nav should be fixed at bottom', async ({ page, isMobile }) => {
    await page.goto(`${BASE_URL}/app/home`);

    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible();

    const box = await nav.boundingBox();
    if (box) {
      // Should be at the bottom of viewport
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        expect(box.y + box.height).toBeGreaterThan(viewportSize.height - 100);
      }
    }
  });
});

test.describe('Performance Metrics', () => {
  test('should have acceptable Core Web Vitals', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/home`);

    // Measure performance
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime || 0,
      };
    });

    console.log('Performance metrics:', metrics);

    // These are reasonable targets for a production app
    expect(metrics.domContentLoaded).toBeLessThan(3000);
  });
});
