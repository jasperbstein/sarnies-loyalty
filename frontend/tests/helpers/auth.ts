import { Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'https://loyalty.sarnies.tech';

/**
 * Login as a customer using OTP flow
 * Note: In demo mode, OTP is auto-filled or shown in toast
 */
export async function loginAsCustomer(page: Page, phone: string = '+66812345678'): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.click('text=Customer');
    await page.waitForTimeout(300);

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="Phone"]');
    await phoneInput.fill(phone);

    const sendOtpButton = page.locator('button:has-text("Send OTP"), button:has-text("Send Code")');
    if (await sendOtpButton.isVisible()) {
      await sendOtpButton.click();
      await page.waitForTimeout(2000);

      const otpInput = page.locator('input[type="text"][maxlength="6"], input[placeholder*="OTP"], input[placeholder*="code"]');
      if (await otpInput.isVisible()) {
        // Try demo OTP
        await otpInput.fill('123456');
        const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Continue"), button:has-text("Login")');
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
          await page.waitForTimeout(3000);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Customer login failed:', error);
    return false;
  }
}

/**
 * Login as staff with email and password
 */
export async function loginAsStaff(
  page: Page,
  email: string = 'staff@sarnies.com',
  password: string = 'Staff123!'
): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.click('text=Staff');
    await page.waitForTimeout(300);

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]');
    await loginButton.click();
    await page.waitForTimeout(5000);

    // Verify we're on staff page
    return page.url().includes('/staff');
  } catch (error) {
    console.error('Staff login failed:', error);
    return false;
  }
}

/**
 * Login as admin with email and password
 */
export async function loginAsAdmin(
  page: Page,
  email: string = 'admin@sarnies.com',
  password: string = 'Admin123!'
): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.click('text=Admin');
    await page.waitForTimeout(300);

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]');
    await loginButton.click();
    await page.waitForURL('**/admin/**', { timeout: 15000 });
    await page.waitForTimeout(1000);

    return page.url().includes('/admin');
  } catch (error) {
    console.error('Admin login failed:', error);
    return false;
  }
}

/**
 * Login as employee with magic link
 * Note: In demo mode, magic link may be shown in toast
 */
export async function loginAsEmployee(
  page: Page,
  email: string = 'employee@sarnies.com'
): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.click('text=Employee');
    await page.waitForTimeout(300);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(email);

    const sendButton = page.locator('button:has-text("Send Magic Link"), button:has-text("Send Link")');
    if (await sendButton.isVisible()) {
      await sendButton.click();
      await page.waitForTimeout(2000);
      // In demo mode, check toast for magic link
      return true;
    }
    return false;
  } catch (error) {
    console.error('Employee login failed:', error);
    return false;
  }
}

/**
 * Logout from any user type
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button:has-text("Log Out"), button:has-text("Logout")');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForTimeout(1000);

    // Confirm if dialog appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Check if user is logged in by checking for auth indicators
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for logout button or user avatar
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out")');
  const avatar = page.locator('[class*="avatar"]');

  return (await logoutButton.isVisible()) || (await avatar.isVisible());
}
