-- Migration 019: Fix vouchers table - add missing columns for voucher creation
-- Adds columns required by the backend vouchers.ts route

-- ==========================================
-- 1. Add missing columns to vouchers table
-- ==========================================

-- Category column
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Benefit columns
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(50) DEFAULT 'free_item';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS benefit_value NUMERIC(10,2);

-- Redemption limits
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_redemptions_per_user INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_redemptions_total INTEGER;

-- Validity period
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;

-- Redemption window (the main fix - must be VARCHAR not INTEGER)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redemption_window VARCHAR(50) DEFAULT 'unlimited';

-- Additional constraints
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS requires_minimum_purchase NUMERIC(10,2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_days_of_week INTEGER[];
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_outlets INTEGER[];
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS auto_expire_hours INTEGER;

-- ==========================================
-- 2. Fix redemption_window if it exists as wrong type
-- ==========================================
-- If the column exists but is INTEGER, convert it to VARCHAR
DO $$
BEGIN
    -- Check if column exists and is integer type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vouchers'
        AND column_name = 'redemption_window'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE vouchers ALTER COLUMN redemption_window TYPE VARCHAR(50)
        USING COALESCE(redemption_window::VARCHAR, 'unlimited');
    END IF;
END $$;

-- ==========================================
-- 3. Set defaults for existing rows
-- ==========================================
UPDATE vouchers SET redemption_window = 'unlimited' WHERE redemption_window IS NULL;
UPDATE vouchers SET benefit_type = 'free_item' WHERE benefit_type IS NULL;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
