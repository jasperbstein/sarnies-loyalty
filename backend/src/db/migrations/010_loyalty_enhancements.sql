-- Migration 010: Loyalty System Enhancements
-- Company types, tier system, partner credits, and referrals

-- ==========================================
-- 1. COMPANIES TABLE: Add company_type
-- ==========================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(20) DEFAULT 'corporate'
  CHECK (company_type IN ('internal', 'partner', 'corporate'));

COMMENT ON COLUMN companies.company_type IS 'internal=Sarnies employees, partner=partner businesses, corporate=B2B clients';

-- Map existing Sarnies companies to internal
UPDATE companies SET company_type = 'internal' WHERE email_domain LIKE '%sarnies%';

-- ==========================================
-- 2. USERS TABLE: Add tier and loyalty fields
-- ==========================================

-- Tier level (already exists in some schemas, add if not)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_level VARCHAR(20) DEFAULT 'Bronze'
  CHECK (tier_level IN ('Bronze', 'Silver', 'Gold'));

-- Yearly spend for tier calculation
ALTER TABLE users ADD COLUMN IF NOT EXISTS yearly_spend DECIMAL(12,2) DEFAULT 0;

-- Tier expiry date (yearly reset)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year');

-- Partner credits balance
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;

-- Referral tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);

-- Create unique index on referral_code (allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- ==========================================
-- 3. UPDATE USER_TYPE CONSTRAINT: Add 'partner'
-- ==========================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('customer', 'employee', 'partner', 'staff', 'investor', 'media'));

-- ==========================================
-- 4. REFERRALS TABLE: Track referral relationships
-- ==========================================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  referrer_reward_beans INTEGER,
  referred_reward_voucher_id INTEGER,
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ==========================================
-- 5. APP_SETTINGS: Campaign & tier configuration
-- ==========================================
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
  ('global_multiplier', '1.0', 'number', 'Campaign multiplier for bean earning (1.0 = normal, 2.0 = double beans)', true),
  ('tier_silver_threshold', '10000', 'number', 'Yearly spend in THB required for Silver tier', true),
  ('tier_gold_threshold', '30000', 'number', 'Yearly spend in THB required for Gold tier', true),
  ('tier_silver_bonus', '0.10', 'number', 'Silver tier bonus multiplier (0.10 = 10% extra beans)', true),
  ('tier_gold_bonus', '0.20', 'number', 'Gold tier bonus multiplier (0.20 = 20% extra beans)', true),
  ('referral_giver_beans', '100', 'number', 'Beans awarded to referrer when friend makes first purchase', true),
  ('referral_receiver_voucher_thb', '100', 'number', 'THB value of welcome voucher for referred user', true),
  ('tier_reset_day', '1', 'number', 'Day of month when yearly tier resets (1-28)', true),
  ('tier_reset_month', '1', 'number', 'Month when yearly tier resets (1=January)', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- 6. CREDIT TRANSACTIONS: Ensure table exists for partner credits
-- ==========================================
CREATE TABLE IF NOT EXISTS partner_credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('grant', 'use', 'expire', 'adjust')),
  balance_after INTEGER NOT NULL,
  description TEXT,
  granted_by_staff_id INTEGER REFERENCES users(id),
  outlet_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_credits_user ON partner_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_credits_type ON partner_credit_transactions(transaction_type);

-- ==========================================
-- 7. HELPER FUNCTION: Generate referral code
-- ==========================================
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. HELPER FUNCTION: Calculate tier based on yearly spend
-- ==========================================
CREATE OR REPLACE FUNCTION calculate_tier(p_yearly_spend DECIMAL) RETURNS VARCHAR(20) AS $$
DECLARE
  v_silver_threshold DECIMAL;
  v_gold_threshold DECIMAL;
BEGIN
  SELECT COALESCE(setting_value::DECIMAL, 10000) INTO v_silver_threshold
  FROM app_settings WHERE setting_key = 'tier_silver_threshold';

  SELECT COALESCE(setting_value::DECIMAL, 30000) INTO v_gold_threshold
  FROM app_settings WHERE setting_key = 'tier_gold_threshold';

  IF p_yearly_spend >= v_gold_threshold THEN
    RETURN 'Gold';
  ELSIF p_yearly_spend >= v_silver_threshold THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. TRIGGER: Auto-update tier on yearly_spend change
-- ==========================================
CREATE OR REPLACE FUNCTION update_user_tier() RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if yearly_spend changed
  IF NEW.yearly_spend IS DISTINCT FROM OLD.yearly_spend THEN
    NEW.tier_level := calculate_tier(NEW.yearly_spend);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_tier ON users;
CREATE TRIGGER trigger_update_user_tier
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tier();

-- ==========================================
-- 10. INITIALIZE: Set tier for existing users based on total_spend
-- ==========================================
UPDATE users
SET
  yearly_spend = COALESCE(total_spend, 0),
  tier_level = calculate_tier(COALESCE(total_spend, 0)),
  tier_expiry_date = CURRENT_DATE + INTERVAL '1 year'
WHERE tier_level IS NULL OR yearly_spend IS NULL;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
