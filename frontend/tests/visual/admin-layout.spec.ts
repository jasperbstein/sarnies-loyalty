import { test, expect } from '@playwright/test';

test.describe('Admin Layout - Premium UI Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');
  });

  test('sidebar uses premium typography - Fraunces display font', async ({ page }) => {
    const sidebarHeader = page.locator('text=Sarnies Loyalty').first();

    // Check font family
    const fontFamily = await sidebarHeader.evaluate((el) =>
      window.getComputedStyle(el).fontFamily
    );

    expect(fontFamily).toContain('Fraunces');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/sidebar-typography.png',
      fullPage: true
    });
  });

  test('sidebar has gradient accent logo', async ({ page }) => {
    const logo = page.locator('aside').locator('div').filter({ hasText: 'S' }).first();

    const background = await logo.evaluate((el) =>
      window.getComputedStyle(el).background
    );

    // Should contain gradient
    expect(background).toContain('gradient');
    expect(background).toContain('rgb(184, 147, 94)'); // accent-500
  });

  test('navigation items have premium hover states', async ({ page }) => {
    const usersNav = page.locator('button:has-text("Users")');

    // Get initial state
    const initialBg = await usersNav.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Hover
    await usersNav.hover();
    await page.waitForTimeout(200); // Wait for transition

    const hoverBg = await usersNav.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should change on hover
    expect(hoverBg).not.toBe(initialBg);

    await page.screenshot({
      path: 'tests/screenshots/nav-hover-state.png'
    });
  });

  test('active navigation has accent indicator', async ({ page }) => {
    await page.goto('/admin/users');

    const usersNav = page.locator('button:has-text("Users")');

    // Check for black background (active state)
    const bg = await usersNav.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be black (rgb(13, 13, 13))
    expect(bg).toBe('rgb(13, 13, 13)');

    // Check for accent indicator (left border)
    const hasIndicator = await usersNav.locator('div').first().isVisible();
    expect(hasIndicator).toBeTruthy();

    await page.screenshot({
      path: 'tests/screenshots/nav-active-state.png'
    });
  });

  test('user info section has accent gradient avatar', async ({ page }) => {
    const avatar = page.locator('aside').locator('div').filter({ hasText: 'A' }).first();

    const background = await avatar.evaluate((el) =>
      window.getComputedStyle(el).background
    );

    expect(background).toContain('gradient');

    await page.screenshot({
      path: 'tests/screenshots/user-avatar.png'
    });
  });

  test('visual regression - full sidebar', async ({ page }) => {
    const sidebar = page.locator('aside');

    await sidebar.screenshot({
      path: 'tests/screenshots/sidebar-full.png'
    });

    // Measure sidebar width
    const width = await sidebar.evaluate((el) => el.offsetWidth);
    expect(width).toBe(256); // 64 * 4 = 256px (w-64)
  });
});
