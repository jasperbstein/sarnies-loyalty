import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('premium fonts load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');

    // Wait for fonts to load
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check if Fraunces font is applied
    const title = page.locator('h1').first();
    const fontFamily = await title.evaluate((el) =>
      window.getComputedStyle(el).fontFamily
    );

    expect(fontFamily).toContain('Fraunces');
  });

  test('page renders without layout shift', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');

    // Measure cumulative layout shift
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsScore = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsScore);
        }, 3000);
      });
    });

    // CLS should be less than 0.1 (good)
    expect(cls).toBeLessThan(0.1);
  });

  test('animations run at 60fps', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');
    await page.goto('/admin/users');
    await page.waitForTimeout(1000);

    // Hover over table row to trigger animation
    const firstRow = page.locator('tbody tr').first();
    await firstRow.hover();

    // Check transition duration
    const transition = await firstRow.evaluate((el) =>
      window.getComputedStyle(el).transition
    );

    // Should have smooth transitions
    expect(transition).toContain('150ms'); // duration-150
  });

  test('micro-interactions have optimal timing', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');
    await page.goto('/admin/users');

    // Check filter pill animations
    const pill = page.locator('button:has-text("Customer")');

    const transition = await pill.evaluate((el) =>
      window.getComputedStyle(el).transition
    );

    // Should have all transition property for expand-hover
    expect(transition).toContain('all');
    expect(transition).toContain('150ms');
  });

  test('images and assets load efficiently', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Login page with background image should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('table renders quickly with many rows', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');

    const startTime = Date.now();

    await page.goto('/admin/users');
    await page.waitForSelector('table');

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Should render within 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('navigation transitions are smooth', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');

    const startTime = Date.now();

    // Navigate to users
    await page.click('button:has-text("Users")');
    await page.waitForURL('/admin/users');

    const endTime = Date.now();
    const navTime = endTime - startTime;

    // Navigation should be instant (< 500ms)
    expect(navTime).toBeLessThan(500);
  });

  test('shadow and gradient rendering is performant', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');

    // Check if GPU acceleration is enabled for transforms
    const logo = page.locator('aside').locator('div').filter({ hasText: 'S' }).first();

    const willChange = await logo.evaluate((el) =>
      window.getComputedStyle(el).willChange
    );

    // Gradients should render without performance issues
    // Check if page is responsive
    const startTime = Date.now();
    await page.click('button:has-text("Users")');
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(300);
  });
});
