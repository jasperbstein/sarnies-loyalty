-- ============================================================================
-- Migration 009: Comprehensive Schema Fixes
-- Created: 2025-01-02
-- Purpose: Add all missing columns referenced in code but not in database
-- ============================================================================

-- ============================================================================
-- 1. VOUCHERS TABLE - Add missing columns
-- ============================================================================

-- Category for voucher organization
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Benefit type and value
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(50)
  CHECK (benefit_type IN ('percentage_discount', 'fixed_discount', 'free_item', 'bonus_points', 'special_access'));
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS benefit_value DECIMAL(10,2);

-- Target user types (separate from allowed_user_types for filtering)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS target_user_types TEXT[];

-- Redemption limits
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_redemptions_per_user INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_redemptions_total INTEGER;

-- Valid date range
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;

-- Redemption window (frequency limit)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redemption_window VARCHAR(50) DEFAULT 'unlimited'
  CHECK (redemption_window IN ('unlimited', 'once_per_day', 'once_per_week', 'once_per_month', 'once_per_shift', 'once_ever'));

-- Minimum purchase requirement
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS requires_minimum_purchase DECIMAL(10,2);

-- Day of week restrictions (array of day names)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_days_of_week TEXT[];

-- Valid outlets (array of outlet IDs as strings)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_outlets TEXT[];

-- Auto expiry hours (for QR codes)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS auto_expire_hours INTEGER;

-- Company exclusivity (may already exist from migration 002)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_company_exclusive BOOLEAN DEFAULT false;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS allowed_company_ids INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN vouchers.category IS 'Voucher category for organization (food, beverage, etc)';
COMMENT ON COLUMN vouchers.benefit_type IS 'Type of benefit: percentage_discount, fixed_discount, free_item, bonus_points, special_access';
COMMENT ON COLUMN vouchers.redemption_window IS 'Frequency limit: unlimited, once_per_day, once_per_week, once_per_month, once_per_shift, once_ever';
COMMENT ON COLUMN vouchers.valid_days_of_week IS 'Array of day names when voucher is valid: sunday, monday, etc';
COMMENT ON COLUMN vouchers.valid_outlets IS 'Array of outlet IDs where voucher is valid';

-- ============================================================================
-- 2. ANNOUNCEMENTS TABLE - Add missing columns
-- ============================================================================

-- Target user types for announcement filtering
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_user_types TEXT[]
  DEFAULT ARRAY['customer', 'employee', 'staff', 'investor', 'media'];

-- Priority for display ordering
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

COMMENT ON COLUMN announcements.target_user_types IS 'User types who should see this announcement';
COMMENT ON COLUMN announcements.priority IS 'Display priority (higher = more prominent)';

-- ============================================================================
-- 3. USERS TABLE - Add missing columns
-- ============================================================================

-- Active status for soft delete
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Last visit tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP;

-- Auto renew for investor group credits
ALTER TABLE users ADD COLUMN IF NOT EXISTS investor_group_credits_auto_renew BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_last_visit ON users(last_visit DESC) WHERE last_visit IS NOT NULL;

COMMENT ON COLUMN users.is_active IS 'Soft delete flag - false means user is disabled';
COMMENT ON COLUMN users.last_visit IS 'Last time user accessed the app';
COMMENT ON COLUMN users.investor_group_credits_auto_renew IS 'If true, group credits auto-renew annually';

-- ============================================================================
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Voucher indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_category ON vouchers(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_valid_dates ON vouchers(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_vouchers_redemption_window ON vouchers(redemption_window);
CREATE INDEX IF NOT EXISTS idx_vouchers_company_exclusive ON vouchers(is_company_exclusive) WHERE is_company_exclusive = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_target_types ON vouchers USING GIN(target_user_types);

-- Announcement indexes
CREATE INDEX IF NOT EXISTS idx_announcements_target_types ON announcements USING GIN(target_user_types);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);

-- ============================================================================
-- 5. SET DEFAULT VALUES FOR EXISTING DATA
-- ============================================================================

-- Set default category for existing vouchers without one
UPDATE vouchers
SET category = 'general'
WHERE category IS NULL;

-- Set is_active = true for all existing users
UPDATE users
SET is_active = true
WHERE is_active IS NULL;

-- Set default target_user_types for existing announcements
UPDATE announcements
SET target_user_types = ARRAY['customer', 'employee', 'staff', 'investor', 'media']
WHERE target_user_types IS NULL;

-- ============================================================================
-- 6. CREATE HELPER FUNCTION FOR REDEMPTION WINDOW CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION get_redemption_window_start(window_type VARCHAR)
RETURNS TIMESTAMP AS $$
BEGIN
  RETURN CASE window_type
    WHEN 'once_per_day' THEN DATE_TRUNC('day', NOW())
    WHEN 'once_per_week' THEN DATE_TRUNC('week', NOW())
    WHEN 'once_per_month' THEN DATE_TRUNC('month', NOW())
    WHEN 'once_per_shift' THEN DATE_TRUNC('day', NOW()) +
      CASE
        WHEN EXTRACT(HOUR FROM NOW()) < 14 THEN INTERVAL '6 hours'
        ELSE INTERVAL '14 hours'
      END
    WHEN 'once_ever' THEN '1970-01-01'::TIMESTAMP
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_redemption_window_start IS 'Get start timestamp for redemption window check';

-- ============================================================================
-- 7. CREATE FUNCTION TO CHECK REDEMPTION WINDOW
-- ============================================================================

CREATE OR REPLACE FUNCTION check_redemption_window(
  p_user_id INTEGER,
  p_voucher_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_window VARCHAR(50);
  v_window_start TIMESTAMP;
  v_count INTEGER;
BEGIN
  -- Get voucher redemption window
  SELECT redemption_window INTO v_window
  FROM vouchers WHERE id = p_voucher_id;

  -- If unlimited, always allow
  IF v_window IS NULL OR v_window = 'unlimited' THEN
    RETURN TRUE;
  END IF;

  -- Get window start time
  v_window_start := get_redemption_window_start(v_window);

  -- Count redemptions in this window
  SELECT COUNT(*) INTO v_count
  FROM voucher_instances
  WHERE voucher_id = p_voucher_id
    AND user_id = p_user_id
    AND status IN ('active', 'used')
    AND created_at >= v_window_start;

  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_redemption_window IS 'Check if user can redeem voucher based on redemption window';

-- ============================================================================
-- 8. CREATE FUNCTION TO CHECK DAY OF WEEK
-- ============================================================================

CREATE OR REPLACE FUNCTION check_voucher_day_of_week(p_voucher_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid_days TEXT[];
  v_today TEXT;
BEGIN
  SELECT valid_days_of_week INTO v_valid_days
  FROM vouchers WHERE id = p_voucher_id;

  -- If no restrictions, allow
  IF v_valid_days IS NULL OR array_length(v_valid_days, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get today's day name (lowercase)
  v_today := LOWER(TO_CHAR(NOW(), 'day'));
  v_today := TRIM(v_today);

  RETURN v_today = ANY(v_valid_days);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_voucher_day_of_week IS 'Check if voucher is valid on current day of week';

-- ============================================================================
-- 9. CREATE FUNCTION TO CHECK OUTLET VALIDITY
-- ============================================================================

CREATE OR REPLACE FUNCTION check_voucher_outlet(
  p_voucher_id INTEGER,
  p_outlet_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_valid_outlets TEXT[];
BEGIN
  SELECT valid_outlets INTO v_valid_outlets
  FROM vouchers WHERE id = p_voucher_id;

  -- If no restrictions, allow
  IF v_valid_outlets IS NULL OR array_length(v_valid_outlets, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN p_outlet_id::TEXT = ANY(v_valid_outlets);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_voucher_outlet IS 'Check if voucher is valid at specified outlet';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed successfully!';
  RAISE NOTICE 'Added missing columns to vouchers, announcements, and users tables.';
  RAISE NOTICE 'Created helper functions for voucher validation.';
END $$;
