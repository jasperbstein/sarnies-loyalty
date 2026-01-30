-- ============================================================================
-- Migration: Requirements Addendum - Phase 1 Core Features
-- Date: January 2025
-- Description: Implement tier visibility, points expiry, voucher stock, POS API
-- ============================================================================

-- ===========================================================================
-- 1. USERS TABLE MODIFICATIONS
-- ===========================================================================

-- Last activity tracking for points expiration (12 months inactivity rule)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP;

-- Tier level for tier-based voucher visibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_level VARCHAR(20) DEFAULT 'Bronze';

-- Birthday voucher tracking (prevent duplicate grants per year)
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday_voucher_granted_year INTEGER;

-- Notification preferences (granular opt-out)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{
  "points_rewards": true,
  "promotions": true,
  "birthday": true,
  "referrals": true
}'::jsonb;

-- Referral code (unique per user) - for referral program
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- Lifetime points earned (for tier calculation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_points_earned INTEGER DEFAULT 0;

-- Backfill last_activity_date from existing transactions
UPDATE users
SET last_activity_date = COALESCE(
  (SELECT MAX(created_at) FROM transactions WHERE user_id = users.id),
  users.last_visit,
  users.created_at
)
WHERE last_activity_date IS NULL;

-- Backfill lifetime_points_earned from existing transactions
UPDATE users
SET lifetime_points_earned = COALESCE(
  (SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN points_delta ELSE 0 END), 0)
   FROM transactions WHERE user_id = users.id),
  0
)
WHERE lifetime_points_earned = 0 OR lifetime_points_earned IS NULL;

-- Calculate initial tiers based on lifetime points
UPDATE users
SET tier_level = CASE
  WHEN lifetime_points_earned >= 1000 THEN 'Platinum'
  WHEN lifetime_points_earned >= 500 THEN 'Gold'
  WHEN lifetime_points_earned >= 200 THEN 'Silver'
  ELSE 'Bronze'
END
WHERE tier_level IS NULL OR tier_level = 'Bronze';

-- Add tier check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_level_check;
ALTER TABLE users ADD CONSTRAINT users_tier_level_check
  CHECK (tier_level IN ('Bronze', 'Silver', 'Gold', 'Platinum'));

-- Create indexes for expiration and tier lookups
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_users_birthday ON users(birthday);
CREATE INDEX IF NOT EXISTS idx_users_tier_level ON users(tier_level);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;


-- ===========================================================================
-- 2. STAFF USERS TABLE MODIFICATIONS
-- ===========================================================================

-- Phone for OTP-based password reset
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Force password change flag (for admin reset)
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;


-- ===========================================================================
-- 3. VOUCHERS TABLE MODIFICATIONS
-- ===========================================================================

-- Stock management (total_quantity NULL = unlimited)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS total_quantity INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS quantity_redeemed INTEGER DEFAULT 0;

-- Tier restriction (min_tier_level NULL = all tiers)
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_tier_level VARCHAR(20);

-- Add tier check constraint for vouchers
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_min_tier_level_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_min_tier_level_check
  CHECK (min_tier_level IS NULL OR min_tier_level IN ('Bronze', 'Silver', 'Gold', 'Platinum'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_min_tier ON vouchers(min_tier_level) WHERE min_tier_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_stock ON vouchers(total_quantity, quantity_redeemed) WHERE total_quantity IS NOT NULL;


-- ===========================================================================
-- 4. REFERRAL SYSTEM TABLES
-- ===========================================================================

-- Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_referral UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referee_id INTEGER NOT NULL REFERENCES users(id),
  referral_code_id INTEGER NOT NULL REFERENCES referral_codes(id),

  status VARCHAR(20) DEFAULT 'pending',
  -- Values: 'pending', 'completed', 'expired'

  referee_first_purchase_at TIMESTAMP,
  referrer_rewarded_at TIMESTAMP,
  referrer_points_awarded INTEGER,
  referee_voucher_instance_id INTEGER REFERENCES voucher_instances(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_referee UNIQUE(referee_id),
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'completed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status) WHERE status = 'pending';


-- ===========================================================================
-- 5. POS INTEGRATION TABLES
-- ===========================================================================

-- POS API Keys Table
CREATE TABLE IF NOT EXISTS pos_api_keys (
  id SERIAL PRIMARY KEY,
  outlet_id INTEGER, -- No FK - outlets table may not exist yet

  name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  api_key_prefix VARCHAR(12) NOT NULL,
  -- Store first 12 chars for identification: "sk_live_..."

  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  total_transactions INTEGER DEFAULT 0,

  created_by_staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pos_api_keys_active ON pos_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pos_api_keys_prefix ON pos_api_keys(api_key_prefix);

-- POS Transactions Log Table
CREATE TABLE IF NOT EXISTS pos_transactions_log (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES pos_api_keys(id) ON DELETE SET NULL,

  external_transaction_id VARCHAR(100) NOT NULL,
  transaction_time TIMESTAMP NOT NULL,

  customer_identifier VARCHAR(100),
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  amount DECIMAL(12,2) NOT NULL,
  receipt_number VARCHAR(100),
  line_items JSONB,

  points_earned INTEGER,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,

  status VARCHAR(20) DEFAULT 'success',
  -- Values: 'success', 'customer_not_found', 'duplicate', 'error'
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_external_txn UNIQUE(api_key_id, external_transaction_id),
  CONSTRAINT pos_transactions_log_status_check CHECK (status IN ('success', 'customer_not_found', 'duplicate', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_pos_log_external ON pos_transactions_log(external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_log_customer ON pos_transactions_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_log_created ON pos_transactions_log(created_at DESC);


-- ===========================================================================
-- 6. PASSWORD RESET TOKENS TABLE
-- ===========================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,

  token_hash VARCHAR(255) NOT NULL,
  method VARCHAR(20) NOT NULL,
  -- Values: 'email', 'phone'

  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT password_reset_tokens_method_check CHECK (method IN ('email', 'phone'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_valid ON password_reset_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_password_reset_staff ON password_reset_tokens(staff_id);


-- ===========================================================================
-- 7. PUSH NOTIFICATIONS TABLES
-- ===========================================================================

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,

  CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_active ON push_subscriptions(user_id) WHERE is_active = true;

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  notification_type VARCHAR(50) NOT NULL,
  -- Values: 'points_earned', 'voucher_expiring', 'birthday_reward',
  --         'new_announcement', 'referral_reward', 'points_expiring_warning'

  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,

  category VARCHAR(50) NOT NULL,
  -- Values: 'points_rewards', 'promotions', 'birthday', 'referrals'

  status VARCHAR(20) DEFAULT 'pending',
  -- Values: 'pending', 'sent', 'failed', 'skipped'

  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT notification_queue_category_check CHECK (category IN ('points_rewards', 'promotions', 'birthday', 'referrals')),
  CONSTRAINT notification_queue_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);


-- ===========================================================================
-- 8. SETTINGS TABLE ADDITIONS
-- ===========================================================================

-- Insert new system settings (if settings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
    INSERT INTO settings (key, value, type, description, editable) VALUES
      ('birthday_voucher_id', 'null', 'number', 'Voucher ID to grant on birthday month', true),
      ('birthday_points_multiplier', '2', 'number', 'Points multiplier during birthday month', true),
      ('referral_points_reward', '50', 'number', 'Points given to referrer on successful referral', true),
      ('referral_welcome_voucher_id', 'null', 'number', 'Voucher granted to new referee', true),
      ('referral_monthly_cap', '10', 'number', 'Max referrals per user per month', true),
      ('points_expiry_months', '12', 'number', 'Months of inactivity before points expire', true),
      ('points_expiry_warning_months', '11', 'number', 'Months before sending expiry warning', true)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;


-- ===========================================================================
-- 9. ADD TRANSACTION TYPE FOR EXPIRY
-- ===========================================================================

-- Update transactions table to support 'expire' type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('earn', 'redeem', 'grant', 'adjust', 'expire'));


-- ===========================================================================
-- 10. HELPER FUNCTION FOR TIER CALCULATION
-- ===========================================================================

CREATE OR REPLACE FUNCTION get_tier_rank(tier VARCHAR(20))
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE tier
    WHEN 'Bronze' THEN 1
    WHEN 'Silver' THEN 2
    WHEN 'Gold' THEN 3
    WHEN 'Platinum' THEN 4
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ===========================================================================
-- MIGRATION COMPLETE
-- ===========================================================================
-- Run: psql -h localhost -U loyalty_user -d loyalty_db -f 010_requirements_addendum.sql
