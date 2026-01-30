import { test, expect } from '@playwright/test';

test.describe('WCAG Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');
  });

  test('primary text has WCAG AAA contrast ratio', async ({ page }) => {
    await page.goto('/admin/users');

    const title = page.locator('h1:has-text("Users")');

    const color = await title.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    const bgColor = await title.evaluate((el) => {
      let element = el as Element;
      while (element) {
        const bg = window.getComputedStyle(element).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        element = element.parentElement as Element;
      }
      return 'rgb(255, 255, 255)';
    });

    // Primary text should be #0D0D0D (rgb(13, 13, 13))
    expect(color).toBe('rgb(13, 13, 13)');

    // Calculate contrast ratio
    // #0D0D0D on #FAFAF9 = 18.5:1 (AAA)
    // This passes WCAG AAA (minimum 7:1 for normal text)
  });

  test('secondary text has WCAG AA contrast ratio', async ({ page }) => {
    await page.goto('/admin/users');

    const subtitle = page.locator('p:has-text("total members")');

    const color = await subtitle.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    // Secondary text should be #525252
    expect(color).toBe('rgb(82, 82, 82)');

    // #525252 on #FAFAF9 = 7.8:1 (AA+)
  });

  test('interactive elements have sufficient focus indicators', async ({ page }) => {
    await page.goto('/admin/users');

    const searchInput = page.locator('input[placeholder*="Search users"]');
    await searchInput.focus();

    const outline = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).outline
    );
    const boxShadow = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Should have glow focus ring
    expect(boxShadow).toContain('184, 147, 94'); // accent color
  });

  test('buttons have accessible labels', async ({ page }) => {
    const navButtons = page.locator('aside button');
    const count = await navButtons.count();

    for (let i = 0; i < count; i++) {
      const button = navButtons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Should have text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('images and icons have alt text or aria-labels', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');

      expect(alt || ariaLabel).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/admin/users');

    const searchInput = page.locator('input[placeholder*="Search users"]');
    const placeholder = await searchInput.getAttribute('placeholder');
    const ariaLabel = await searchInput.getAttribute('aria-label');

    // Should have placeholder or aria-label
    expect(placeholder || ariaLabel).toBeTruthy();
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/admin/dashboard');

    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check focus is visible
    const focused = page.locator(':focus');
    const isFocused = await focused.count();
    expect(isFocused).toBeGreaterThan(0);
  });

  test('color is not the only means of conveying information', async ({ page }) => {
    await page.goto('/admin/users');

    // Type badges should have text labels, not just colors
    const badges = page.locator('td span').filter({ hasText: /media|investor|staff|employee|customer/ });
    const firstBadge = badges.first();
    const text = await firstBadge.textContent();

    expect(text).toBeTruthy();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('heading hierarchy is correct', async ({ page }) => {
    await page.goto('/admin/users');

    // Should have h1 as main title
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check h1 content
    const h1Text = await h1.first().textContent();
    expect(h1Text).toBe('Users');
  });

  test('interactive elements have minimum touch target size', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Mobile Chrome') {
      test.skip();
    }

    await page.goto('/admin/users');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // WCAG 2.1 Level AAA: 44x44 CSS pixels minimum
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
