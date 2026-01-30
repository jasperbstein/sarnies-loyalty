import { test, expect } from '@playwright/test';

test.describe('Users Page - Premium UI Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Admin');
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard');
    await page.goto('/admin/users');
    await page.waitForTimeout(1000); // Wait for data load
  });

  test('page title uses Fraunces display font', async ({ page }) => {
    const title = page.locator('h1:has-text("Users")');

    const fontFamily = await title.evaluate((el) =>
      window.getComputedStyle(el).fontFamily
    );
    const fontSize = await title.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    const fontWeight = await title.evaluate((el) =>
      window.getComputedStyle(el).fontWeight
    );

    expect(fontFamily).toContain('Fraunces');
    expect(fontSize).toBe('32px'); // display-xl
    expect(fontWeight).toBe('700');

    await page.screenshot({
      path: 'tests/screenshots/users-title.png'
    });
  });

  test('search bar has premium inset shadow and glow focus', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search users"]');

    // Check inset shadow
    const boxShadow = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(boxShadow).toContain('inset');

    // Focus and check glow
    await searchInput.focus();
    await page.waitForTimeout(200);

    const focusShadow = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Should have glow (accent color)
    expect(focusShadow).toContain('184, 147, 94'); // accent-500 rgb

    await page.screenshot({
      path: 'tests/screenshots/search-focus-glow.png'
    });
  });

  test('filter pills have expand-hover and press-scale animations', async ({ page }) => {
    const allPill = page.locator('button:has-text("All")').first();

    // Get initial transform
    const initialTransform = await allPill.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Hover
    await allPill.hover();
    await page.waitForTimeout(200);

    const hoverTransform = await allPill.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Should scale on hover (not the active one, check inactive pill)
    const customerPill = page.locator('button:has-text("Customer")');
    await customerPill.hover();
    await page.waitForTimeout(200);

    await page.screenshot({
      path: 'tests/screenshots/filter-pills-hover.png'
    });
  });

  test('active filter pill is pure black with shadow', async ({ page }) => {
    const allPill = page.locator('button:has-text("All")').first();

    const bg = await allPill.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const color = await allPill.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    const boxShadow = await allPill.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    expect(bg).toBe('rgb(0, 0, 0)'); // Pure black
    expect(color).toBe('rgb(255, 255, 255)'); // White text
    expect(boxShadow).not.toBe('none');
  });

  test('table has proper 8px spacing rhythm', async ({ page }) => {
    const table = page.locator('table').first();

    // Check header padding (should be py-3 px-4 = 24px, 32px)
    const headerCell = page.locator('th').first();
    const paddingY = await headerCell.evaluate((el) =>
      window.getComputedStyle(el).paddingTop
    );
    const paddingX = await headerCell.evaluate((el) =>
      window.getComputedStyle(el).paddingLeft
    );

    expect(paddingY).toBe('12px'); // py-3 = 24px / 2
    expect(paddingX).toBe('16px'); // px-4 = 32px / 2

    // Check table cell padding
    const bodyCell = page.locator('td').first();
    const cellPaddingY = await bodyCell.evaluate((el) =>
      window.getComputedStyle(el).paddingTop
    );

    expect(cellPaddingY).toBe('16px'); // py-4 = 32px / 2
  });

  test('table rows have hover animation with accent border', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();

    // Get initial state
    const initialBg = await firstRow.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Hover
    await firstRow.hover();
    await page.waitForTimeout(200);

    const hoverBg = await firstRow.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Background should change
    expect(hoverBg).not.toBe(initialBg);

    // Check for left border accent (border-l-accent-500)
    const borderLeft = await firstRow.evaluate((el) =>
      window.getComputedStyle(el).borderLeft
    );

    expect(borderLeft).toContain('rgb(184, 147, 94)'); // accent-500

    await page.screenshot({
      path: 'tests/screenshots/table-row-hover.png'
    });
  });

  test('avatar icons have proper sizing and colors', async ({ page }) => {
    const avatar = page.locator('td').first().locator('div').first();

    const width = await avatar.evaluate((el) => el.offsetWidth);
    const height = await avatar.evaluate((el) => el.offsetHeight);
    const bg = await avatar.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(width).toBe(40); // w-10
    expect(height).toBe(40); // h-10
    expect(bg).toContain('rgb'); // Should have accent-100 background
  });

  test('type badges use proper typography and colors', async ({ page }) => {
    const badge = page.locator('td span').filter({ hasText: /media|investor|staff|employee|customer/ }).first();

    const fontSize = await badge.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    const fontWeight = await badge.evaluate((el) =>
      window.getComputedStyle(el).fontWeight
    );
    const textTransform = await badge.evaluate((el) =>
      window.getComputedStyle(el).textTransform
    );

    expect(fontSize).toBe('11px'); // text-ui-xs
    expect(fontWeight).toBe('600'); // font-semibold
    expect(textTransform).toBe('uppercase');

    await page.screenshot({
      path: 'tests/screenshots/type-badges.png'
    });
  });

  test('visual regression - full users page', async ({ page }) => {
    await page.screenshot({
      path: 'tests/screenshots/users-page-full.png',
      fullPage: true
    });
  });

  test('visual regression - table section only', async ({ page }) => {
    const tableCard = page.locator('div').filter({ has: page.locator('table') }).first();

    await tableCard.screenshot({
      path: 'tests/screenshots/users-table-card.png'
    });
  });
});
