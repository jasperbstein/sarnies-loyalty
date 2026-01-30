import { test, expect } from '@playwright/test';

test.describe('Page-by-Page Design Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForTimeout(500);
    await page.click('text=Admin');
    await page.waitForTimeout(300);
    await page.fill('input[type="email"]', 'admin@sarnies.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Admin Login")');
    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('DASHBOARD PAGE - Complete Analysis', async ({ page }) => {
    console.log('\n=== DASHBOARD PAGE ANALYSIS ===\n');

    // Full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/analysis/01-dashboard-full.png',
      fullPage: true
    });

    // 1. Typography Analysis
    const pageTitle = page.locator('h1').first();
    const titleFont = await pageTitle.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      letterSpacing: window.getComputedStyle(el).letterSpacing,
      lineHeight: window.getComputedStyle(el).lineHeight,
      color: window.getComputedStyle(el).color,
    }));

    console.log('Dashboard Title Typography:', titleFont);
    expect(titleFont.fontFamily).toContain('Fraunces');
    expect(titleFont.fontSize).toBe('32px');
    expect(titleFont.fontWeight).toBe('700');

    // 2. Stats Cards Analysis
    const statsCards = page.locator('div').filter({ hasText: 'Total Transactions' }).first().locator('..');
    const statsCardStyles = await statsCards.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      border: window.getComputedStyle(el).border,
      borderRadius: window.getComputedStyle(el).borderRadius,
      boxShadow: window.getComputedStyle(el).boxShadow,
      padding: window.getComputedStyle(el).padding,
    }));

    console.log('Stats Card Styles:', statsCardStyles);

    await statsCards.screenshot({
      path: 'tests/screenshots/analysis/01-dashboard-stats-cards.png'
    });

    // 3. Spacing Measurements
    const container = page.locator('.max-w-\\[1280px\\]').first();
    const spacing = await container.evaluate((el) => ({
      paddingX: window.getComputedStyle(el).paddingLeft,
      paddingY: window.getComputedStyle(el).paddingTop,
      gap: window.getComputedStyle(el).gap,
    }));

    console.log('Container Spacing:', spacing);
    expect(spacing.paddingX).toBe('16px'); // px-4
    expect(spacing.paddingY).toBe('16px'); // py-4

    // 4. Color Palette Analysis
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    console.log('Background Color:', bgColor);
    expect(bgColor).toBe('rgb(250, 250, 249)'); // #FAFAF9
  });

  test('USERS PAGE - Complete Analysis', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(1500);

    console.log('\n=== USERS PAGE ANALYSIS ===\n');

    // Full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/analysis/02-users-full.png',
      fullPage: true
    });

    // 1. Page Header Analysis
    const title = page.locator('h1:has-text("Users")');
    const subtitle = page.locator('p:has-text("total members")');

    const headerStyles = await title.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      color: window.getComputedStyle(el).color,
      letterSpacing: window.getComputedStyle(el).letterSpacing,
    }));

    const subtitleStyles = await subtitle.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      color: window.getComputedStyle(el).color,
    }));

    console.log('Users Title:', headerStyles);
    console.log('Users Subtitle:', subtitleStyles);

    expect(headerStyles.fontFamily).toContain('Fraunces');
    expect(subtitleStyles.fontSize).toBe('13px'); // text-ui-sm

    // 2. Search Bar Analysis
    const searchInput = page.locator('input[placeholder*="Search users"]');
    const searchStyles = await searchInput.evaluate((el) => ({
      padding: window.getComputedStyle(el).padding,
      border: window.getComputedStyle(el).border,
      borderRadius: window.getComputedStyle(el).borderRadius,
      boxShadow: window.getComputedStyle(el).boxShadow,
      fontSize: window.getComputedStyle(el).fontSize,
      fontFamily: window.getComputedStyle(el).fontFamily,
    }));

    console.log('Search Input Styles:', searchStyles);

    await searchInput.screenshot({
      path: 'tests/screenshots/analysis/02-users-search-bar.png'
    });

    // Test focus state
    await searchInput.focus();
    await page.waitForTimeout(200);

    const focusStyles = await searchInput.evaluate((el) => ({
      boxShadow: window.getComputedStyle(el).boxShadow,
      outline: window.getComputedStyle(el).outline,
    }));

    console.log('Search Focus Styles:', focusStyles);
    expect(focusStyles.boxShadow).toContain('184, 147, 94'); // accent glow

    await page.screenshot({
      path: 'tests/screenshots/analysis/02-users-search-focus.png'
    });

    // 3. Filter Pills Analysis
    const activePill = page.locator('button:has-text("All")').first();
    const inactivePill = page.locator('button:has-text("Customer")');

    const activePillStyles = await activePill.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      color: window.getComputedStyle(el).color,
      padding: window.getComputedStyle(el).padding,
      borderRadius: window.getComputedStyle(el).borderRadius,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      boxShadow: window.getComputedStyle(el).boxShadow,
    }));

    const inactivePillStyles = await inactivePill.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      color: window.getComputedStyle(el).color,
      border: window.getComputedStyle(el).border,
    }));

    console.log('Active Filter Pill:', activePillStyles);
    console.log('Inactive Filter Pill:', inactivePillStyles);

    expect(activePillStyles.background).toBe('rgb(0, 0, 0)'); // Pure black

    await page.locator('.flex.items-center.gap-2').first().screenshot({
      path: 'tests/screenshots/analysis/02-users-filter-pills.png'
    });

    // 4. Table Analysis
    const table = page.locator('table').first();

    // Header analysis
    const tableHeader = page.locator('th').first();
    const tableHeaderStyles = await tableHeader.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      padding: window.getComputedStyle(el).padding,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      color: window.getComputedStyle(el).color,
      textTransform: window.getComputedStyle(el).textTransform,
      letterSpacing: window.getComputedStyle(el).letterSpacing,
    }));

    console.log('Table Header Styles:', tableHeaderStyles);
    expect(tableHeaderStyles.fontSize).toBe('12px'); // text-table-header
    expect(tableHeaderStyles.textTransform).toBe('uppercase');

    // Cell analysis
    const tableCell = page.locator('td').first();
    const cellStyles = await tableCell.evaluate((el) => ({
      padding: window.getComputedStyle(el).padding,
      fontSize: window.getComputedStyle(el).fontSize,
    }));

    console.log('Table Cell Styles:', cellStyles);
    expect(cellStyles.padding).toContain('16px'); // py-4 px-4

    await table.screenshot({
      path: 'tests/screenshots/analysis/02-users-table.png'
    });

    // 5. Table Row Hover Analysis
    const firstRow = page.locator('tbody tr').first();

    const normalStyles = await firstRow.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      borderLeft: window.getComputedStyle(el).borderLeft,
    }));

    await firstRow.hover();
    await page.waitForTimeout(200);

    const hoverStyles = await firstRow.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      borderLeft: window.getComputedStyle(el).borderLeft,
      transform: window.getComputedStyle(el).transform,
    }));

    console.log('Row Normal State:', normalStyles);
    console.log('Row Hover State:', hoverStyles);

    expect(hoverStyles.borderLeft).toContain('rgb(184, 147, 94)'); // accent-500

    await page.screenshot({
      path: 'tests/screenshots/analysis/02-users-table-hover.png'
    });

    // 6. Avatar and Badge Analysis
    const avatar = page.locator('td div').first();
    const avatarStyles = await avatar.evaluate((el) => ({
      width: `${el.offsetWidth}px`,
      height: `${el.offsetHeight}px`,
      background: window.getComputedStyle(el).backgroundColor,
      borderRadius: window.getComputedStyle(el).borderRadius,
    }));

    console.log('Avatar Styles:', avatarStyles);
    expect(avatarStyles.width).toBe('40px'); // w-10

    const badge = page.locator('td span').filter({ hasText: /media|investor|staff|employee|customer/ }).first();
    const badgeStyles = await badge.evaluate((el) => ({
      padding: window.getComputedStyle(el).padding,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      textTransform: window.getComputedStyle(el).textTransform,
      background: window.getComputedStyle(el).backgroundColor,
      color: window.getComputedStyle(el).color,
      borderRadius: window.getComputedStyle(el).borderRadius,
    }));

    console.log('Badge Styles:', badgeStyles);
  });

  test('VOUCHERS PAGE - Complete Analysis', async ({ page }) => {
    await page.goto('/admin/vouchers');
    await page.waitForTimeout(1500);

    console.log('\n=== VOUCHERS PAGE ANALYSIS ===\n');

    await page.screenshot({
      path: 'tests/screenshots/analysis/03-vouchers-full.png',
      fullPage: true
    });

    const title = page.locator('h1').first();
    const titleStyles = await title.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      color: window.getComputedStyle(el).color,
    }));

    console.log('Vouchers Title:', titleStyles);
  });

  test('TRANSACTIONS PAGE - Complete Analysis', async ({ page }) => {
    await page.goto('/admin/transactions');
    await page.waitForTimeout(1500);

    console.log('\n=== TRANSACTIONS PAGE ANALYSIS ===\n');

    await page.screenshot({
      path: 'tests/screenshots/analysis/04-transactions-full.png',
      fullPage: true
    });

    const title = page.locator('h1').first();
    const titleStyles = await title.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
    }));

    console.log('Transactions Title:', titleStyles);
  });

  test('SETTINGS PAGE - Complete Analysis', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForTimeout(1500);

    console.log('\n=== SETTINGS PAGE ANALYSIS ===\n');

    await page.screenshot({
      path: 'tests/screenshots/analysis/05-settings-full.png',
      fullPage: true
    });
  });

  test('SIDEBAR NAVIGATION - Complete Analysis', async ({ page }) => {
    console.log('\n=== SIDEBAR NAVIGATION ANALYSIS ===\n');

    const sidebar = page.locator('aside');

    // 1. Sidebar Header
    const sidebarHeader = page.locator('text=Sarnies Loyalty').first();
    const headerStyles = await sidebarHeader.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      letterSpacing: window.getComputedStyle(el).letterSpacing,
    }));

    console.log('Sidebar Header:', headerStyles);
    expect(headerStyles.fontFamily).toContain('Fraunces');

    // 2. Logo Analysis
    const logo = sidebar.locator('div').filter({ hasText: /^S$/ }).first();
    const logoStyles = await logo.evaluate((el) => ({
      width: `${el.offsetWidth}px`,
      height: `${el.offsetHeight}px`,
      background: window.getComputedStyle(el).background,
      borderRadius: window.getComputedStyle(el).borderRadius,
      boxShadow: window.getComputedStyle(el).boxShadow,
    }));

    console.log('Logo Styles:', logoStyles);
    expect(logoStyles.background).toContain('gradient');
    expect(logoStyles.background).toContain('184, 147, 94'); // accent-500

    await sidebar.screenshot({
      path: 'tests/screenshots/analysis/06-sidebar-header.png'
    });

    // 3. User Info Section
    const userAvatar = sidebar.locator('div').filter({ hasText: /^A$/ }).first();
    const avatarStyles = await userAvatar.evaluate((el) => ({
      background: window.getComputedStyle(el).background,
      boxShadow: window.getComputedStyle(el).boxShadow,
    }));

    console.log('User Avatar:', avatarStyles);
    expect(avatarStyles.background).toContain('gradient');

    // 4. Navigation Items Analysis
    const dashboardNav = page.locator('button:has-text("Dashboard")');
    const usersNav = page.locator('button:has-text("Users")');

    // Click Users to make it active
    await usersNav.click();
    await page.waitForTimeout(300);

    const activeNavStyles = await usersNav.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      color: window.getComputedStyle(el).color,
      boxShadow: window.getComputedStyle(el).boxShadow,
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
    }));

    console.log('Active Navigation:', activeNavStyles);
    expect(activeNavStyles.background).toBe('rgb(13, 13, 13)'); // text-primary (black)

    await sidebar.screenshot({
      path: 'tests/screenshots/analysis/06-sidebar-active-nav.png'
    });

    // Test hover on inactive nav
    await dashboardNav.hover();
    await page.waitForTimeout(200);

    const hoverNavStyles = await dashboardNav.evaluate((el) => ({
      background: window.getComputedStyle(el).backgroundColor,
      color: window.getComputedStyle(el).color,
    }));

    console.log('Hover Navigation:', hoverNavStyles);

    await page.screenshot({
      path: 'tests/screenshots/analysis/06-sidebar-hover-nav.png'
    });

    // 5. Logout Button
    const logoutBtn = page.locator('button:has-text("Logout")');
    const logoutStyles = await logoutBtn.evaluate((el) => ({
      fontFamily: window.getComputedStyle(el).fontFamily,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
    }));

    console.log('Logout Button:', logoutStyles);

    await logoutBtn.hover();
    await page.waitForTimeout(200);

    await sidebar.screenshot({
      path: 'tests/screenshots/analysis/06-sidebar-logout-hover.png'
    });
  });
});
