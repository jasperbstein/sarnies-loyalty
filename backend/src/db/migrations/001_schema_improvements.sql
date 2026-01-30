-- Migration: Schema Improvements for Sarnies Loyalty System
-- Date: 2025-01-20
-- Description: Add missing fields for staff tracking, transaction auditing, user marketing, and performance

-- ============================================================================
-- 1. ADD STAFF BRANCH FIELD (CRITICAL)
-- ============================================================================
-- This allows tracking which outlet each staff member works at

ALTER TABLE staff_users
ADD COLUMN IF NOT EXISTS branch VARCHAR(50) CHECK (branch IN ('Sukhumvit', 'Old Town', 'Roastery'));

-- Set default branch for existing staff (update as needed per actual staff location)
UPDATE staff_users SET branch = 'Sukhumvit' WHERE branch IS NULL;

-- Make branch required for new staff
ALTER TABLE staff_users
ALTER COLUMN branch SET NOT NULL;

-- Add index for branch filtering
CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff_users(branch);

-- ============================================================================
-- 2. ADD TRANSACTION AUDIT FIELDS (CRITICAL)
-- ============================================================================
-- Enables transaction corrections, reversals, and better audit trail

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS reversed_by INTEGER REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT false;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index for receipt lookups
CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON transactions(receipt_number);

-- Add index for reversal tracking
CREATE INDEX IF NOT EXISTS idx_transactions_reversed ON transactions(reversed_by) WHERE reversed_by IS NOT NULL;

-- ============================================================================
-- 3. ADD USER MARKETING & ANALYTICS FIELDS
-- ============================================================================
-- Enables email marketing, GDPR compliance, tier system, and churn analysis

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_outlet VARCHAR(50),
ADD COLUMN IF NOT EXISTS tier_level VARCHAR(20) DEFAULT 'Bronze' CHECK (tier_level IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS lifetime_points_earned INTEGER DEFAULT 0;

-- Add unique constraint for email (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier_level);
CREATE INDEX IF NOT EXISTS idx_users_last_purchase ON users(last_purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_users_preferred_outlet ON users(preferred_outlet);

-- ============================================================================
-- 4. ADD OUTLET VALIDATION TO TRANSACTIONS
-- ============================================================================
-- Ensures only valid outlet names are stored

-- Drop constraint if exists (for re-running migration)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_outlet;

-- Add validation constraint
ALTER TABLE transactions
ADD CONSTRAINT valid_outlet CHECK (
    outlet IN ('Sukhumvit', 'Old Town', 'Roastery') OR outlet IS NULL
);

-- ============================================================================
-- 5. ADD COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Optimizes common query patterns

-- Staff transaction history by outlet
CREATE INDEX IF NOT EXISTS idx_transactions_outlet_created
ON transactions(outlet, created_at DESC) WHERE outlet IS NOT NULL;

-- User transaction history with type filter
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_created
ON transactions(user_id, type, created_at DESC);

-- Active vouchers by type
CREATE INDEX IF NOT EXISTS idx_vouchers_active_type
ON vouchers(is_active, voucher_type) WHERE is_active = true;

-- Active announcements with date range
CREATE INDEX IF NOT EXISTS idx_announcements_active_dates
ON announcements(is_active, start_date, end_date) WHERE is_active = true;

-- Voucher instances by status and expiry
CREATE INDEX IF NOT EXISTS idx_voucher_instances_status_expires
ON voucher_instances(status, expires_at) WHERE status = 'active';

-- ============================================================================
-- 6. ADD VOUCHER INSTANCE TRANSACTION LINKS
-- ============================================================================
-- Creates audit trail from voucher redemption to usage

ALTER TABLE voucher_instances
ADD COLUMN IF NOT EXISTS redemption_transaction_id INTEGER REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS usage_transaction_id INTEGER REFERENCES transactions(id);

-- Add indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_voucher_instances_redemption_tx
ON voucher_instances(redemption_transaction_id);

CREATE INDEX IF NOT EXISTS idx_voucher_instances_usage_tx
ON voucher_instances(usage_transaction_id);

-- ============================================================================
-- 7. ADD OTP CLEANUP MECHANISM
-- ============================================================================
-- Prevents unbounded growth of OTP sessions table

ALTER TABLE otp_sessions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_otp_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_cleanup
ON otp_sessions(expires_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- 8. CREATE ANALYTICS HELPER VIEW
-- ============================================================================
-- Simplifies reporting queries

CREATE OR REPLACE VIEW daily_transaction_summary AS
SELECT
    DATE(created_at) as transaction_date,
    outlet,
    COUNT(*) FILTER (WHERE type = 'earn') as earn_count,
    COUNT(*) FILTER (WHERE type = 'redeem') as redeem_count,
    SUM(amount_value) FILTER (WHERE type = 'earn') as total_revenue,
    SUM(points_delta) FILTER (WHERE type = 'earn') as points_issued,
    SUM(ABS(points_delta)) FILTER (WHERE type = 'redeem') as points_redeemed,
    COUNT(DISTINCT user_id) as unique_customers
FROM transactions
GROUP BY DATE(created_at), outlet;

-- ============================================================================
-- 9. UPDATE SEED DATA WITH NEW FIELDS
-- ============================================================================
-- Ensures existing data has sensible defaults

-- Update existing transactions with default outlet if NULL
UPDATE transactions
SET outlet = 'Sukhumvit'
WHERE outlet IS NULL;

-- Update existing users with default tier based on points
UPDATE users
SET tier_level = CASE
    WHEN points_balance >= 1000 THEN 'Platinum'
    WHEN points_balance >= 500 THEN 'Gold'
    WHEN points_balance >= 200 THEN 'Silver'
    ELSE 'Bronze'
END
WHERE tier_level IS NULL;

-- Set lifetime points earned from current balance (best estimate)
UPDATE users
SET lifetime_points_earned = points_balance +
    (SELECT COALESCE(SUM(ABS(points_delta)), 0)
     FROM transactions
     WHERE transactions.user_id = users.id
     AND type = 'redeem')
WHERE lifetime_points_earned = 0;

-- Set last purchase date from most recent transaction
UPDATE users u
SET last_purchase_date = (
    SELECT MAX(created_at)
    FROM transactions
    WHERE user_id = u.id
    AND type = 'earn'
)
WHERE last_purchase_date IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✅ Added staff.branch for outlet tracking
-- ✅ Added transaction audit fields (updated_at, notes, receipt_number, reversals)
-- ✅ Added user marketing fields (email, consents, tier, analytics)
-- ✅ Added outlet validation constraint
-- ✅ Added composite indexes for performance
-- ✅ Added voucher instance transaction links
-- ✅ Added OTP cleanup mechanism
-- ✅ Created analytics view
-- ✅ Updated existing data with sensible defaults
