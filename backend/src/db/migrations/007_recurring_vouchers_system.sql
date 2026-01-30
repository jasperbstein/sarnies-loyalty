-- Migration 007: Recurring Vouchers & Benefits System
-- Purpose: Transform voucher system to support free recurring benefits, discounts, and auto-generation
-- Date: 2025-12-01

-- ============================================================================
-- 1. ALTER VOUCHERS TABLE - ADD RECURRING & FREE VOUCHER SUPPORT
-- ============================================================================

ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(50) CHECK (recurrence_type IN ('one_time', 'daily', 'weekly', 'monthly', 'yearly', 'birthday', 'anniversary') OR recurrence_type IS NULL),
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1 CHECK (recurrence_interval >= 1),
ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_scan BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_is_free ON vouchers(is_free) WHERE is_free = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_recurrence_type ON vouchers(recurrence_type) WHERE recurrence_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_auto_generate ON vouchers(auto_generate) WHERE auto_generate = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_is_reusable ON vouchers(is_reusable) WHERE is_reusable = true;

-- Add comments
COMMENT ON COLUMN vouchers.is_free IS 'If true, no points/payment required to redeem';
COMMENT ON COLUMN vouchers.recurrence_type IS 'How often voucher becomes available: one_time, daily, weekly, monthly, yearly, birthday, anniversary';
COMMENT ON COLUMN vouchers.recurrence_interval IS 'Interval for recurrence (e.g., every 2 weeks)';
COMMENT ON COLUMN vouchers.is_reusable IS 'If true, voucher can be used multiple times (e.g., discount vouchers)';
COMMENT ON COLUMN vouchers.auto_generate IS 'If true, system automatically creates instances for eligible users';
COMMENT ON COLUMN vouchers.requires_scan IS 'If false, no QR code needed (just shows discount badge)';
COMMENT ON COLUMN vouchers.discount_percentage IS 'Discount percentage for discount-type vouchers (0-100)';


-- ============================================================================
-- 2. ALTER USERS TABLE - ADD RECURRENCE TRACKING & F&F
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS registration_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS is_friends_family BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS friends_family_discount_percent INTEGER DEFAULT 25 CHECK (friends_family_discount_percent >= 0 AND friends_family_discount_percent <= 100),
ADD COLUMN IF NOT EXISTS last_daily_voucher_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_weekly_voucher_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_monthly_voucher_generated_at TIMESTAMP;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_registration_date ON users(registration_date);
CREATE INDEX IF NOT EXISTS idx_users_is_friends_family ON users(is_friends_family) WHERE is_friends_family = true;

-- Add comments
COMMENT ON COLUMN users.registration_date IS 'Date user registered (for anniversary vouchers)';
COMMENT ON COLUMN users.is_friends_family IS 'If true, user is part of Friends & Family program';
COMMENT ON COLUMN users.friends_family_discount_percent IS 'Discount percentage for F&F members';
COMMENT ON COLUMN users.last_daily_voucher_generated_at IS 'Last time daily voucher was auto-generated for this user';
COMMENT ON COLUMN users.last_weekly_voucher_generated_at IS 'Last time weekly voucher was auto-generated';
COMMENT ON COLUMN users.last_monthly_voucher_generated_at IS 'Last time monthly voucher was auto-generated';


-- ============================================================================
-- 3. ALTER VOUCHER_INSTANCES TABLE - TRACK REUSABLE USAGE
-- ============================================================================

ALTER TABLE voucher_instances
ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0 CHECK (use_count >= 0),
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- Add index
CREATE INDEX IF NOT EXISTS idx_voucher_instances_is_reusable ON voucher_instances(is_reusable) WHERE is_reusable = true;

-- Add comments
COMMENT ON COLUMN voucher_instances.is_reusable IS 'If true, instance can be scanned multiple times';
COMMENT ON COLUMN voucher_instances.use_count IS 'Number of times this reusable voucher has been scanned';
COMMENT ON COLUMN voucher_instances.last_used_at IS 'Last time this reusable voucher was scanned';


-- ============================================================================
-- 4. UPDATE EXISTING DATA WITH SENSIBLE DEFAULTS
-- ============================================================================

-- Set registration_date for existing users (use created_at or member_since)
UPDATE users
SET registration_date = COALESCE(DATE(member_since), DATE(created_at), CURRENT_DATE)
WHERE registration_date IS NULL;

-- Mark existing birthday voucher as recurring (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vouchers' AND column_name = 'is_birthday_voucher'
  ) THEN
    UPDATE vouchers
    SET
      is_free = true,
      recurrence_type = 'birthday',
      auto_generate = true,
      is_reusable = false,
      requires_scan = true
    WHERE is_birthday_voucher = true;
  END IF;
END $$;

-- Mark existing staff vouchers as free if points_required = 0
UPDATE vouchers
SET is_free = true
WHERE (is_staff_voucher = true OR 'employee' = ANY(target_user_types))
  AND points_required = 0;


-- ============================================================================
-- 5. CREATE HELPER FUNCTION - CHECK RECURRING VOUCHER ELIGIBILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION check_recurring_voucher_eligibility(
  p_user_id INTEGER,
  p_voucher_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_recurrence_type VARCHAR(50);
  v_user_birthday VARCHAR(10);
  v_user_registration_date DATE;
  v_last_daily TIMESTAMP;
  v_last_weekly TIMESTAMP;
  v_last_monthly TIMESTAMP;
BEGIN
  -- Get voucher recurrence type
  SELECT recurrence_type INTO v_recurrence_type
  FROM vouchers
  WHERE id = p_voucher_id;

  -- If no recurrence type, always eligible
  IF v_recurrence_type IS NULL OR v_recurrence_type = 'one_time' THEN
    RETURN TRUE;
  END IF;

  -- Get user data
  SELECT birthday, registration_date, last_daily_voucher_generated_at,
         last_weekly_voucher_generated_at, last_monthly_voucher_generated_at
  INTO v_user_birthday, v_user_registration_date, v_last_daily, v_last_weekly, v_last_monthly
  FROM users
  WHERE id = p_user_id;

  -- Check based on recurrence type
  CASE v_recurrence_type
    WHEN 'birthday' THEN
      -- Check if today is user's birthday (month/day match)
      RETURN v_user_birthday IS NOT NULL
        AND EXTRACT(MONTH FROM TO_DATE(v_user_birthday, 'YYYY-MM-DD')) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM TO_DATE(v_user_birthday, 'YYYY-MM-DD')) = EXTRACT(DAY FROM CURRENT_DATE);

    WHEN 'anniversary' THEN
      -- Check if today is user's registration anniversary
      RETURN v_user_registration_date IS NOT NULL
        AND EXTRACT(MONTH FROM v_user_registration_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM v_user_registration_date) = EXTRACT(DAY FROM CURRENT_DATE);

    WHEN 'daily' THEN
      -- Check if last generated was before today
      RETURN v_last_daily IS NULL OR DATE(v_last_daily) < CURRENT_DATE;

    WHEN 'weekly' THEN
      -- Check if last generated was more than 7 days ago
      RETURN v_last_weekly IS NULL OR v_last_weekly < CURRENT_TIMESTAMP - INTERVAL '7 days';

    WHEN 'monthly' THEN
      -- Check if last generated was more than 30 days ago
      RETURN v_last_monthly IS NULL OR v_last_monthly < CURRENT_TIMESTAMP - INTERVAL '30 days';

    ELSE
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_recurring_voucher_eligibility IS 'Check if user is eligible to receive recurring voucher today';


-- ============================================================================
-- 6. CREATE SAMPLE VOUCHERS (FOR TESTING)
-- ============================================================================

-- Employee Daily Drink
INSERT INTO vouchers (
  title, description, points_required, voucher_type,
  is_free, recurrence_type, auto_generate, is_reusable,
  target_user_types, max_redemptions_per_user_per_day,
  expiry_type, expiry_days, is_active
) VALUES (
  'Employee Daily Drink',
  'Free drink for Sarnies employees - auto-renewed daily',
  0, 'free_item',
  true, 'daily', true, false,
  ARRAY['employee']::TEXT[], 1,
  'days_after_redeem', 1, true
) ON CONFLICT DO NOTHING;

-- Employee 50% Discount
INSERT INTO vouchers (
  title, description, points_required, voucher_type,
  is_free, recurrence_type, is_reusable, discount_percentage,
  target_user_types, is_active
) VALUES (
  'Employee Discount (50% Off)',
  'Permanent 50% discount for Sarnies employees - reusable anytime',
  0, 'percentage_discount',
  true, 'one_time', true, 50,
  ARRAY['employee']::TEXT[], true
) ON CONFLICT DO NOTHING;

-- Friends & Family 25% Discount
INSERT INTO vouchers (
  title, description, points_required, voucher_type,
  is_free, recurrence_type, is_reusable, discount_percentage,
  target_user_types, is_active
) VALUES (
  'Friends & Family (25% Off)',
  'Special discount for friends and family of Sarnies team',
  0, 'percentage_discount',
  true, 'one_time', true, 25,
  ARRAY['customer']::TEXT[], true
) ON CONFLICT DO NOTHING;

-- Registration Anniversary
INSERT INTO vouchers (
  title, description, points_required, voucher_type,
  is_free, recurrence_type, auto_generate,
  target_user_types, expiry_type, expiry_days, is_active
) VALUES (
  'Loyalty Anniversary Gift 🎉',
  'Thank you for being with us! Enjoy a free item on your anniversary.',
  0, 'free_item',
  true, 'anniversary', true,
  ARRAY['customer', 'employee']::TEXT[], 'days_after_redeem', 7, true
) ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. VERIFY MIGRATION
-- ============================================================================

SELECT
  'Total vouchers' as metric,
  COUNT(*) as count
FROM vouchers
UNION ALL
SELECT
  'Free vouchers' as metric,
  COUNT(*) as count
FROM vouchers WHERE is_free = true
UNION ALL
SELECT
  'Recurring vouchers' as metric,
  COUNT(*) as count
FROM vouchers WHERE recurrence_type IS NOT NULL
UNION ALL
SELECT
  'Auto-generate vouchers' as metric,
  COUNT(*) as count
FROM vouchers WHERE auto_generate = true
UNION ALL
SELECT
  'Reusable vouchers' as metric,
  COUNT(*) as count
FROM vouchers WHERE is_reusable = true;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
